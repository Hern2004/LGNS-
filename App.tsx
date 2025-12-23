
import React, { useState, useEffect, useMemo } from 'react';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, Line, ComposedChart } from 'recharts';
import { fetchCurrentPrice, fetchHistoricalData } from './services/api';
import { PriceData, TokenStats } from './types';
import { DEFAULT_TOKEN_ADDRESS, DEFAULT_PLATFORM_ID, DEFAULT_ANNUAL_YIELD } from './constants';

const App: React.FC = () => {
  // 核心状态
  const [investment, setInvestment] = useState<number>(1000);
  const [annualYield, setAnnualYield] = useState<number>(DEFAULT_ANNUAL_YIELD);
  const [tokenAddress, setTokenAddress] = useState<string>(DEFAULT_TOKEN_ADDRESS);
  const [startDate, setStartDate] = useState<string>(
    new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  
  const [stats, setStats] = useState<TokenStats | null>(null);
  const [historicalPrices, setHistoricalPrices] = useState<PriceData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // 日复利利率计算: (1 + r)^365 = 1 + AnnualYield
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
        setError("无法从公开节点获取 K 线，可能是由于合约在 DEX 上的流动性较新。");
      }
    } catch (err) {
      setError("节点响应超时，请尝试刷新。");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { loadData(); }, [tokenAddress]);

  // 计算每日资产路径
  const results = useMemo(() => {
    if (!historicalPrices.length) return [];
    
    const startTimestamp = new Date(startDate).setHours(0, 0, 0, 0);
    const relevantPrices = historicalPrices.filter(p => p.timestamp >= startTimestamp);
    
    if (relevantPrices.length === 0) return [];

    const initialPrice = relevantPrices[0].price;
    const initialTokens = investment / initialPrice;
    
    return relevantPrices.map((point, index) => {
      // 每一天都在前一天的基础上增加币数 (日复利)
      const currentTokens = initialTokens * Math.pow(1 + dailyYieldRate, index);
      return {
        date: new Date(point.timestamp).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' }),
        price: point.price,
        tokenBalance: currentTokens,
        usdValue: currentTokens * point.price,
        timestamp: point.timestamp
      };
    });
  }, [historicalPrices, investment, startDate, dailyYieldRate]);

  const summary = useMemo(() => {
    if (!results.length) return null;
    const last = results[results.length - 1];
    const finalValue = last.usdValue;

    return {
      totalUsdValue: finalValue,
      totalTokens: last.tokenBalance,
      netProfitUsd: finalValue - investment,
      totalRoiPercent: ((finalValue - investment) / investment) * 100,
    };
  }, [results, investment]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#05080f] text-emerald-500">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-emerald-500/10 border-t-emerald-500 rounded-full animate-spin mx-auto"></div>
          <p className="font-bold tracking-widest animate-pulse">正在穿透全球 CDN 建立稳定连接...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#05080f] text-slate-200 font-sans p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Top Header */}
        <div className="flex flex-col md:flex-row gap-6">
          <div className="flex-1 bg-gradient-to-br from-slate-900 to-slate-950 p-6 rounded-[2rem] border border-slate-800/50 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-emerald-500 rounded-2xl flex items-center justify-center text-slate-950 font-black text-2xl shadow-[0_0_30px_rgba(16,185,129,0.3)]">L</div>
              <div>
                <h1 className="text-2xl font-black text-white tracking-tight">LGNS 计算器 <span className="text-emerald-500 text-sm ml-2 font-medium bg-emerald-500/10 px-2 py-0.5 rounded">Stable V2</span></h1>
                <p className="text-[10px] text-slate-500 font-mono mt-1 opacity-80">{tokenAddress}</p>
              </div>
            </div>
            <div className="text-right hidden sm:block">
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">DEX 实测现价</p>
              <p className="text-3xl font-black text-emerald-400 font-mono tracking-tighter">
                ${stats?.currentPrice.toFixed(4) || "0.0000"}
              </p>
            </div>
          </div>
          
          <div className="md:w-64 bg-slate-900/50 p-4 rounded-[2rem] border border-slate-800/50 flex flex-col justify-center gap-2">
            <button 
              onClick={loadData} 
              disabled={refreshing}
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-black rounded-2xl transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              {refreshing ? <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div> : "同步最新数据"}
            </button>
            <div className="flex items-center justify-center gap-2 text-[9px] text-slate-500 font-bold uppercase">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
              免 VPN 节点已就绪
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Settings Sidebar */}
          <aside className="lg:col-span-4 space-y-6">
            <div className="bg-slate-900/40 border border-slate-800/50 p-6 rounded-[2.5rem] backdrop-blur-xl">
              <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                <span className="w-1 h-3 bg-emerald-500 rounded-full"></span> 投资策略设定
              </h2>
              
              <div className="space-y-6">
                <div className="group">
                  <label className="text-[10px] text-slate-500 font-black uppercase mb-2 block group-focus-within:text-emerald-500 transition-colors">初始本金 (USDT)</label>
                  <input 
                    type="number" 
                    value={investment} 
                    onChange={(e) => setInvestment(Number(e.target.value))}
                    className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl px-5 py-4 font-mono text-xl text-white outline-none focus:border-emerald-500/40 transition-all shadow-inner"
                  />
                </div>

                <div className="group">
                  <label className="text-[10px] text-slate-500 font-black uppercase mb-2 block group-focus-within:text-cyan-500 transition-colors">设定币本位年化 (APR %)</label>
                  <div className="relative">
                    <input 
                      type="number" 
                      value={annualYield} 
                      onChange={(e) => setAnnualYield(Number(e.target.value))}
                      className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl px-5 py-4 font-mono text-xl text-cyan-400 outline-none focus:border-cyan-500/40 transition-all"
                    />
                    <span className="absolute right-5 top-1/2 -translate-y-1/2 text-cyan-500/50 font-black">%</span>
                  </div>
                </div>

                <div className="group">
                  <label className="text-[10px] text-slate-500 font-black uppercase mb-2 block group-focus-within:text-emerald-500 transition-colors">回测买入日期</label>
                  <input 
                    type="date" 
                    value={startDate} 
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl px-5 py-4 font-mono text-white outline-none focus:border-emerald-500/40 transition-all"
                  />
                </div>
              </div>
            </div>

            <div className="p-6 bg-gradient-to-br from-indigo-500/5 to-emerald-500/5 border border-white/5 rounded-[2.5rem]">
              <p className="text-[11px] text-slate-400 leading-relaxed">
                <strong className="text-emerald-500 block mb-1">💡 算法提示：</strong>
                本程序基于每日复利算法进行模拟。在高年化设定下，持有天数对最终收益的影响呈指数级增长。数据每 30 秒从全球主节点同步一次。
              </p>
            </div>
          </aside>

          {/* Main Content Area */}
          <section className="lg:col-span-8 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="bg-slate-900/40 p-6 rounded-[2.5rem] border border-slate-800/50">
                <p className="text-[10px] text-slate-500 font-black uppercase mb-2">预估总资产 (USDT)</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-black text-emerald-400 tracking-tighter">
                    ${summary?.totalUsdValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
              <div className="bg-slate-900/40 p-6 rounded-[2.5rem] border border-slate-800/50">
                <p className="text-[10px] text-slate-500 font-black uppercase mb-2">回测净利润 / ROI</p>
                <div className="flex items-baseline gap-2">
                  <span className={`text-4xl font-black tracking-tighter ${summary?.netProfitUsd! >= 0 ? 'text-emerald-400' : 'text-rose-500'}`}>
                    ${summary?.netProfitUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </span>
                  <span className="text-xs font-bold text-slate-500">({summary?.totalRoiPercent.toFixed(1)}%)</span>
                </div>
              </div>
            </div>

            {/* Composed Chart */}
            <div className="bg-slate-900/40 p-8 rounded-[3rem] border border-slate-800/50 h-[500px] flex flex-col">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-sm font-black text-white uppercase">复利本息 vs 币价波动</h3>
                  <p className="text-[10px] text-slate-500 font-bold mt-1">混合 K 线分析模型 (GeckoTerminal 实时同步)</p>
                </div>
                <div className="flex gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                    <span className="text-[9px] font-black text-slate-400">总价值</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 border-2 border-indigo-500 rounded-full"></div>
                    <span className="text-[9px] font-black text-slate-400">币价</span>
                  </div>
                </div>
              </div>

              <div className="flex-1 w-full">
                {results.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={results}>
                      <defs>
                        <linearGradient id="valGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#10b981" stopOpacity={0.3}/>
                          <stop offset="100%" stopColor="#10b981" stopOpacity={0}/>
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
                      />
                      <YAxis 
                        yAxisId="left" 
                        stroke="#10b981" 
                        fontSize={10} 
                        axisLine={false} 
                        tickLine={false} 
                        tickFormatter={(v) => `$${v}`}
                      />
                      <YAxis 
                        yAxisId="right" 
                        orientation="right" 
                        stroke="#6366f1" 
                        fontSize={10} 
                        axisLine={false} 
                        tickLine={false} 
                        tickFormatter={(v) => `$${v}`}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#0f172a', 
                          border: '1px solid #334155', 
                          borderRadius: '20px', 
                          fontSize: '11px',
                          boxShadow: '0 20px 25px -5px rgba(0,0,0,0.5)'
                        }} 
                        cursor={{ stroke: '#334155', strokeWidth: 2 }}
                      />
                      <Area 
                        yAxisId="left" 
                        type="monotone" 
                        dataKey="usdValue" 
                        stroke="#10b981" 
                        strokeWidth={4} 
                        fill="url(#valGrad)" 
                      />
                      <Line 
                        yAxisId="right" 
                        type="monotone" 
                        dataKey="price" 
                        stroke="#6366f1" 
                        strokeWidth={2} 
                        dot={false} 
                        strokeDasharray="5 5"
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full w-full flex flex-col items-center justify-center bg-slate-950/50 rounded-[2rem] border-2 border-dashed border-slate-800">
                    <p className="text-slate-600 font-black text-xs uppercase tracking-widest">{error || "正在解析 K 线数据数据流..."}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Stats Table */}
            <div className="bg-slate-900/40 border border-slate-800/50 rounded-[2.5rem] overflow-hidden">
              <div className="p-6 border-b border-slate-800/50 flex justify-between items-center">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">每日回测明细表 (日复利)</h4>
              </div>
              <div className="max-h-64 overflow-y-auto scrollbar-hide">
                <table className="w-full text-left font-mono text-[11px]">
                  <thead className="sticky top-0 bg-[#0a0f1d] text-slate-500 z-10 shadow-sm">
                    <tr>
                      <th className="px-6 py-4">日期</th>
                      <th className="px-6 py-4">币价 (DEX)</th>
                      <th className="px-6 py-4">持有量 (复合)</th>
                      <th className="px-6 py-4 text-right">总估值</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/30">
                    {[...results].reverse().map((row, i) => (
                      <tr key={i} className="hover:bg-emerald-500/5 transition-colors group">
                        <td className="px-6 py-4 text-slate-400">{row.date}</td>
                        <td className="px-6 py-4 text-indigo-400 font-bold">${row.price.toFixed(4)}</td>
                        <td className="px-6 py-4 text-slate-300">{row.tokenBalance.toLocaleString(undefined, { maximumFractionDigits: 0 })} LGNS</td>
                        <td className="px-6 py-4 text-right text-emerald-400 font-black">${row.usdValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default App;
