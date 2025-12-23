
import { GECKO_TERMINAL_API_BASE, DEFAULT_PLATFORM_ID } from '../constants';
import { PriceData, TokenStats } from '../types';

/**
 * 获取实时价格及统计数据
 */
export const fetchCurrentPrice = async (address: string): Promise<TokenStats> => {
  const normalizedAddress = address.toLowerCase();
  try {
    const url = `${GECKO_TERMINAL_API_BASE}/networks/${DEFAULT_PLATFORM_ID}/tokens/${normalizedAddress}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json;version=20230302' }
    });
    
    if (!response.ok) throw new Error(`Price API status: ${response.status}`);
    
    const json = await response.json();
    const attributes = json.data?.attributes;

    if (!attributes) throw new Error("Token data attributes missing");

    return {
      currentPrice: parseFloat(attributes.price_usd) || 0,
      priceChange24h: parseFloat(attributes.price_change_percentage?.h24) || 0,
      marketCap: parseFloat(attributes.fdv_usd) || 0,
      volume24h: parseFloat(attributes.total_volume_usd) || 0,
    };
  } catch (error) {
    console.error("Current Price Fetch Failed:", error);
    return { currentPrice: 0, priceChange24h: 0, marketCap: 0, volume24h: 0 };
  }
};

/**
 * 获取历史 OHLCV 数据
 */
export const fetchHistoricalData = async (platform: string, address: string): Promise<PriceData[]> => {
  const normalizedAddress = address.toLowerCase();
  try {
    // 1. 获取该代币的最佳流动性池
    const poolsUrl = `${GECKO_TERMINAL_API_BASE}/networks/${platform}/tokens/${normalizedAddress}/pools`;
    const poolsResponse = await fetch(poolsUrl, {
      headers: { 'Accept': 'application/json;version=20230302' }
    });
    
    if (!poolsResponse.ok) throw new Error(`Pools API status: ${poolsResponse.status}`);
    
    const poolsJson = await poolsResponse.json();
    const topPool = poolsJson.data?.[0];
    if (!topPool) {
      console.warn("No pools found for this token on GeckoTerminal");
      return [];
    }

    const poolAddress = topPool.attributes.address;
    
    // 2. 获取该池子的历史天级别价格
    const historyUrl = `${GECKO_TERMINAL_API_BASE}/networks/${platform}/pools/${poolAddress}/ohlcv/day?limit=180`;
    const response = await fetch(historyUrl, {
      headers: { 'Accept': 'application/json;version=20230302' }
    });
    
    if (!response.ok) throw new Error(`OHLCV API status: ${response.status}`);

    const data = await response.json();
    const ohlcvList = data.data?.attributes?.ohlcv_list;

    if (!ohlcvList || !Array.isArray(ohlcvList)) return [];

    // [timestamp, open, high, low, close, volume]
    return ohlcvList.map((item: any) => ({
      timestamp: item[0] * 1000,
      price: parseFloat(item[4]),
    })).sort((a: any, b: any) => a.timestamp - b.timestamp);
    
  } catch (error) {
    console.error("Historical Data Error:", error);
    return [];
  }
};
