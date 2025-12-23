
import React, { useState, useEffect, useMemo } from 'react';
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  AreaChart, 
  Area 
} from 'recharts';
import { fetchCurrentPrice, fetchHistoricalData } from './services/api';
import { PriceData, TokenStats } from './types';
import { DEFAULT_TOKEN_ADDRESS, DEFAULT_PLATFORM_ID, DEFAULT_ANNUAL_YIELD } from './constants';

const App: React.FC = () => {
  // UI 交互状态
  const [investment, setInvestment] = useState<number>(1000);
  const [annualYield, setAnnualYield] = useState<number>(DEFAULT_ANNUAL_YIELD);
  const [startDate, setStartDate] = useState<string>(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  
  // API 数据状态
  const [stats, setStats] = useState<TokenStats | null>(null);
  const [historicalPrices, setHistoricalPrices] = useState<PriceData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // 计算日利率 (日复利模型)
  const dailyYieldRate = useMemo(() => {
    return Math.pow(1 + annualYield / 100, 1 / 365) - 1;
  }, [annualYield]);

  // 获取数据的核心方法
  const syncMarketData = async () => {
    setRefreshing(true);
    setError(null);
    try {
      const [currentStats, history] = await Promise.all([
        fetchCurrentPrice(DEFAULT_TOKEN_ADDRESS),
        fetchHistoricalData(DEFAULT_PLATFORM_ID, DEFAULT_TOKEN_ADDRESS)
      ]);
      
      setStats(currentStats);
      setHistoricalPrices(history);
      
      if (history.length === 0) {
        setError("无法从 DEX 调取历史 K 线。请确认代币流动性正常。");
      }
    } catch (err) {
      console.error("Sync Error:", err);
      setError("API 响应异常，请点击下方按钮重试。");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // 初始进入页面自动加载
  useEffect(() => {
    syncMarketData();
  }, []);

  // 生成图表数据 - 确保高度响应
  const results = useMemo(() => {
    if (!historicalPrices.length) return [];
    
    // 解析用户选定的开始时间（设置为当天 0 点）
    const startPoint = new Date(startDate);
    startPoint.setHours(0, 0, 0, 0);
    const startTimestamp = startPoint.getTime();

    // 过滤价格数据
    let filtered = historicalPrices.filter(p => p.timestamp >= startTimestamp);
    
    // 鲁棒性修复：如果选定日期超出了 API 提供的 180 天范围，则使用最早的一天作为起点
    if (filtered.length === 0) {
      filtered = historicalPrices;
    }

    const basePrice = filtered[0]?.price || stats?.currentPrice || 0;
    if (basePrice === 0) return [];

    const initialTokenAmount = investment / basePrice;
    
    // 按时间顺序计算复利增值
    return filtered.map((point, index) => {
      // 复利后的币数 = 初始币数 * (1 + 日利率)^天数
      const compoundedTokens = initialTokenAmount * Math.pow(1 + dailyYieldRate, index);
      const dateObj = new Date(point.timestamp);
      
      return {
        date: `${dateObj.getMonth() + 1}/${dateObj.getDate()}`,
        fullDate: dateObj.toLocaleDateString('zh-CN'),
        price: point.price,
        usdValue: compoundedTokens * point.price,
        multiplier: compoundedTokens / initialTokenAmount
      };
    });
  }, [historicalPrices, investment, startDate, dailyYieldRate, stats]);

  // 数据总览计算
  const summary = useMemo(() => {
    if (!results.length) return null;
    const lastPoint = results[results.length - 1];
    return {
      totalValue: lastPoint.usdValue,
      profit: lastPoint.usdValue - investment,
      multiplier: lastPoint.multiplier,
      dailyEst: lastPoint.usdValue * dailyYieldRate
    };
  }, [results, investment, dailyYieldRate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#020617]">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-emerald-500/10 border-t-emerald-500 rounded-full animate-spin"></div>
          <p className="mt-4 text-emerald-500 font-mono text-xs tracking-widest uppercase">Initializing Pro Engine...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] text-slate-300 p-4 md:p-10 selection:bg-emerald-500/30">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Top Navigation */}
        <header className="glass rounded-[2rem] p-6 flex flex-col md:flex-row items-center justify-between gap-6 border border-white/5 shadow-2xl">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <span className="text-slate-950 font-black text-3xl">L</span>
            </div>
            <div>
              <h1 className="text-2xl font-black text-white uppercase tracking-tight">LGNS Calculator Pro</h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-[10px] text-slate-500 font-mono uppercase tracking-[0.2em]">Real-time Market Sync</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-900/50 p-4 rounded-2xl border border-white/5 flex items-center gap-6">
            <div className="text-right">
              <p className="text-[9px] text-slate-500 uppercase font-black tracking-widest mb-1">Live Market Price</p>
              <p className="text-3xl font-mono font-bold text-emerald-400">
                ${stats?.currentPrice.toFixed(4) || "0.0000"}
              </p>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* Controls Sidebar */}
          <aside className="lg:col-span-1 space-y-6">
            <div className="glass rounded-[2.5rem] p-7 space-y-7 border border-white/5 shadow-xl">
              <div className="space-y-6">
                <div className="space-y-2.5">
                  <label className="text-[11px] text-slate-500 font-black uppercase tracking-widest ml-1">初始投入 (USDT)</label>
                  <input 
                    type="number" 
                    value={investment} 
                    onChange={(e) => setInvestment(Number(e.target.value))}
                    className="w-full bg-slate-950/50 rounded-2xl px-5 py-4 font-mono text-xl text-white border border-white/10 focus:border-emerald-500 outline-none transition-all shadow-inner"
                  />
                </div>

                <div className="space-y-2.5">
                  <label className="text-[11px] text-slate-500 font-black uppercase tracking-widest ml-1">币本位年化 (APR %)</label>
                  <input 
                    type="number" 
                    value={annualYield} 
                    onChange={(e) => setAnnualYield(Number(e.target.value))}
                    className="w-full bg-slate-950/50 rounded-2xl px-5 py-4 font-mono text-xl text-emerald-400 border border-white/10 focus:border-emerald-500 outline-none transition-all shadow-inner"
                  />
                </div>

                <div className="space-y-2.5">
                  <label className="text-[11px] text-slate-500 font-black uppercase tracking-widest ml-1">起始统计日期</label>
                  <input 
                    type="date" 
                    value={startDate} 
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-slate-950/50 rounded-2xl px-5 py-4 font-mono text-sm text-slate-300 border border-white/10 focus:border-emerald-500 outline-none transition-all shadow-inner"
                  />
                </div>

                <button 
                  onClick={syncMarketData}
                  disabled={refreshing}
                  className="w-full bg-emerald-500 hover:bg-emerald-400 active:scale-[0.97] disabled:opacity-50 text-slate-950 font-black py-5 rounded-2xl transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-3 mt-4"
                >
                  {refreshing ? (
                    <div className="w-5 h-5 border-2 border-slate-950/20 border-t-slate-950 rounded-full animate-spin"></div>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  )}
                  <span className="uppercase tracking-widest text-sm">强制同步 K 线</span>
                </button>
              </div>
            </div>

            <div className="p-6 rounded-3xl bg-emerald-500/5 border border-emerald-500/10 backdrop-blur-sm">
              <h4 className="text-[10px] text-emerald-500 font-black uppercase mb-2 tracking-[0.2em]">智能引擎运行中</h4>
              <p className="text-[10px] leading-relaxed text-slate-500 font-medium">
                修改上方参数后，收益 K 线会自动计算并即时重绘。点击“强制同步”将更新最新的 DEX 市场成交价格。
              </p>
            </div>
          </aside>

          {/* Main Content Area */}
          <main className="lg:col-span-3 space-y-8">
            
            {/* Summary Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[
                { label: '预估资产价值', value: `$${summary?.totalValue.toFixed(2) || '0.00'}`, color: 'text-white' },
                { label: '累计利润', value: `${(summary?.profit || 0) >= 0 ? '+' : ''}$${summary?.profit.toFixed(2) || '0.00'}`, color: (summary?.profit || 0) >= 0 ? 'text-emerald-400' : 'text-rose-500' },
                { label: '持币增值倍数', value: `${summary?.multiplier.toFixed(2) || '1.00'}x`, color: 'text-cyan-400' },
                { label: '当前预估日收益', value: `+$${summary?.dailyEst.toFixed(2) || '0.00'}`, color: 'text-emerald-500' },
              ].map((item, i) => (
                <div key={i} className="glass rounded-3xl p-6 border border-white/5 hover:border-emerald-500/10 transition-all shadow-lg">
                  <p className="text-[9px] text-slate-500 font-black uppercase mb-1.5 tracking-[0.2em]">{item.label}</p>
                  <p className={`text-2xl font-mono font-bold tracking-tighter ${item.color}`}>
                    {item.value}
                  </p>
                </div>
              ))}
            </div>

            {/* Chart Area */}
            <div className="glass rounded-[3rem] p-10 h-[580px] border border-white/5 flex flex-col shadow-2xl relative">
              <div className="flex items-center justify-between mb-8">
                <div className="space-y-1">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.3em]">收益复合增长动态投影曲线</h3>
                  <p className="text-[9px] text-slate-600 font-mono uppercase">Data Source: GeckoTerminal OHLCV Feed</p>
                </div>
                {error && <span className="text-rose-400 text-[10px] font-black uppercase bg-rose-400/10 px-4 py-1.5 rounded-full animate-pulse">{error}</span>}
              </div>
              
              <div className="flex-grow w-full relative">
                {results.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart 
                      key={`${investment}-${startDate}-${annualYield}-${refreshing}`} // 强制参数变化时重绘以确保动画流畅
                      data={results} 
                      margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="curveFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} opacity={0.5} />
                      <XAxis 
                        dataKey="date" 
                        stroke="#475569" 
                        fontSize={10} 
                        axisLine={false} 
                        tickLine={false} 
                        dy={12}
                        minTickGap={40}
                        fontFamily="monospace"
                      />
                      <YAxis 
                        stroke="#475569" 
                        fontSize={10} 
                        axisLine={false} 
                        tickLine={false} 
                        domain={['auto', 'auto']} 
                        tickFormatter={(v) => `$${v.toFixed(0)}`}
                        fontFamily="monospace"
                        width={40}
                      />
                      <Tooltip 
                        cursor={{ stroke: '#10b981', strokeWidth: 1.5, strokeDasharray: '4 4' }}
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const d = payload[0].payload;
                            return (
                              <div className="bg-slate-900/95 border border-emerald-500/40 p-5 rounded-2xl shadow-2xl backdrop-blur-xl">
                                <p className="text-[10px] text-emerald-500 font-black mb-3 uppercase tracking-widest border-b border-white/5 pb-2">{d.fullDate}</p>
                                <div className="space-y-2">
                                  <div className="flex justify-between gap-8 items-center">
                                    <span className="text-[10px] text-slate-500 uppercase font-bold">资产净值</span>
                                    <span className="text-sm font-mono font-black text-white">${d.usdValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                  </div>
                                  <div className="flex justify-between gap-8 items-center">
                                    <span className="text-[10px] text-slate-500 uppercase font-bold">市场币价</span>
                                    <span className="text-xs font-mono text-slate-300">${d.price.toFixed(4)}</span>
                                  </div>
                                  <div className="flex justify-between gap-8 items-center">
                                    <span className="text-[10px] text-slate-500 uppercase font-bold">增长系数</span>
                                    <span className="text-xs font-mono text-cyan-400 font-bold">{d.multiplier.toFixed(2)}x</span>
                                  </div>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="usdValue" 
                        stroke="#10b981" 
                        strokeWidth={3} 
                        fill="url(#curveFill)" 
                        isAnimationActive={true}
                        animationDuration={1000}
                        animationEasing="ease-in-out"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center">
                    <div className="w-16 h-16 border-2 border-slate-800 border-t-emerald-500/40 rounded-full animate-spin mb-6"></div>
                    <p className="text-xs font-mono uppercase tracking-[0.4em] text-slate-600 animate-pulse">Computing Yield Vectors...</p>
                  </div>
                )}
              </div>
            </div>

            <footer className="text-center py-4">
              <p className="text-[8px] text-slate-700 font-black uppercase tracking-[0.5em]">
                Polygon Mainnet · LGNS/USDT Pool · 2025 Financial Modeling Tool
              </p>
            </footer>
          </main>
        </div>
      </div>
    </div>
  );
};

export default App;
