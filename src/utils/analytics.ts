import {
  CoinGeckoMarketChartResponse,
  DailyDataPoint,
  NormalizedSeriesResult,
  PeriodStats,
  VolatilityLabel,
} from '../types/crypto';
import { formatDateDDMMYYYY, toIsoDateUTC } from './formatters';

interface RawDayBucket {
  isoDate: string;
  timestamp: number;
  price: number;
  marketCap: number;
  volume: number;
}

export const INSUFFICIENT_SMA7_MESSAGE =
  'Insufficient historical data to calculate 7-Day Average (7D SMA).';

function isValidPositivePrice(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

/**
 * Normalizes CoinGecko's variable-granularity arrays (5-min, hourly, or daily)
 * into one validated daily closing observation per UTC calendar day.
 * Rejects zero, null, NaN, or missing prices and gates 7D SMA calculation
 * strictly on >= 7 complete, valid non-zero daily closes.
 */
export function normalizeToDailySeries(
  raw: CoinGeckoMarketChartResponse
): NormalizedSeriesResult {
  if (!raw || !Array.isArray(raw.prices) || raw.prices.length === 0) {
    return {
      series: [],
      hasInvalidPrices: false,
      invalidPriceCount: 0,
      sma7Eligible: false,
      sma7UnavailableReason: INSUFFICIENT_SMA7_MESSAGE,
    };
  }

  const mcapMap = new Map<string, { ts: number; val: number }>();
  for (const entry of raw.market_caps ?? []) {
    if (!Array.isArray(entry) || entry.length < 2) continue;
    const [ts, val] = entry;
    if (typeof ts !== 'number' || !Number.isFinite(ts)) continue;
    const safeVal = typeof val === 'number' && Number.isFinite(val) && val >= 0 ? val : 0;
    const iso = toIsoDateUTC(new Date(ts));
    const existing = mcapMap.get(iso);
    if (!existing || ts >= existing.ts) {
      mcapMap.set(iso, { ts, val: safeVal });
    }
  }

  const volMap = new Map<string, { ts: number; val: number }>();
  for (const entry of raw.total_volumes ?? []) {
    if (!Array.isArray(entry) || entry.length < 2) continue;
    const [ts, val] = entry;
    if (typeof ts !== 'number' || !Number.isFinite(ts)) continue;
    const safeVal = typeof val === 'number' && Number.isFinite(val) && val >= 0 ? val : 0;
    const iso = toIsoDateUTC(new Date(ts));
    const existing = volMap.get(iso);
    if (!existing || ts >= existing.ts) {
      volMap.set(iso, { ts, val: safeVal });
    }
  }

  // Group raw price points by UTC calendar day and track invalid/zero/null closing entries
  const latestRawDayMap = new Map<string, { ts: number; rawPrice: unknown }>();
  for (const entry of raw.prices) {
    if (!Array.isArray(entry) || entry.length < 2) continue;
    const [ts, rawPrice] = entry;
    if (typeof ts !== 'number' || !Number.isFinite(ts)) continue;
    const iso = toIsoDateUTC(new Date(ts));
    const existing = latestRawDayMap.get(iso);
    if (!existing || ts >= existing.ts) {
      latestRawDayMap.set(iso, { ts, rawPrice });
    }
  }

  let invalidPriceCount = 0;
  const validBuckets: RawDayBucket[] = [];

  for (const [iso, item] of latestRawDayMap.entries()) {
    if (!isValidPositivePrice(item.rawPrice)) {
      invalidPriceCount += 1;
      continue;
    }
    validBuckets.push({
      isoDate: iso,
      timestamp: item.ts,
      price: item.rawPrice,
      marketCap: mcapMap.get(iso)?.val ?? 0,
      volume: volMap.get(iso)?.val ?? 0,
    });
  }

  const hasInvalidPrices = invalidPriceCount > 0;
  const sortedDays = validBuckets.sort((a, b) => a.isoDate.localeCompare(b.isoDate));

  // Strict 7D SMA gate: must have >= 7 valid daily closing prices and NONE zero/null/missing
  const sma7Eligible = sortedDays.length >= 7 && !hasInvalidPrices;
  const sma7UnavailableReason = sma7Eligible ? null : INSUFFICIENT_SMA7_MESSAGE;

  const result: DailyDataPoint[] = [];
  let runningPeak = -Infinity;

  for (let i = 0; i < sortedDays.length; i++) {
    const current = sortedDays[i];
    const prev = i > 0 ? sortedDays[i - 1] : null;

    const dailyChangePct =
      prev && isValidPositivePrice(prev.price)
        ? ((current.price - prev.price) / prev.price) * 100
        : null;

    let sma7: number | null = null;
    if (sma7Eligible && i >= 6) {
      let sum7 = 0;
      let windowValid = true;
      for (let j = i - 6; j <= i; j++) {
        const p = sortedDays[j]?.price;
        if (!isValidPositivePrice(p)) {
          windowValid = false;
          break;
        }
        sum7 += p;
      }
      if (windowValid) {
        sma7 = sum7 / 7;
      }
    }

    let sma30: number | null = null;
    if (!hasInvalidPrices && i >= 29) {
      let sum30 = 0;
      let windowValid = true;
      for (let j = i - 29; j <= i; j++) {
        const p = sortedDays[j]?.price;
        if (!isValidPositivePrice(p)) {
          windowValid = false;
          break;
        }
        sum30 += p;
      }
      if (windowValid) {
        sma30 = sum30 / 30;
      }
    }

    if (current.price > runningPeak) {
      runningPeak = current.price;
    }
    const drawdownPct =
      runningPeak > 0 ? ((current.price - runningPeak) / runningPeak) * 100 : 0;

    result.push({
      isoDate: current.isoDate,
      displayDate: formatDateDDMMYYYY(current.isoDate),
      timestamp: current.timestamp,
      price: current.price,
      marketCap: current.marketCap,
      volume: current.volume,
      dailyChangePct,
      sma7,
      sma30,
      drawdownPct,
      peakPrice: runningPeak,
    });
  }

  return {
    series: result,
    hasInvalidPrices,
    invalidPriceCount,
    sma7Eligible,
    sma7UnavailableReason,
  };
}

export function computePeriodStats(
  series: DailyDataPoint[],
  sma7Eligible: boolean
): PeriodStats | null {
  if (series.length === 0) return null;

  const first = series[0];
  const last = series[series.length - 1];
  const startPrice = first.price;
  const endPrice = last.price;
  const absChange = endPrice - startPrice;
  const pctChange = startPrice > 0 ? (absChange / startPrice) * 100 : 0;

  let highPrice = -Infinity;
  let highDate = first.displayDate;
  let lowPrice = Infinity;
  let lowDate = first.displayDate;
  let totalVolume = 0;

  let maxDrawdownPct = 0;
  let currentPeakPrice = -Infinity;
  let currentPeakDate = first.displayDate;
  let maxDrawdownPeakDate = first.displayDate;
  let maxDrawdownTroughDate = first.displayDate;

  const dailyReturns: number[] = [];

  for (const pt of series) {
    if (pt.price > highPrice) {
      highPrice = pt.price;
      highDate = pt.displayDate;
    }
    if (pt.price < lowPrice) {
      lowPrice = pt.price;
      lowDate = pt.displayDate;
    }
    totalVolume += pt.volume;

    if (pt.dailyChangePct !== null && Number.isFinite(pt.dailyChangePct)) {
      dailyReturns.push(pt.dailyChangePct);
    }

    if (pt.price >= currentPeakPrice) {
      currentPeakPrice = pt.price;
      currentPeakDate = pt.displayDate;
    }
    if (pt.drawdownPct <= maxDrawdownPct) {
      maxDrawdownPct = pt.drawdownPct;
      maxDrawdownPeakDate = currentPeakDate;
      maxDrawdownTroughDate = pt.displayDate;
    }
  }

  const avgVolume = totalVolume / series.length;

  let volatilityStdDev: number | null = null;
  let volatilityLabel: VolatilityLabel = 'Insufficient Data';

  if (dailyReturns.length >= 2) {
    const mean = dailyReturns.reduce((acc, r) => acc + r, 0) / dailyReturns.length;
    const variance =
      dailyReturns.reduce((acc, r) => acc + (r - mean) ** 2, 0) / (dailyReturns.length - 1);
    volatilityStdDev = Math.sqrt(variance);

    if (volatilityStdDev < 2.0) {
      volatilityLabel = 'Calm';
    } else if (volatilityStdDev <= 5.0) {
      volatilityLabel = 'Moderate Swings';
    } else {
      volatilityLabel = 'Large Swings';
    }
  }

  return {
    startPrice,
    endPrice,
    absChange,
    pctChange,
    highPrice,
    highDate,
    lowPrice,
    lowDate,
    avgVolume,
    volatilityStdDev,
    volatilityLabel,
    maxDrawdownPct,
    maxDrawdownPeakDate,
    maxDrawdownTroughDate,
    earliestDataDate: first.displayDate,
    latestDataDate: last.displayDate,
    dayCount: series.length,
    sma7Eligible,
    latestSma7: sma7Eligible ? last.sma7 : null,
  };
}
