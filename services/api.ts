
import { DEX_SCREENER_API_BASE, GECKO_TERMINAL_API_BASE } from '../constants';
import { PriceData, TokenStats } from '../types';

/**
 * 通过 DexScreener 获取实时价格（国内访问最稳定）
 */
export const fetchCurrentPrice = async (address: string): Promise<TokenStats> => {
  try {
    const url = `${DEX_SCREENER_API_BASE}/${address}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error("DexScreener API Offline");
    
    const json = await response.json();
    const pair = json.pairs?.[0]; // 取流动性最大的交易对

    if (!pair) throw new Error("No active liquidity pairs found");

    return {
      currentPrice: parseFloat(pair.priceUsd) || 0,
      priceChange24h: parseFloat(pair.priceChange?.h24) ?? 0,
      marketCap: parseFloat(pair.fdv) ?? 0,
      volume24h: parseFloat(pair.volume?.h24) ?? 0,
    };
  } catch (error) {
    console.error("DexScreener Fetch Error:", error);
    return { currentPrice: 0, priceChange24h: 0, marketCap: 0, volume24h: 0 };
  }
};

/**
 * 获取历史 OHLCV 数据（使用 GeckoTerminal 节点）
 */
export const fetchHistoricalData = async (platform: string, address: string): Promise<PriceData[]> => {
  try {
    // 1. 获取该代币的流动性池地址
    const poolsUrl = `${GECKO_TERMINAL_API_BASE}/networks/${platform}/tokens/${address}/pools`;
    const poolsResponse = await fetch(poolsUrl);
    if (!poolsResponse.ok) return [];
    
    const poolsJson = await poolsResponse.json();
    const topPool = poolsJson.data?.[0];
    if (!topPool) return [];

    const poolAddress = topPool.attributes.address;

    // 2. 获取该池子的历史数据
    const historyUrl = `${GECKO_TERMINAL_API_BASE}/networks/${platform}/pools/${poolAddress}/ohlcv/day?limit=365`;
    const response = await fetch(historyUrl);
    if (!response.ok) return [];

    const data = await response.json();
    const ohlcvList = data.data.attributes.ohlcv_list;

    // 提取收盘价并按时间升序排列
    return ohlcvList.map((item: any) => ({
      timestamp: item[0] * 1000,
      price: parseFloat(item[4]),
    })).sort((a: any, b: any) => a.timestamp - b.timestamp);
    
  } catch (error) {
    console.error("Historical Data Fetch Error:", error);
    return [];
  }
};
