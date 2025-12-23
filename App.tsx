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
      console.error("Node error:", err);
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
      // Create a Date object once to avoid multiple new Date() calls
      const dateObj = new Date(point.timestamp);
      return {
        // Fix: Manually format to MM-dd to avoid invalid toLocaleDateString options
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
          <div className="w-16 h-16 border-b-2 border-emerald-500 rounded-full animate-spin"></div>
          <p className="mt-6 text-emerald-500/80 font-mono text-sm tracking-widest animate-pulse uppercase">Syncing Node...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] text-slate-300 p-3 md:p-8 selection:bg-emerald-500/30">
      <div className="max-w-7xl mx-auto space-y-5">
        
        {/* Top Navigation / Stats Bar */}
        <header className="glass rounded-3xl p-5 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <span className="text-slate-950 font-black text-2xl">L</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">LGNS <span className="text-emerald-500">PRO</span></h1>
              <p className="text-[10px] text-emerald-500/60 font-mono uppercase tracking-widest">OKX Fast-Node Connected</p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="text-center md:text-right">
              <p className="text-[9px] text-slate-500 uppercase font-black">Current Price (DEX)</p>
              <p className="text-2xl font-mono font-bold text-emerald-400 tracking-tighter">
                ${stats?.currentPrice.toFixed(4) || "---"}
              </p>
            </div>
            <button 
              onClick={loadData}
              className="p-3 glass rounded-2xl hover:bg-slate-800 transition-colors group"
              title="Refresh Data"
            >
              <svg className={`w-5 h-5 text-slate-400 group-hover:text-white ${refreshing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </header>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          
          {/* Controls Sidebar */}
          <aside className="lg:col-span-3 space-y-5">
            <div className="glass rounded-[2rem] p-6 space-y-6">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Simulator Config</h2>
              </div>

              <div className="space-y-5">
                <div className="space-y-2">
                  <label className="text-[10px] text-slate-500 font-bold uppercase ml-1">Principal (USDT)</label>
                  <div className="relative">
                    <input 
                      type="number" 
                      value={investment} 
                      onChange={(e) => setInvestment(Number(e.target.value))}
                      className="w-full bg-slate-900/50 rounded-2xl px-4 py-3 font-mono text-lg text-white border border-slate-800 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 outline-none transition-all"
                    />
                    <span className="absolute right-4 top-3.5 text-[10px] text-slate-600 font-bold">USD</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] text-slate-500 font-bold uppercase ml-1">Target APR (%)</label>
                  <div className="relative">
                    <input 
                      type="number" 
                      value={annualYield} 
                      onChange={(e) => setAnnualYield(Number(e.target.value))}
                      className="w-full bg-slate-900/50 rounded-2xl px-4 py-3 font-mono text-lg text-emerald-400 border border-slate-800 focus:border-emerald-500/50 outline-none transition-all"
                    />
                    <span className="absolute right-4 top-3.5 text-[10px] text-emerald-900 font-bold">%</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] text-slate-500 font-bold uppercase ml-1">Start From</label>
                  <input 
                    type="date" 
                    value={startDate} 
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-slate-900/50 rounded-2xl px-4 py-3 font-mono text-sm text-slate-300 border border-slate-800 focus:border-emerald-500/50 outline-none transition-all"
                  />
                </div>
              </div>
            </div>

            <div className="p-6 rounded-[2rem] bg-gradient-to-br from-emerald-500/10 to-transparent border border-emerald-500/10 relative overflow-hidden group">
              <div className="absolute -right-2 -bottom-2 opacity-10 group-hover:opacity-20 transition-opacity">
                <svg className="w-20 h-20" fill="currentColor" viewBox="0 0 24 24"><path d="M13 2.05v2.02c4.39.54 7.5 4.53 6.96 8.92-.46 3.73-3.23 6.5-6.96 6.96v2.02c5.5-.55 9.5-5.31 8.95-10.81-.46-4.63-4.13-8.29-8.76-8.76zM11 2.05c-5.05.5-9.14 4.59-9.64 9.64H11V2.05zM2.31 13c.5 5.05 4.59 9.14 9.64 9.64V13H2.31z"/></svg>
              </div>
              <p className="text-[11px] leading-relaxed text-slate-400 relative z-10">
                <strong className="text-emerald-500 font-black block mb-1">复利模型说明</strong>
                该模型模拟每日收益自动复投。1000% APR 意味着每日增长约 <span className="text-white">0.66%</span>。高复利在长期持有中能极大对冲币价波动的负面影响。
              </p>
            </div>
          </aside>

          {/* Visualization & Stats */}
          <main className="lg:col-span-9 space-y-5">
            
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="glass rounded-[2rem] p-5 shadow-lg glow-emerald">
                <p className="text-[9px] text-slate-500 font-black uppercase mb-1">Total Assets</p>
                <p className="text-xl md:text-2xl font-mono font-bold text-white tracking-tighter">
                  ${summary?.totalUsdValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </p>
              </div>
              <div className="glass rounded-[2rem] p-5 shadow-lg">
                <p className="text-[9px] text-slate-500 font-black uppercase mb-1">Net Profit</p>
                <p className={`text-xl md:text-2xl font-mono font-bold tracking-tighter ${summary?.netProfitUsd! >= 0 ? 'text-emerald-400' : 'text-rose-500'}`}>
                  {summary?.netProfitUsd! >= 0 ? '+' : ''}{summary?.netProfitUsd.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </p>
              </div>
              <div className="glass rounded-[2rem] p-5 shadow-lg">
                <p className="text-[9px] text-slate-500 font-black uppercase mb-1">Token Multiplier</p>
                <div className="flex items-center gap-2">
                  <span className="text-xl md:text-2xl font-mono font-bold text-cyan-400 tracking-tighter">
                    {summary?.multiplier.toFixed(2)}x
                  </span>
                  <span className="text-[9px] text-slate-600 font-black bg-slate-800 px-1.5 py-0.5 rounded">AUTO</span>
                </div>
              </div>
              <div className="glass rounded-[2rem] p-5 shadow-lg">
                <p className="text-[9px] text-slate-500 font-black uppercase mb-1">Daily Earnings</p>
                <p className="text-xl md:text-2xl font-mono font-bold text-emerald-500 tracking-tighter">
                  +${summary?.dailyEst.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </p>
              </div>
            </div>

            {/* Main Chart */}
            <div className="glass rounded-[2.5rem] p-6 md:p-8 h-[500px] shadow-2xl relative">
              <div className="flex items-center justify-between absolute top-8 left-8 right-8 z-10 pointer-events-none">
                <div>
                  <h3 className="text-xs font-black text-white uppercase tracking-widest">Growth Forecast</h3>
                  <p className="text-[10px] text-slate-500 mt-1 font-mono">Performance over selected timeframe</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <span className="text-[9px] text-slate-400 uppercase font-black">USD Value</span>
                  </div>
                </div>
              </div>
              
              <div className="w-full h-full pt-16">
                {results.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={results}>
                      <defs>
                        <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#10b981" stopOpacity={0.15}/>
                          <stop offset="100%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="1 6" stroke="#1e293b" vertical={false} />
                      <XAxis 
                        dataKey="date" 
                        stroke="#475569" 
                        fontSize={10} 
                        axisLine={false} 
                        tickLine={false} 
                        minTickGap={40}
                        dy={10}
                      />
                      <YAxis 
                        stroke="#10b981" 
                        fontSize={10} 
                        axisLine={false} 
                        tickLine={false} 
                        tickFormatter={(v) => `$${v > 1000 ? (v/1000).toFixed(0)+'k' : v}`}
                        width={40}
                      />
                      <Tooltip 
                        cursor={{ stroke: '#10b981', strokeWidth: 1, strokeDasharray: '4 4' }}
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const d = payload[0].payload;
                            return (
                              <div className="glass !bg-slate-950/90 border border-emerald-500/20 p-4 rounded-2xl shadow-2xl">
                                <p className="text-[10px] text-slate-500 font-black mb-2 uppercase">{d.fullDate}</p>
                                <div className="space-y-1">
                                  <div className="flex justify-between gap-8">
                                    <span className="text-[10px] text-slate-400 uppercase">Value:</span>
                                    <span className="text-xs font-mono font-bold text-white">${d.usdValue.toFixed(2)}</span>
                                  </div>
                                  <div className="flex justify-between gap-8">
                                    <span className="text-[10px] text-slate-400 uppercase">Balance:</span>
                                    <span className="text-xs font-mono font-bold text-emerald-400">{d.tokenBalance.toFixed(0)}</span>
                                  </div>
                                  <div className="flex justify-between gap-8">
                                    <span className="text-[10px] text-slate-400 uppercase">Multiplier:</span>
                                    <span className="text-xs font-mono font-bold text-cyan-400">{d.multiplier.toFixed(2)}x</span>
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
                        animationDuration={1500}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full w-full flex flex-col items-center justify-center opacity-50">
                    <div className="w-10 h-10 border-t-2 border-slate-700 rounded-full animate-spin mb-4"></div>
                    <p className="text-slate-600 font-black text-[10px] uppercase tracking-[0.4em]">Optimizing Nodes...</p>
                  </div>
                )}
              </div>
            </div>

            {/* Footer / Disclaimer */}
            <footer className="text-center py-4">
              <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">
                Data provided by OKX DEX Aggregator • Charts via Recharts v3
              </p>
            </footer>

          </main>
        </div>
      </div>
    </div>
  );
};

export default App;