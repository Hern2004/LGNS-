
import React, { useState, useEffect, useMemo } from 'react';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, ComposedChart } from 'recharts';
import { fetchCurrentPrice, fetchHistoricalData } from './services/api';
import { PriceData, TokenStats } from './types';
import { DEFAULT_TOKEN_ADDRESS, DEFAULT_PLATFORM_ID, DEFAULT_ANNUAL_YIELD } from './constants';

const App: React.FC = () => {
  const [investment, setInvestment] = useState<number>(1000);
  const [annualYield, setAnnualYield] = useState<number>(DEFAULT_ANNUAL_YIELD);
  const [tokenAddress, setTokenAddress] = useState<string>(DEFAULT_TOKEN_ADDRESS);
  const [startDate, setStartDate] = useState<string>(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  
  const [stats, setStats] = useState<TokenStats | null>(null);
  const [historicalPrices, setHistoricalPrices] = useState<PriceData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const dailyYieldRate = useMemo(() => Math.pow(1 + annualYield / 100, 1 / 365) - 1, [annualYield]);

  const loadData = async () => {
    setRefreshing(true);
    try {
      const [currentStats, history] = await Promise.all([
        fetchCurrentPrice(tokenAddress),
        fetchHistoricalData(DEFAULT_PLATFORM_ID, tokenAddress)
      ]);
      setStats(currentStats);
      setHistoricalPrices(history);
    } catch (err) {
      console.error("Fetch Error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { loadData(); }, [tokenAddress]);

  const results = useMemo(() => {
    if (!historicalPrices.length) return [];
    const startTimestamp = new Date(startDate).setHours(0, 0, 0, 0);
    const relevantPrices = historicalPrices.filter(p => p.timestamp >= startTimestamp);
    if (relevantPrices.length === 0) return [];

    const initialPrice = relevantPrices[0].price;
    const initialTokens = investment / initialPrice;
    
    return relevantPrices.map((point, index) => {
      const currentTokens = initialTokens * Math.pow(1 + dailyYieldRate, index);
      const dateObj = new Date(point.timestamp);
      return {
        date: `${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`,
        fullDate: dateObj.toLocaleDateString('zh-CN'),
        price: point.price,
        tokenBalance: currentTokens,
        usdValue: currentTokens * point.price,
        multiplier: currentTokens / initialTokens
      };
    });
  }, [historicalPrices, investment, startDate, dailyYieldRate]);

  const summary = useMemo(() => {
    if (!results.length) return null;
    const last = results[results.length - 1];
    return {
      totalUsdValue: last.usdValue,
      totalTokens: last.tokenBalance,
      netProfitUsd: last.usdValue - investment,
      totalRoiPercent: ((last.usdValue - investment) / investment) * 100,
      multiplier: last.multiplier,
      dailyEst: last.usdValue * dailyYieldRate
    };
  }, [results, investment, dailyYieldRate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#020617]">
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 border-t-2 border-emerald-500 rounded-full animate-spin"></div>
          <p className="mt-6 text-emerald-500 font-mono text-sm tracking-widest animate-pulse uppercase">Local Node Initializing...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] text-slate-300 p-3 md:p-6 lg:p-10 selection:bg-emerald-500/30">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Top Header */}
        <header className="glass rounded-[2rem] p-6 flex flex-col md:flex-row items-center justify-between gap-4 shadow-2xl border border-white/5">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 bg-gradient-to-br from-emerald-400 to-emerald-700 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <span className="text-slate-950 font-black text-3xl">L</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black text-white tracking-tight">LGNS CALCULATOR</h1>
                <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-400 font-black border border-emerald-500/20">LOCAL v1.1</span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <p className="text-[10px] text-emerald-500/60 font-mono uppercase tracking-widest">Local Mode: No VPN Required</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-8 bg-slate-900/40 p-3 px-6 rounded-2xl border border-white/5">
            <div className="text-center md:text-right">
              <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-0.5">Live Price</p>
              <p className="text-3xl font-mono font-bold text-emerald-400 tracking-tighter">
                ${stats?.currentPrice.toFixed(4) || "---"}
              </p>
            </div>
            <button 
              onClick={loadData}
              className="p-3 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-xl transition-all group border border-emerald-500/20"
            >
              <svg className={`w-5 h-5 text-emerald-400 group-hover:scale-110 transition-transform ${refreshing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Controls */}
          <aside className="lg:col-span-3 space-y-6">
            <div className="glass rounded-[2.5rem] p-7 space-y-7 border border-white/5">
              <h2 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full shadow-[0_0_8px_#10b981]"></span>
                Parameter Tuning
              </h2>

              <div className="space-y-6">
                <div className="space-y-2.5">
                  <label className="text-[10px] text-slate-400 font-black uppercase ml-1 tracking-wider">Initial Capital (USDT)</label>
                  <div className="relative group">
                    <input 
                      type="number" 
                      value={investment} 
                      onChange={(e) => setInvestment(Number(e.target.value))}
                      className="w-full bg-slate-950/50 rounded-2xl px-5 py-4 font-mono text-xl text-white border border-white/10 group-hover:border-emerald-500/30 focus:border-emerald-500 outline-none transition-all shadow-inner"
                    />
                    <span className="absolute right-5 top-5 text-[10px] text-slate-600 font-black">USD</span>
                  </div>
                </div>

                <div className="space-y-2.5">
                  <label className="text-[10px] text-slate-400 font-black uppercase ml-1 tracking-wider">Expected APR (%)</label>
                  <div className="relative group">
                    <input 
                      type="number" 
                      value={annualYield} 
                      onChange={(e) => setAnnualYield(Number(e.target.value))}
                      className="w-full bg-slate-950/50 rounded-2xl px-5 py-4 font-mono text-xl text-emerald-400 border border-white/10 group-hover:border-emerald-500/30 focus:border-emerald-500 outline-none transition-all shadow-inner"
                    />
                    <span className="absolute right-5 top-5 text-[10px] text-emerald-800 font-black">%</span>
                  </div>
                </div>

                <div className="space-y-2.5">
                  <label className="text-[10px] text-slate-400 font-black uppercase ml-1 tracking-wider">History Start Date</label>
                  <input 
                    type="date" 
                    value={startDate} 
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-slate-950/50 rounded-2xl px-5 py-4 font-mono text-sm text-slate-300 border border-white/10 focus:border-emerald-500 outline-none transition-all shadow-inner"
                  />
                </div>
              </div>
            </div>

            <div className="p-7 rounded-[2.5rem] bg-emerald-500/5 border border-emerald-500/10 shadow-inner group">
              <p className="text-[11px] leading-relaxed text-slate-400">
                <strong className="text-emerald-500 font-black block mb-2 tracking-wide uppercase">数学模型原理</strong>
                模拟日复利增长。1000% 年化等于日增 <span className="text-white">~0.66%</span>。模型逻辑：资产 = (投资额 / 初始价) * (1 + 日利)<sup>天数</sup> * 当前价。
              </p>
            </div>
          </aside>

          {/* Visualization */}
          <main className="lg:col-span-9 space-y-6">
            
            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
              {[
                { label: 'Estimated Total', value: `$${summary?.totalUsdValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, color: 'text-white' },
                { label: 'Net Profit', value: `${summary?.netProfitUsd! >= 0 ? '+' : ''}$${summary?.netProfitUsd.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, color: summary?.netProfitUsd! >= 0 ? 'text-emerald-400' : 'text-rose-500' },
                { label: 'Token Multiplier', value: `${summary?.multiplier.toFixed(2)}x`, color: 'text-cyan-400' },
                { label: 'Daily Yield (est)', value: `+$${summary?.dailyEst.toLocaleString(undefined, { maximumFractionDigits: 2 })}`, color: 'text-emerald-500' },
              ].map((item, i) => (
                <div key={i} className="glass rounded-[2rem] p-6 shadow-xl border border-white/5 hover:border-emerald-500/20 transition-colors">
                  <p className="text-[10px] text-slate-500 font-black uppercase mb-1.5 tracking-widest">{item.label}</p>
                  <p className={`text-2xl font-mono font-bold tracking-tighter ${item.color}`}>
                    {item.value}
                  </p>
                </div>
              ))}
            </div>

            {/* Chart Container */}
            <div className="glass rounded-[3rem] p-8 md:p-10 h-[560px] shadow-2xl border border-white/5 relative overflow-hidden">
              <div className="flex items-center justify-between absolute top-10 left-10 right-10 z-10 pointer-events-none">
                <div className="bg-slate-950/20 p-2 px-4 rounded-xl backdrop-blur-sm border border-white/5">
                  <h3 className="text-xs font-black text-white uppercase tracking-[0.2em]">Asset Growth Projection</h3>
                  <p className="text-[9px] text-slate-500 mt-1 font-mono uppercase">Currency: USD Value</p>
                </div>
              </div>
              
              <div className="w-full h-full pt-16">
                {results.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={results}>
                      <defs>
                        <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#10b981" stopOpacity={0.25}/>
                          <stop offset="100%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="1 10" stroke="#1e293b" vertical={false} />
                      <XAxis 
                        dataKey="date" 
                        stroke="#475569" 
                        fontSize={11} 
                        axisLine={false} 
                        tickLine={false} 
                        minTickGap={50}
                        dy={15}
                        fontFamily="monospace"
                      />
                      <YAxis 
                        stroke="#10b981" 
                        fontSize={11} 
                        axisLine={false} 
                        tickLine={false} 
                        tickFormatter={(v) => `$${v > 1000 ? (v/1000).toFixed(0)+'k' : v}`}
                        width={50}
                        fontFamily="monospace"
                      />
                      <Tooltip 
                        cursor={{ stroke: '#10b981', strokeWidth: 1, strokeDasharray: '5 5' }}
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const d = payload[0].payload;
                            return (
                              <div className="bg-slate-950/95 border border-emerald-500/30 p-5 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-md">
                                <p className="text-[10px] text-emerald-500 font-black mb-3 uppercase tracking-widest border-b border-emerald-500/10 pb-2">{d.fullDate}</p>
                                <div className="space-y-2">
                                  <div className="flex justify-between gap-12 items-center">
                                    <span className="text-[10px] text-slate-400 uppercase font-bold">Total USD</span>
                                    <span className="text-sm font-mono font-black text-white">${d.usdValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                  </div>
                                  <div className="flex justify-between gap-12 items-center">
                                    <span className="text-[10px] text-slate-400 uppercase font-bold">Holdings</span>
                                    <span className="text-sm font-mono font-black text-emerald-400">{d.tokenBalance.toFixed(0)} LGNS</span>
                                  </div>
                                  <div className="flex justify-between gap-12 items-center">
                                    <span className="text-[10px] text-slate-400 uppercase font-bold">Multiplier</span>
                                    <span className="text-sm font-mono font-black text-cyan-400">{d.multiplier.toFixed(2)}x</span>
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
                        strokeWidth={4} 
                        fill="url(#areaFill)" 
                        animationDuration={2000}
                        animationEasing="ease-in-out"
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full w-full flex flex-col items-center justify-center">
                    <div className="w-12 h-12 border-b-2 border-slate-700 rounded-full animate-spin mb-6"></div>
                    <p className="text-slate-600 font-black text-xs uppercase tracking-[0.5em] animate-pulse">Syncing Chain Data...</p>
                  </div>
                )}
              </div>
            </div>

            <footer className="text-center pt-2 pb-6">
              <p className="text-[9px] text-slate-600 font-black uppercase tracking-[0.3em] flex items-center justify-center gap-4">
                <span>DEX: OKX AGGREGATOR</span>
                <span className="w-1 h-1 rounded-full bg-slate-800"></span>
                <span>ENGINE: RECHARTS PRO</span>
                <span className="w-1 h-1 rounded-full bg-slate-800"></span>
                <span>STATUS: OPERATIONAL</span>
              </p>
            </footer>

          </main>
        </div>
      </div>
    </div>
  );
};

export default App;
