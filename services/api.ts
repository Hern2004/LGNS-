
import { OKX_DEX_API_BASE, GECKO_TERMINAL_API_BASE, OKX_CHAIN_ID } from '../constants';
import { PriceData, TokenStats } from '../types';

/**
 * 通过 OKX DEX 接口获取实时价格 (国内最快、最稳定)
 */
export const fetchCurrentPrice = async (address: string): Promise<TokenStats> => {
  try {
    // OKX 的这个接口专为前端聚合器设计，国内访问延迟极低
    const url = `${OKX_DEX_API_BASE}?chainId=${OKX_CHAIN_ID}&tokenAddress=${address}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error("OKX API Offline");
    
    const json = await response.json();
    const data = json.data;

    if (!data) throw new Error("Token not found on OKX DEX");

    return {
      currentPrice: parseFloat(data.priceUsd) || 0,
      priceChange24h: parseFloat(data.priceChange24h) ?? 0,
      marketCap: parseFloat(data.fdv) ?? 0,
      volume24h: parseFloat(data.volume24h) ?? 0,
    };
  } catch (error) {
    console.warn("OKX Fetch Error, trying fallback:", error);
    // 如果 OKX 出错，返回默认空值，App.tsx 会有处理逻辑
    return { currentPrice: 0, priceChange24h: 0, marketCap: 0, volume24h: 0 };
  }
};

/**
 * 获取历史 OHLCV 数据 (回测专用)
 */
export const fetchHistoricalData = async (platform: string, address: string): Promise<PriceData[]> => {
  try {
    const poolsUrl = `${GECKO_TERMINAL_API_BASE}/networks/${platform}/tokens/${address}/pools`;
    const poolsResponse = await fetch(poolsUrl);
    if (!poolsResponse.ok) return [];
    
    const poolsJson = await poolsResponse.json();
    const topPool = poolsJson.data?.[0];
    if (!topPool) return [];

    const poolAddress = topPool.attributes.address;
    const historyUrl = `${GECKO_TERMINAL_API_BASE}/networks/${platform}/pools/${poolAddress}/ohlcv/day?limit=365`;
    const response = await fetch(historyUrl);
    if (!response.ok) return [];

    const data = await response.json();
    const ohlcvList = data.data.attributes.ohlcv_list;

    return ohlcvList.map((item: any) => ({
      timestamp: item[0] * 1000,
      price: parseFloat(item[4]),
    })).sort((a: any, b: any) => a.timestamp - b.timestamp);
    
  } catch (error) {
    console.error("Historical Data Error:", error);
    return [];
  }
};
