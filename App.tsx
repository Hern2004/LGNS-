
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
  const [investment, setInvestment] = useState<number>(1000);
  const [annualYield, setAnnualYield] = useState<number>(DEFAULT_ANNUAL_YIELD);
  const [tokenAddress] = useState<string>(DEFAULT_TOKEN_ADDRESS);
  const [startDate, setStartDate] = useState<string>(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  
  const [stats, setStats] = useState<TokenStats | null>(null);
  const [historicalPrices, setHistoricalPrices] = useState<PriceData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // 计算日利率 (复利)
  const dailyYieldRate = useMemo(() => Math.pow(1 + annualYield / 100, 1 / 365) - 1, [annualYield]);

  const loadData = async () => {
    setRefreshing(true);
    setError(null);
    try {
      const [currentStats, history] = await Promise.all([
        fetchCurrentPrice(tokenAddress),
        fetchHistoricalData(DEFAULT_PLATFORM_ID, tokenAddress)
      ]);
      
      setStats(currentStats);
      setHistoricalPrices(history);
      
      if (history.length === 0) {
        setError("未发现历史价格数据，可能是该代币池未被 GeckoTerminal 索引。");
      }
    } catch (err) {
      console.error("Load Error:", err);
      setError("网络请求失败，请检查连接。");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // 初始加载一次
  useEffect(() => { loadData(); }, []);

  const results = useMemo(() => {
    if (!historicalPrices.length) return [];
    
    const startTimestamp = new Date(startDate).getTime();
    let filtered = historicalPrices.filter(p => p.timestamp >= startTimestamp);
    
    // 如果过滤后没数据，回退到显示所有
    if (filtered.length === 0) {
      filtered = historicalPrices;
    }

    const initialPrice = filtered[0]?.price || stats?.currentPrice || 0;
    if (initialPrice === 0) return [];

    const initialTokens = investment / initialPrice;
    
    return filtered.map((point, index) => {
      const currentTokens = initialTokens * Math.pow(1 + dailyYieldRate, index);
      const dateObj = new Date(point.timestamp);
      return {
        date: `${dateObj.getMonth() + 1}/${dateObj.getDate()}`,
        fullDate: dateObj.toLocaleDateString('zh-CN'),
        price: point.price,
        usdValue: currentTokens * point.price,
        multiplier: currentTokens / initialTokens
      };
    });
  }, [historicalPrices, investment, startDate, dailyYieldRate, stats]);

  const summary = useMemo(() => {
    if (!results.length) return null;
    const last = results[results.length - 1];
    return {
      totalUsdValue: last.usdValue,
      netProfitUsd: last.usdValue - investment,
      multiplier: last.multiplier,
      dailyEst: last.usdValue * dailyYieldRate
    };
  }, [results, investment, dailyYieldRate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#020617]">
        <div className="flex flex-col items-center">
          <div className="w-10 h-10 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
          <p className="mt-4 text-emerald-500 font-mono text-[10px] tracking-widest uppercase">Syncing Price Data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] text-slate-300 p-4 md:p-8 selection:bg-emerald-500/30">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <header className="glass rounded-3xl p-6 flex flex-col md:flex-row items-center justify-between gap-4 border border-white/5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <span className="text-slate-950 font-black text-2xl">L</span>
            </div>
            <div>
              <h1 className="text-xl font-black text-white uppercase tracking-tight">LGNS Calculator</h1>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">Live: Polygon POS</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-8">
            <div className="text-right">
              <p className="text-[9px] text-slate-500 uppercase font-black tracking-widest">Price (USD)</p>
              <p className="text-2xl font-mono font-bold text-emerald-400">
                ${stats?.currentPrice.toFixed(4) || "---"}
              </p>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          
          {/* Controls Sidebar */}
          <aside className="lg:col-span-1 space-y-6">
            <div className="glass rounded-[2rem] p-6 space-y-6 border border-white/5">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] text-slate-500 font-black uppercase tracking-wider ml-1">初始投入 (USDT)</label>
                  <input 
                    type="number" 
                    value={investment} 
                    onChange={(e) => setInvestment(Number(e.target.value))}
                    className="w-full bg-slate-950/50 rounded-xl px-4 py-3 font-mono text-lg text-white border border-white/10 focus:border-emerald-500 outline-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] text-slate-500 font-black uppercase tracking-wider ml-1">设定年化 (APR %)</label>
                  <input 
                    type="number" 
                    value={annualYield} 
                    onChange={(e) => setAnnualYield(Number(e.target.value))}
                    className="w-full bg-slate-950/50 rounded-xl px-4 py-3 font-mono text-lg text-emerald-400 border border-white/10 focus:border-emerald-500 outline-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] text-slate-500 font-black uppercase tracking-wider ml-1">投资开始日期</label>
                  <input 
                    type="date" 
                    value={startDate} 
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-slate-950/50 rounded-xl px-4 py-3 font-mono text-sm text-slate-300 border border-white/10 focus:border-emerald-500 outline-none"
                  />
                </div>

                {/* 生成按钮 */}
                <button 
                  onClick={loadData}
                  disabled={refreshing}
                  className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-black py-4 rounded-xl transition-all shadow-lg shadow-emerald-500/20 active:scale-[0.98] flex items-center justify-center gap-2 mt-2"
                >
                  {refreshing ? (
                    <div className="w-5 h-5 border-2 border-slate-950/20 border-t-slate-950 rounded-full animate-spin"></div>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  )}
                  <span>生成收益 K 线</span>
                </button>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-emerald-500/5 border border-emerald-500/10">
              <p className="text-[10px] leading-relaxed text-slate-500">
                <span className="text-emerald-500 font-black block mb-1 uppercase">智能收益引擎</span>
                系统通过实时获取 LGNS 池子历史成交价，结合每日复利模型计算。修改参数后请点击下方“生成”按钮刷新视图。
              </p>
            </div>
          </aside>

          {/* Main Content Area */}
          <main className="lg:col-span-3 space-y-6">
            
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: '预估资产总值', value: `$${summary?.totalUsdValue.toFixed(2) || '0.00'}`, color: 'text-white' },
                { label: '净利润', value: `$${summary?.netProfitUsd.toFixed(2) || '0.00'}`, color: (summary?.netProfitUsd || 0) >= 0 ? 'text-emerald-400' : 'text-rose-500' },
                { label: '持币增值倍数', value: `${summary?.multiplier.toFixed(2) || '1.00'}x`, color: 'text-cyan-400' },
                { label: '当前预估日收益', value: `$${summary?.dailyEst.toFixed(2) || '0.00'}`, color: 'text-emerald-500' },
              ].map((item, i) => (
                <div key={i} className="glass rounded-2xl p-5 border border-white/5 hover:border-emerald-500/10 transition-colors">
                  <p className="text-[9px] text-slate-500 font-black uppercase mb-1 tracking-widest">{item.label}</p>
                  <p className={`text-xl font-mono font-bold tracking-tighter ${item.color}`}>
                    {item.value}
                  </p>
                </div>
              ))}
            </div>

            {/* Chart Container */}
            <div className="glass rounded-[2.5rem] p-8 h-[550px] border border-white/5 flex flex-col overflow-hidden">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">收益增长 K 线曲线</h3>
                {error && <span className="text-rose-400 text-[10px] font-black uppercase bg-rose-400/10 px-3 py-1 rounded-full">{error}</span>}
              </div>
              
              <div className="flex-grow w-full relative">
                {results.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={results} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                      <XAxis 
                        dataKey="date" 
                        stroke="#475569" 
                        fontSize={10} 
                        axisLine={false} 
                        tickLine={false} 
                        dy={10}
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
                              <div className="bg-slate-900/90 border border-emerald-500/30 p-4 rounded-xl shadow-2xl backdrop-blur-md">
                                <p className="text-[10px] text-emerald-500 font-black mb-2">{d.fullDate}</p>
                                <div className="space-y-1">
                                  <p className="text-sm font-mono font-bold text-white">资产: ${d.usdValue.toFixed(2)}</p>
                                  <p className="text-[10px] text-slate-400">币价: ${d.price.toFixed(4)}</p>
                                  <p className="text-[10px] text-cyan-500 font-bold">增长: {d.multiplier.toFixed(2)}x</p>
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
                        strokeWidth={2} 
                        fill="url(#chartFill)" 
                        isAnimationActive={true}
                        animationDuration={1500}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center opacity-40">
                    <div className="w-12 h-12 border-2 border-slate-700 border-t-emerald-500/50 rounded-full animate-spin mb-4"></div>
                    <p className="text-xs font-mono uppercase tracking-[0.3em]">等待数据生成...</p>
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
