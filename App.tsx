
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
  const [tokenAddress] = useState<string>(DEFAULT_TOKEN_ADDRESS); // 固定地址
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
    setError(null);
    try {
      const [currentStats, history] = await Promise.all([
        fetchCurrentPrice(tokenAddress),
        fetchHistoricalData(DEFAULT_PLATFORM_ID, tokenAddress)
      ]);
      
      setStats(currentStats);
      setHistoricalPrices(history);
      
      if (history.length === 0) {
        setError("未能获取到历史价格数据，请检查网络或代币地址。");
      }
    } catch (err) {
      console.error("Fetch Error:", err);
      setError("网络连接失败，请重试。");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { loadData(); }, [tokenAddress]);

  const results = useMemo(() => {
    if (!historicalPrices.length) return [];
    
    const startTimestamp = new Date(startDate).getTime();
    // 过滤出早于或等于开始日期的最接近的一个点作为初始价格参考
    let relevantPrices = historicalPrices.filter(p => p.timestamp >= startTimestamp);
    
    // 如果过滤后为空，回退到显示所有可用数据，避免图表空白
    if (relevantPrices.length === 0) {
      relevantPrices = historicalPrices.slice(-30);
    }

    const initialPrice = relevantPrices[0]?.price || 0;
    if (initialPrice === 0) return [];

    const initialTokens = investment / initialPrice;
    
    return relevantPrices.map((point, index) => {
      // 计算复利后的代币数量
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
          <p className="mt-6 text-emerald-500 font-mono text-sm tracking-widest animate-pulse uppercase">Syncing Blockchain Data...</p>
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
                <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-400 font-black border border-emerald-500/20">V1.3 STABLE</span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className={`w-2 h-2 rounded-full ${error ? 'bg-rose-500' : 'bg-emerald-500 animate-pulse'}`}></span>
                <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">
                  {error ? 'Data Sync Error' : 'Live Data: GeckoTerminal'}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-8 bg-slate-900/40 p-3 px-6 rounded-2xl border border-white/5">
            <div className="text-center md:text-right">
              <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-0.5">Live Price (USD)</p>
              <p className="text-3xl font-mono font-bold text-emerald-400 tracking-tighter">
                ${stats?.currentPrice.toFixed(4) || "---"}
              </p>
            </div>
            <button 
              onClick={loadData}
              disabled={refreshing}
              className="p-3 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-xl transition-all group border border-emerald-500/20 disabled:opacity-50"
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
                计算参数配置
              </h2>

              <div className="space-y-6">
                <div className="space-y-2.5">
                  <label className="text-[10px] text-slate-400 font-black uppercase ml-1 tracking-wider">初始投入 (USDT)</label>
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
                  <label className="text-[10px] text-slate-400 font-black uppercase ml-1 tracking-wider">设定年化收益率 (APR %)</label>
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
                  <label className="text-[10px] text-slate-400 font-black uppercase ml-1 tracking-wider">投资开始日期</label>
                  <input 
                    type="date" 
                    value={startDate} 
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-slate-950/50 rounded-2xl px-5 py-4 font-mono text-sm text-slate-300 border border-white/10 focus:border-emerald-500 outline-none transition-all shadow-inner"
                  />
                </div>
              </div>
            </div>

            <div className="p-7 rounded-[2.5rem] bg-emerald-500/5 border border-emerald-500/10 shadow-inner">
              <p className="text-[11px] leading-relaxed text-slate-400">
                <strong className="text-emerald-500 font-black block mb-2 tracking-wide uppercase">复利计算模型说明</strong>
                该工具模拟了持有 LGNS 期间的日复利增长。当前设定年化为 <span className="text-white">{annualYield}%</span>。
                计算公式：总价值 = (投入/初价) * (1 + 日利率)<sup>天数</sup> * 现价。
              </p>
            </div>
          </aside>

          {/* Visualization */}
          <main className="lg:col-span-9 space-y-6">
            
            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
              {[
                { label: '预估总价值', value: `$${summary?.totalUsdValue.toLocaleString(undefined, { maximumFractionDigits: 1 }) || '0'}`, color: 'text-white' },
                { label: '净利润 (USD)', value: `${(summary?.netProfitUsd || 0) >= 0 ? '+' : ''}$${summary?.netProfitUsd.toLocaleString(undefined, { maximumFractionDigits: 1 }) || '0'}`, color: (summary?.netProfitUsd || 0) >= 0 ? 'text-emerald-400' : 'text-rose-500' },
                { label: '持币翻倍数', value: `${summary?.multiplier.toFixed(2) || '1.00'}x`, color: 'text-cyan-400' },
                { label: '当前预估日收益', value: `+$${summary?.dailyEst.toLocaleString(undefined, { maximumFractionDigits: 2 }) || '0'}`, color: 'text-emerald-500' },
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
            <div className="glass rounded-[3rem] p-8 md:p-10 h-[560px] shadow-2xl border border-white/5 relative overflow-hidden flex flex-col">
              <div className="flex items-center justify-between z-10 mb-8">
                <div className="bg-slate-950/20 p-2 px-4 rounded-xl backdrop-blur-sm border border-white/5">
                  <h3 className="text-xs font-black text-white uppercase tracking-[0.2em]">资产增长投影曲线</h3>
                  <p className="text-[9px] text-slate-500 mt-1 font-mono uppercase">数据源: 历史价格 + 复利增长模型</p>
                </div>
                {error && (
                  <span className="text-rose-500 text-[10px] font-black uppercase tracking-widest bg-rose-500/10 px-3 py-1 rounded-full animate-pulse">
                    {error}
                  </span>
                )}
              </div>
              
              <div className="flex-grow w-full relative">
                {results.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={results} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
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
                        minTickGap={40}
                        dy={10}
                        fontFamily="monospace"
                      />
                      <YAxis 
                        stroke="#475569" 
                        fontSize={10} 
                        axisLine={false} 
                        tickLine={false} 
                        domain={['auto', 'auto']}
                        tickFormatter={(v) => `$${v >= 1000 ? (v/1000).toFixed(1)+'k' : v}`}
                        width={45}
                        fontFamily="monospace"
                      />
                      <Tooltip 
                        cursor={{ stroke: '#10b981', strokeWidth: 1 }}
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const d = payload[0].payload;
                            return (
                              <div className="bg-slate-950/95 border border-emerald-500/30 p-5 rounded-2xl shadow-2xl backdrop-blur-md">
                                <p className="text-[10px] text-emerald-500 font-black mb-3 uppercase tracking-widest border-b border-emerald-500/10 pb-2">{d.fullDate}</p>
                                <div className="space-y-2">
                                  <div className="flex justify-between gap-10 items-center">
                                    <span className="text-[10px] text-slate-400 uppercase font-bold">总值 (USD)</span>
                                    <span className="text-sm font-mono font-black text-white">${d.usdValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                  </div>
                                  <div className="flex justify-between gap-10 items-center">
                                    <span className="text-[10px] text-slate-400 uppercase font-bold">币价</span>
                                    <span className="text-xs font-mono text-slate-300">${d.price.toFixed(4)}</span>
                                  </div>
                                  <div className="flex justify-between gap-10 items-center">
                                    <span className="text-[10px] text-slate-400 uppercase font-bold">累计倍数</span>
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
                        strokeWidth={3} 
                        fill="url(#areaFill)" 
                        isAnimationActive={true}
                        animationDuration={1500}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full w-full flex flex-col items-center justify-center border border-dashed border-white/5 rounded-3xl">
                    <div className="w-10 h-10 border-2 border-slate-800 border-t-emerald-500 rounded-full animate-spin mb-4"></div>
                    <p className="text-slate-600 font-black text-[10px] uppercase tracking-[0.3em] animate-pulse">正在等待历史数据注入...</p>
                  </div>
                )}
              </div>
            </div>

            <footer className="text-center pt-2 pb-6">
              <p className="text-[9px] text-slate-600 font-black uppercase tracking-[0.3em] flex items-center justify-center gap-4">
                <span>DEX: GECKOTERMINAL</span>
                <span className="w-1 h-1 rounded-full bg-slate-800"></span>
                <span>ENGINE: RECHARTS V2</span>
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
