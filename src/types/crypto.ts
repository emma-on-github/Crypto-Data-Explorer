export type FiatCode = 'gbp' | 'usd' | 'eur' | 'cad' | 'aud' | 'jpy';

export type QuickRangeKey = '7D' | '30D' | '90D' | 'YTD' | '1Y' | 'CUSTOM';

export interface CoinOption {
  id: string;
  symbol: string;
  name: string;
}

export interface FiatOption {
  code: FiatCode;
  isoCode: string;
  symbol: string;
  name: string;
}

export interface CoinGeckoMarketChartResponse {
  prices: [number, number | null][];
  market_caps: [number, number | null][];
  total_volumes: [number, number | null][];
}

export interface DailyDataPoint {
  isoDate: string; // YYYY-MM-DD (UTC)
  displayDate: string; // DD-MM-YYYY
  timestamp: number;
  price: number;
  marketCap: number;
  volume: number;
  dailyChangePct: number | null;
  sma7: number | null;
  sma30: number | null;
  drawdownPct: number;
  peakPrice: number;
}

export interface NormalizedSeriesResult {
  series: DailyDataPoint[];
  hasInvalidPrices: boolean;
  invalidPriceCount: number;
  sma7Eligible: boolean;
  sma7UnavailableReason: string | null;
}

export type VolatilityLabel = 'Calm' | 'Moderate Swings' | 'Large Swings' | 'Insufficient Data';

export interface PeriodStats {
  startPrice: number;
  endPrice: number;
  absChange: number;
  pctChange: number;
  highPrice: number;
  highDate: string;
  lowPrice: number;
  lowDate: string;
  avgVolume: number;
  volatilityStdDev: number | null;
  volatilityLabel: VolatilityLabel;
  maxDrawdownPct: number;
  maxDrawdownPeakDate: string;
  maxDrawdownTroughDate: string;
  earliestDataDate: string;
  latestDataDate: string;
  dayCount: number;
  sma7Eligible: boolean;
  latestSma7: number | null;
}

export type ApiErrorKind =
  | 'rate_limit'
  | 'range_limit_365d'
  | 'timeout'
  | 'network'
  | 'invalid_data'
  | 'api_error';

export interface ApiErrorState {
  kind: ApiErrorKind;
  headline: string;
  detail: string;
}
