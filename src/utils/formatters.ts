import { FiatCode, QuickRangeKey } from '../types/crypto';
import { FREE_TIER_MAX_DAYS } from '../constants/market';

const currencyFormatterCache = new Map<string, Intl.NumberFormat>();

function getCurrencyFormatter(
  isoCurrency: string,
  minFractionDigits: number,
  maxFractionDigits: number,
  notation: 'standard' | 'compact' = 'standard'
): Intl.NumberFormat {
  const key = `${isoCurrency}:${minFractionDigits}:${maxFractionDigits}:${notation}`;
  let formatter = currencyFormatterCache.get(key);
  if (!formatter) {
    formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: isoCurrency,
      minimumFractionDigits: minFractionDigits,
      maximumFractionDigits: maxFractionDigits,
      notation,
    });
    currencyFormatterCache.set(key, formatter);
  }
  return formatter;
}

export function formatCurrency(
  value: number,
  currency: FiatCode,
  options?: { compact?: boolean; signed?: boolean }
): string {
  if (!Number.isFinite(value)) return '—';

  const iso = currency.toUpperCase();
  const abs = Math.abs(value);
  const compact = options?.compact ?? false;
  const signed = options?.signed ?? false;

  if (compact && abs >= 10_000) {
    const formatter = getCurrencyFormatter(iso, 0, 2, 'compact');
    const formatted = formatter.format(abs);
    if (value < 0) return `-${formatted}`;
    if (signed && value > 0) return `+${formatted}`;
    return formatted;
  }

  let minDecimals = 2;
  let maxDecimals = 2;

  if (iso === 'JPY') {
    if (abs === 0 || abs >= 100) {
      minDecimals = 0;
      maxDecimals = 0;
    } else if (abs >= 1) {
      minDecimals = 2;
      maxDecimals = 2;
    } else if (abs >= 0.01) {
      minDecimals = 4;
      maxDecimals = 4;
    } else if (abs >= 0.0001) {
      minDecimals = 6;
      maxDecimals = 6;
    } else {
      minDecimals = 8;
      maxDecimals = 8;
    }
  } else {
    if (abs === 0 || abs >= 10) {
      minDecimals = 2;
      maxDecimals = 2;
    } else if (abs >= 1) {
      minDecimals = 2;
      maxDecimals = 4;
    } else if (abs >= 0.01) {
      minDecimals = 4;
      maxDecimals = 4;
    } else if (abs >= 0.0001) {
      minDecimals = 6;
      maxDecimals = 6;
    } else {
      minDecimals = 8;
      maxDecimals = 8;
    }
  }

  const formatter = getCurrencyFormatter(iso, minDecimals, maxDecimals, 'standard');
  const formatted = formatter.format(abs);

  if (value < 0) return `-${formatted}`;
  if (signed && value > 0) return `+${formatted}`;
  return formatted;
}

export function formatVolumeOrCap(value: number, currency: FiatCode, compact = false): string {
  if (!Number.isFinite(value) || value <= 0) return '—';
  const iso = currency.toUpperCase();
  if (compact) {
    return getCurrencyFormatter(iso, 0, 2, 'compact').format(value);
  }
  return getCurrencyFormatter(iso, 0, 0, 'standard').format(value);
}

export function formatPercentage(value: number | null, options?: { signed?: boolean; decimals?: number }): string {
  if (value === null || !Number.isFinite(value)) return '—';
  const decimals = options?.decimals ?? 2;
  const signed = options?.signed ?? true;
  const fixed = Math.abs(value).toFixed(decimals);
  if (value < 0) return `-${fixed}%`;
  if (signed && value > 0) return `+${fixed}%`;
  return `${fixed}%`;
}

export function toIsoDateUTC(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatDateDDMMYYYY(isoDate: string): string {
  if (!isoDate || !isoDate.includes('-')) return isoDate;
  const [year, month, day] = isoDate.split('-');
  if (!year || !month || !day) return isoDate;
  return `${day}-${month}-${year}`;
}

export function formatUtcTimestamp(timestampMs: number): string {
  const d = new Date(timestampMs);
  const day = String(d.getUTCDate()).padStart(2, '0');
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const year = d.getUTCFullYear();
  const hours = String(d.getUTCHours()).padStart(2, '0');
  const minutes = String(d.getUTCMinutes()).padStart(2, '0');
  const seconds = String(d.getUTCSeconds()).padStart(2, '0');
  return `${day}-${month}-${year} ${hours}:${minutes}:${seconds} UTC`;
}

export function isoDateToStartTimestampSec(isoDate: string): number {
  const [y, m, d] = isoDate.split('-').map(Number);
  return Math.floor(Date.UTC(y, m - 1, d, 0, 0, 0) / 1000);
}

export function isoDateToEndTimestampSec(isoDate: string): number {
  const [y, m, d] = isoDate.split('-').map(Number);
  const endOfDaySec = Math.floor(Date.UTC(y, m - 1, d, 23, 59, 59) / 1000);
  const nowSec = Math.floor(Date.now() / 1000);
  return Math.min(endOfDaySec, nowSec);
}

export function getTodayIsoUTC(): string {
  return toIsoDateUTC(new Date());
}

export function getFreeTierMinStartDate(): string {
  const now = new Date();
  const minDate = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );
  minDate.setUTCDate(minDate.getUTCDate() - FREE_TIER_MAX_DAYS);
  return toIsoDateUTC(minDate);
}

export function getQuickRangeDates(key: Exclude<QuickRangeKey, 'CUSTOM'>): {
  startDate: string;
  endDate: string;
} {
  const now = new Date();
  const endDate = toIsoDateUTC(now);
  const minStartDate = getFreeTierMinStartDate();

  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  switch (key) {
    case '7D':
      start.setUTCDate(start.getUTCDate() - 7);
      break;
    case '30D':
      start.setUTCDate(start.getUTCDate() - 30);
      break;
    case '90D':
      start.setUTCDate(start.getUTCDate() - 90);
      break;
    case 'YTD':
      start.setUTCMonth(0, 1);
      break;
    case '1Y':
      // 364 days stays safely inside CoinGecko Public API's free 365-day window
      start.setUTCDate(start.getUTCDate() - FREE_TIER_MAX_DAYS);
      break;
  }

  const startIso = toIsoDateUTC(start);
  return {
    startDate: startIso < minStartDate ? minStartDate : startIso,
    endDate,
  };
}
