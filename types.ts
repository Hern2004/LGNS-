
export interface PriceData {
  timestamp: number;
  price: number;
}

export interface CalculationResult {
  date: string;
  price: number;
  tokenBalance: number;
  usdValue: number;
  initialInvestmentUsd: number;
  profitUsd: number;
  roi: number;
}

export interface TokenStats {
  currentPrice: number;
  priceChange24h: number;
  marketCap: number;
  volume24h: number;
}

export interface CalculationSummary {
  totalUsdValue: number;
  totalTokens: number;
  netProfitUsd: number;
  totalRoiPercent: number;
  daysElapsed: number;
}
