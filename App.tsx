
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
      
      if (history.length === 0) {
        setError("暂无历史 K 线数据，可能该币种在该链上的流动性池尚未被完全索引。");
      } else {
        setError(null);
      }
    } catch (err) {
      console.error("App Data Load Error:", err);
      setError("网络请求异常，请检查网络后重试。");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { loadData(); }, [tokenAddress]);

  const results = useMemo(() => {
    if (!historicalPrices.length) return [];
    
    const startTimestamp = new Date(startDate).getTime();
    let relevantPrices = historicalPrices.filter(p => p.timestamp >= startTimestamp);
    
    if (relevantPrices.length === 0) {
      relevantPrices = historicalPrices.slice(-30); // 兜底显示最后30天
    }

    const initialPrice = relevantPrices[0]?.price || stats?.currentPrice || 0;
    if (initialPrice === 0) return [];

    const initialTokens = investment / initialPrice;
    
    return relevantPrices.map((point, index) => {
      const currentTokens = initialTokens * Math.pow(1 + dailyYieldRate, index);
      const dateObj = new Date(point.timestamp);
      return {
        date: `${dateObj.getMonth() + 1}/${dateObj.getDate()}`,
        fullDate: dateObj.toLocaleDateString('zh-CN'),
        price: point.price,
        tokenBalance: currentTokens,
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
          <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
          <p className="mt-4 text-emerald-500 font-mono text-xs tracking-widest uppercase">Initializing Core Engine...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] text-slate-300 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <header className="glass rounded-3xl p-6 flex flex-col md:flex-row items-center justify-between gap-4 border border-white/5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <span className="text-slate-950 font-black text-2xl">L</span>
            </div>
            <div>
              <h1 className="text-xl font-black text-white uppercase tracking-tight">LGNS Calculator</h1>
              <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Status: Operational
              </p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="text-right">
              <p className="text-[9px] text-slate-500 uppercase font-black tracking-tighter">Current Price</p>
              <p className="text-2xl font-mono font-bold text-emerald-400">
                ${stats?.currentPrice.toFixed(4) || "0.0000"}
              </p>
            </div>
            <button 
              onClick={loadData}
              disabled={refreshing}
              className="p-3 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-xl transition-all border border-emerald-500/20"
            >
              <svg className={`w-5 h-5 text-emerald-400 ${refreshing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          
          {/* Sidebar Controls */}
          <aside className="lg:col-span-1 space-y-6">
            <div className="glass rounded-[2rem] p-6 space-y-6 border border-white/5">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] text-slate-500 font-black uppercase tracking-wider ml-1">Initial Investment</label>
                  <div className="relative">
                    <input 
                      type="number" 
                      value={investment} 
                      onChange={(e) => setInvestment(Number(e.target.value))}
                      className="w-full bg-slate-900/50 rounded-xl px-4 py-3 font-mono text-lg text-white border border-white/10 focus:border-emerald-500 outline-none transition-all"
                    />
                    <span className="absolute right-4 top-3.5 text-[10px] text-slate-600 font-black">USD</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] text-slate-500 font-black uppercase tracking-wider ml-1">Annual Yield (APR %)</label>
                  <div className="relative">
                    <input 
                      type="number" 
                      value={annualYield} 
                      onChange={(e) => setAnnualYield(Number(e.target.value))}
                      className="w-full bg-slate-900/50 rounded-xl px-4 py-3 font-mono text-lg text-emerald-400 border border-white/10 focus:border-emerald-500 outline-none transition-all"
                    />
                    <span className="absolute right-4 top-3.5 text-[10px] text-emerald-800 font-black">%</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] text-slate-500 font-black uppercase tracking-wider ml-1">Start Date</label>
                  <input 
                    type="date" 
                    value={startDate} 
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-slate-900/50 rounded-xl px-4 py-3 font-mono text-sm text-slate-300 border border-white/10 focus:border-emerald-500 outline-none transition-all"
                  />
                </div>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-emerald-500/5 border border-emerald-500/10">
              <p className="text-[10px] leading-relaxed text-slate-400 font-medium">
                <span className="text-emerald-500 font-black block mb-1">PRO TIP</span>
                This calculator uses daily compound interest modeling. Historical price data is pulled from liquidity pools on Polygon POS.
              </p>
            </div>
          </aside>

          {/* Main Content */}
          <main className="lg:col-span-3 space-y-6">
            
            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Estimated Balance', value: `$${summary?.totalUsdValue.toFixed(2) || '0.00'}`, color: 'text-white' },
                { label: 'Net Profit', value: `${(summary?.netProfitUsd || 0) >= 0 ? '+' : ''}$${summary?.netProfitUsd.toFixed(2) || '0.00'}`, color: (summary?.netProfitUsd || 0) >= 0 ? 'text-emerald-400' : 'text-rose-500' },
                { label: 'Growth Multiplier', value: `${summary?.multiplier.toFixed(2) || '1.00'}x`, color: 'text-cyan-400' },
                { label: 'Daily Estimate', value: `+$${summary?.dailyEst.toFixed(2) || '0.00'}`, color: 'text-emerald-500' },
              ].map((item, i) => (
                <div key={i} className="glass rounded-2xl p-5 border border-white/5">
                  <p className="text-[9px] text-slate-500 font-black uppercase mb-1 tracking-widest">{item.label}</p>
                  <p className={`text-xl font-mono font-bold tracking-tighter ${item.color}`}>
                    {item.value}
                  </p>
                </div>
              ))}
            </div>

            {/* Chart Area */}
            <div className="glass rounded-[2.5rem] p-8 h-[500px] border border-white/5 flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Growth Projection Curve</h3>
                {error && <span className="text-rose-400 text-[9px] font-black uppercase bg-rose-400/10 px-3 py-1 rounded-full">{error}</span>}
              </div>
              
              <div className="flex-grow">
                {results.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={results}>
                      <defs>
                        <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                      <XAxis dataKey="date" stroke="#475569" fontSize={9} axisLine={false} tickLine={false} />
                      <YAxis stroke="#475569" fontSize={9} axisLine={false} tickLine={false} domain={['auto', 'auto']} tickFormatter={(v) => `$${v}`} />
                      <Tooltip 
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const d = payload[0].payload;
                            return (
                              <div className="bg-slate-900 border border-emerald-500/30 p-4 rounded-xl shadow-2xl">
                                <p className="text-[10px] text-emerald-500 font-bold mb-2">{d.fullDate}</p>
                                <div className="space-y-1">
                                  <p className="text-sm font-mono font-bold text-white">Value: ${d.usdValue.toFixed(2)}</p>
                                  <p className="text-[10px] text-slate-400">Price: ${d.price.toFixed(4)}</p>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Area type="monotone" dataKey="usdValue" stroke="#10b981" strokeWidth={2} fill="url(#chartFill)" animationDuration={1000} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center opacity-30">
                    <div className="w-12 h-12 border-2 border-slate-700 border-t-emerald-500/50 rounded-full animate-spin mb-4"></div>
                    <p className="text-xs font-mono uppercase tracking-[0.2em]">Awaiting Data Feed...</p>
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
