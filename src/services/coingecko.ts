import { ApiErrorState, CoinGeckoMarketChartResponse, FiatCode } from '../types/crypto';
import { isoDateToEndTimestampSec, isoDateToStartTimestampSec } from '../utils/formatters';

const CACHE_PREFIX = 'crypto_data_explorer:v1:market_chart';
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes within browser session
const REQUEST_TIMEOUT_MS = 15_000; // 15 seconds explicit timeout

const UNAVAILABLE_HEADLINE = 'Live price data unavailable. Please try again.';

interface CachedEntry {
  fetchedAt: number;
  data: CoinGeckoMarketChartResponse;
}

export class CoinGeckoApiError extends Error {
  public readonly state: ApiErrorState;

  constructor(state: ApiErrorState) {
    super(state.headline);
    this.state = state;
  }
}

export function buildCacheKey(
  coinId: string,
  currency: FiatCode,
  startDate: string,
  endDate: string
): string {
  return `${CACHE_PREFIX}:${coinId}:${currency}:${startDate}:${endDate}`;
}

export function readCachedChart(
  coinId: string,
  currency: FiatCode,
  startDate: string,
  endDate: string
): CachedEntry | null {
  try {
    const raw = sessionStorage.getItem(buildCacheKey(coinId, currency, startDate, endDate));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedEntry;
    if (!parsed || typeof parsed.fetchedAt !== 'number' || !parsed.data) return null;
    if (Date.now() - parsed.fetchedAt > CACHE_TTL_MS) {
      sessionStorage.removeItem(buildCacheKey(coinId, currency, startDate, endDate));
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function writeCachedChart(
  coinId: string,
  currency: FiatCode,
  startDate: string,
  endDate: string,
  data: CoinGeckoMarketChartResponse,
  fetchedAt: number
): void {
  try {
    const payload: CachedEntry = {
      fetchedAt,
      data,
    };
    sessionStorage.setItem(
      buildCacheKey(coinId, currency, startDate, endDate),
      JSON.stringify(payload)
    );
  } catch {
    // Ignore storage quota errors gracefully
  }
}

export async function fetchMarketChartRange(params: {
  coinId: string;
  currency: FiatCode;
  startDate: string;
  endDate: string;
  signal?: AbortSignal;
  bypassCache?: boolean;
}): Promise<{ data: CoinGeckoMarketChartResponse; fromCache: boolean; fetchedAt: number }> {
  const { coinId, currency, startDate, endDate, signal, bypassCache = false } = params;

  if (!bypassCache) {
    const cached = readCachedChart(coinId, currency, startDate, endDate);
    if (cached) {
      return { data: cached.data, fromCache: true, fetchedAt: cached.fetchedAt };
    }
  }

  const fromSec = isoDateToStartTimestampSec(startDate);
  const toSec = isoDateToEndTimestampSec(endDate);

  const url = `https://api.coingecko.com/api/v3/coins/${encodeURIComponent(
    coinId
  )}/market_chart/range?vs_currency=${encodeURIComponent(currency)}&from=${fromSec}&to=${toSec}`;

  const timeoutController = new AbortController();
  let timedOut = false;
  const timeoutId = window.setTimeout(() => {
    timedOut = true;
    timeoutController.abort();
  }, REQUEST_TIMEOUT_MS);

  const onCallerAbort = () => timeoutController.abort();
  if (signal) {
    if (signal.aborted) {
      window.clearTimeout(timeoutId);
      throw new DOMException('Aborted', 'AbortError');
    }
    signal.addEventListener('abort', onCallerAbort, { once: true });
  }

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: timeoutController.signal,
    });
  } catch (err) {
    window.clearTimeout(timeoutId);
    signal?.removeEventListener('abort', onCallerAbort);

    if (timedOut) {
      throw new CoinGeckoApiError({
        kind: 'timeout',
        headline: UNAVAILABLE_HEADLINE,
        detail: 'The request to CoinGecko timed out after 15 seconds.',
      });
    }
    if ((err as Error)?.name === 'AbortError') {
      throw err;
    }
    throw new CoinGeckoApiError({
      kind: 'network',
      headline: UNAVAILABLE_HEADLINE,
      detail: 'Unable to establish a connection to CoinGecko.',
    });
  }

  window.clearTimeout(timeoutId);
  signal?.removeEventListener('abort', onCallerAbort);

  const textBody = await response.text();

  if (response.status === 429 || textBody.toLowerCase().includes('throttled')) {
    throw new CoinGeckoApiError({
      kind: 'rate_limit',
      headline: UNAVAILABLE_HEADLINE,
      detail: 'CoinGecko public API rate limit reached. Please wait a few moments before retrying.',
    });
  }

  let parsedJson: unknown = null;
  try {
    parsedJson = JSON.parse(textBody);
  } catch {
    // Non-JSON response
  }

  if (!response.ok) {
    const errorStatus = (
      parsedJson as { error?: { status?: { error_code?: number; error_message?: string } } }
    )?.error?.status;
    const errorCode = errorStatus?.error_code;
    const errorMsg = errorStatus?.error_message ?? '';

    if (
      errorCode === 10012 ||
      errorMsg.toLowerCase().includes('365 days') ||
      errorMsg.toLowerCase().includes('exceeds the allowed time range')
    ) {
      throw new CoinGeckoApiError({
        kind: 'range_limit_365d',
        headline: UNAVAILABLE_HEADLINE,
        detail:
          'CoinGecko’s free public API limits unauthenticated historical queries to the past 365 days. Switch to 1Y or select a Start Date within the past 365 days.',
      });
    }

    throw new CoinGeckoApiError({
      kind: 'api_error',
      headline: UNAVAILABLE_HEADLINE,
      detail:
        errorMsg || `CoinGecko returned HTTP ${response.status}. Calculations have been paused.`,
    });
  }

  if (
    !parsedJson ||
    typeof parsedJson !== 'object' ||
    !Array.isArray((parsedJson as CoinGeckoMarketChartResponse).prices)
  ) {
    throw new CoinGeckoApiError({
      kind: 'invalid_data',
      headline: UNAVAILABLE_HEADLINE,
      detail: 'Received a malformed price payload from CoinGecko.',
    });
  }

  const data = parsedJson as CoinGeckoMarketChartResponse;
  const fetchedAt = Date.now();
  writeCachedChart(coinId, currency, startDate, endDate, data, fetchedAt);

  return { data, fromCache: false, fetchedAt };
}
