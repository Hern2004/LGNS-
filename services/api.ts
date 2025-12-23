
import { GECKO_TERMINAL_API_BASE, DEFAULT_PLATFORM_ID } from '../constants';
import { PriceData, TokenStats } from '../types';

/**
 * 获取实时价格及统计数据 - 切换为 GeckoTerminal 以解决 CORS 报错
 */
export const fetchCurrentPrice = async (address: string): Promise<TokenStats> => {
  try {
    // 接口文档: https://www.geckoterminal.com/dex-api
    const url = `${GECKO_TERMINAL_API_BASE}/networks/${DEFAULT_PLATFORM_ID}/tokens/${address}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json;version=20230302'
      }
    });
    
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    
    const json = await response.json();
    const attributes = json.data?.attributes;

    if (!attributes) throw new Error("Token data not found in response");

    return {
      currentPrice: parseFloat(attributes.price_usd) || 0,
      priceChange24h: parseFloat(attributes.price_change_percentage?.h24) || 0,
      marketCap: parseFloat(attributes.fdv_usd) || 0,
      volume24h: parseFloat(attributes.total_volume_usd) || 0,
    };
  } catch (error) {
    console.error("GeckoTerminal Price Fetch Error:", error);
    // 发生错误时返回零值，避免应用崩溃
    return { currentPrice: 0, priceChange24h: 0, marketCap: 0, volume24h: 0 };
  }
};

/**
 * 获取历史数据
 */
export const fetchHistoricalData = async (platform: string, address: string): Promise<PriceData[]> => {
  try {
    // 首先获取代币的交易对(Pool)
    const poolsUrl = `${GECKO_TERMINAL_API_BASE}/networks/${platform}/tokens/${address}/pools`;
    const poolsResponse = await fetch(poolsUrl, {
      headers: { 'Accept': 'application/json;version=20230302' }
    });
    
    if (!poolsResponse.ok) return [];
    
    const poolsJson = await poolsResponse.json();
    const topPool = poolsJson.data?.[0];
    if (!topPool) return [];

    const poolAddress = topPool.attributes.address;
    
    // 获取 OHLCV 历史数据（天维度）
    const historyUrl = `${GECKO_TERMINAL_API_BASE}/networks/${platform}/pools/${poolAddress}/ohlcv/day?limit=180`;
    const response = await fetch(historyUrl, {
      headers: { 'Accept': 'application/json;version=20230302' }
    });
    
    if (!response.ok) return [];

    const data = await response.json();
    const ohlcvList = data.data.attributes.ohlcv_list;

    // item[0] 是时间戳，item[4] 是收盘价
    return ohlcvList.map((item: any) => ({
      timestamp: item[0] * 1000,
      price: parseFloat(item[4]),
    })).sort((a: any, b: any) => a.timestamp - b.timestamp);
    
  } catch (error) {
    console.warn("History Data Fetch Error:", error);
    return [];
  }
};
