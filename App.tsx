
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

  // 安全的数值计算
  const safeInvestment = useMemo(() => isNaN(investment) ? 0 : investment, [investment]);
  const safeYield = useMemo(() => isNaN(annualYield) ? 0 : annualYield, [annualYield]);

  // 计算日利率 (日复利模型)
  const dailyYieldRate = useMemo(() => {
    return Math.pow(1 + safeYield / 100, 1 / 365) - 1;
  }, [safeYield]);

  // 核心方法：同步市场数据
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
        setError("无法从 DEX 调取历史数据，请检查代币地址。");
      }
    } catch (err) {
      console.error("Sync Error:", err);
      setError("网络超时，请重试。");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    syncMarketData();
  }, []);

  // 生成投影数据：高度响应用户输入变化
  const results = useMemo(() => {
    if (!historicalPrices.length) return [];
    
    // 解析起始日期，确保跨时区兼容
    const startParts = startDate.split('-').map(Number);
    const startTimestamp = new Date(startParts[0], startParts[1] - 1, startParts[2]).getTime();

    // 过滤价格数据
    let filtered = historicalPrices.filter(p => p.timestamp >= startTimestamp);
    
    // 如果日期太早，自动回滚到有数据的最早日期
    if (filtered.length === 0) {
      filtered = historicalPrices;
    }

    const basePrice = filtered[0]?.price || stats?.currentPrice || 0;
    if (basePrice === 0) return [];

    const initialTokenAmount = safeInvestment / basePrice;
    
    return filtered.map((point, index) => {
      // 复利计算：P * (1 + r)^n
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
  }, [historicalPrices, safeInvestment, startDate, dailyYieldRate, stats]);

  // 计算总结
  const summary = useMemo(() => {
    if (!results.length) return null;
    const lastPoint = results[results.length - 1];
    return {
      totalValue: lastPoint.usdValue,
      profit: lastPoint.usdValue - safeInvestment,
      multiplier: lastPoint.multiplier,
      dailyEst: lastPoint.usdValue * dailyYieldRate
    };
  }, [results, safeInvestment, dailyYieldRate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#020617]">
        <div className="flex flex-col items-center">
          <div className="w-10 h-10 border-2 border-emerald-500/10 border-t-emerald-500 rounded-full animate-spin"></div>
          <p className="mt-4 text-emerald-500/60 font-mono text-[10px] tracking-widest uppercase">Initializing Interface...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] text-slate-300 p-4 md:p-10 selection:bg-emerald-500/30">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <header className="glass rounded-[2.5rem] p-6 flex flex-col md:flex-row items-center justify-between gap-6 border border-white/5 shadow-2xl">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 bg-emerald-500 rounded-3xl flex items-center justify-center shadow-lg shadow-emerald-500/30">
              <span className="text-slate-950 font-black text-3xl">L</span>
            </div>
            <div>
              <h1 className="text-2xl font-black text-white uppercase tracking-tight">LGNS Pro</h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-[10px] text-slate-500 font-mono tracking-widest uppercase">Polygon Mainnet Active</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-950/50 p-4 px-6 rounded-2xl border border-white/5">
            <p className="text-[9px] text-slate-500 uppercase font-black tracking-widest mb-1">Current LGNS/USDT</p>
            <p className="text-3xl font-mono font-bold text-emerald-400">
              ${stats?.currentPrice.toFixed(4) || "0.0000"}
            </p>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* Controls */}
          <aside className="lg:col-span-1 space-y-6">
            <div className="glass rounded-[2.5rem] p-8 space-y-6 border border-white/5 shadow-xl">
              <div className="space-y-5">
                <div className="space-y-2">
                  <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest ml-1">初始投入 (USDT)</label>
                  <input 
                    type="number" 
                    value={investment} 
                    onChange={(e) => setInvestment(parseFloat(e.target.value))}
                    className="w-full bg-slate-900/40 rounded-xl px-4 py-3.5 font-mono text-xl text-white border border-white/5 focus:border-emerald-500/50 outline-none transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest ml-1">预期年化 (APR %)</label>
                  <input 
                    type="number" 
                    value={annualYield} 
                    onChange={(e) => setAnnualYield(parseFloat(e.target.value))}
                    className="w-full bg-slate-900/40 rounded-xl px-4 py-3.5 font-mono text-xl text-emerald-400 border border-white/5 focus:border-emerald-500/50 outline-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest ml-1">投资起始日期</label>
                  <input 
                    type="date" 
                    value={startDate} 
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-slate-900/40 rounded-xl px-4 py-3.5 font-mono text-sm text-slate-300 border border-white/5 focus:border-emerald-500/50 outline-none"
                  />
                </div>

                <button 
                  onClick={syncMarketData}
                  disabled={refreshing}
                  className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-black py-4.5 rounded-2xl transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-3 mt-4"
                >
                  {refreshing ? (
                    <div className="w-5 h-5 border-2 border-slate-950/20 border-t-slate-950 rounded-full animate-spin"></div>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  )}
                  <span className="uppercase tracking-widest text-sm">强制刷新数据</span>
                </button>
              </div>
            </div>

            <div className="p-6 rounded-3xl bg-emerald-500/5 border border-emerald-500/10">
              <p className="text-[10px] leading-relaxed text-slate-500 font-medium">
                <span className="text-emerald-500 font-black block mb-1 uppercase tracking-wider">运算说明</span>
                系统每秒自动重算投影。若 K 线显示异常，请点击上方“强制刷新数据”重新连接 DEX 流动性池。
              </p>
            </div>
          </aside>

          {/* Main Area */}
          <main className="lg:col-span-3 space-y-8">
            
            {/* Quick Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[
                { label: '预估总资产', value: `$${summary?.totalValue.toFixed(2) || '0.00'}`, color: 'text-white' },
                { label: '净利润', value: `${(summary?.profit || 0) >= 0 ? '+' : ''}$${summary?.profit.toFixed(2) || '0.00'}`, color: (summary?.profit || 0) >= 0 ? 'text-emerald-400' : 'text-rose-500' },
                { label: '增长倍数', value: `${summary?.multiplier.toFixed(2) || '1.00'}x`, color: 'text-cyan-400' },
                { label: '日均收益', value: `+$${summary?.dailyEst.toFixed(2) || '0.00'}`, color: 'text-emerald-500' },
              ].map((item, i) => (
                <div key={i} className="glass rounded-3xl p-6 border border-white/5 shadow-lg">
                  <p className="text-[9px] text-slate-500 font-black uppercase mb-2 tracking-widest">{item.label}</p>
                  <p className={`text-2xl font-mono font-bold tracking-tighter ${item.color}`}>
                    {item.value}
                  </p>
                </div>
              ))}
            </div>

            {/* Chart */}
            <div className="glass rounded-[3rem] p-10 h-[600px] border border-white/5 flex flex-col shadow-2xl relative">
              <div className="flex items-center justify-between mb-10">
                <div className="space-y-1">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.3em]">Yield Growth Dynamics</h3>
                  <p className="text-[9px] text-slate-600 font-mono uppercase">Compound Interest Simulation based on DEX historical data</p>
                </div>
                {error && <span className="text-rose-500 text-[10px] font-black uppercase bg-rose-500/10 px-4 py-1.5 rounded-full">{error}</span>}
              </div>
              
              <div className="flex-grow w-full">
                {results.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart 
                      key={`${safeInvestment}-${startDate}-${safeYield}-${refreshing}`}
                      data={results} 
                      margin={{ top: 0, right: 0, left: -20, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="curveFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} opacity={0.3} />
                      <XAxis 
                        dataKey="date" 
                        stroke="#475569" 
                        fontSize={10} 
                        axisLine={false} 
                        tickLine={false} 
                        dy={15}
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
                      />
                      <Tooltip 
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const d = payload[0].payload;
                            return (
                              <div className="bg-slate-900 border border-emerald-500/30 p-5 rounded-2xl shadow-3xl backdrop-blur-xl">
                                <p className="text-[10px] text-emerald-500 font-black mb-3 border-b border-white/5 pb-2 uppercase tracking-widest">{d.fullDate}</p>
                                <div className="space-y-2">
                                  <div className="flex justify-between gap-10">
                                    <span className="text-[10px] text-slate-500 uppercase font-bold">Total Asset</span>
                                    <span className="text-sm font-mono font-black text-white">${d.usdValue.toFixed(2)}</span>
                                  </div>
                                  <div className="flex justify-between gap-10">
                                    <span className="text-[10px] text-slate-500 uppercase font-bold">Token Price</span>
                                    <span className="text-xs font-mono text-slate-400">${d.price.toFixed(4)}</span>
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
                        animationDuration={1200}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center">
                    <div className="w-16 h-16 border-2 border-slate-800 border-t-emerald-500/50 rounded-full animate-spin mb-6"></div>
                    <p className="text-xs font-mono uppercase tracking-[0.4em] text-slate-700">Awaiting Simulation Feed...</p>
                  </div>
                )}
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default App;
