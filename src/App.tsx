import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { COINS, FIAT_CURRENCIES } from './constants/market';
import {
  ApiErrorState,
  CoinGeckoMarketChartResponse,
  FiatCode,
  QuickRangeKey,
} from './types/crypto';
import { computePeriodStats, normalizeToDailySeries } from './utils/analytics';
import {
  formatCurrency,
  formatDateDDMMYYYY,
  formatPercentage,
  formatUtcTimestamp,
  getFreeTierMinStartDate,
  getQuickRangeDates,
  getTodayIsoUTC,
} from './utils/formatters';
import { CoinGeckoApiError, fetchMarketChartRange } from './services/coingecko';
import { TopBar } from './components/TopBar';
import { RiskBanner } from './components/RiskBanner';
import { ControlBar } from './components/ControlBar';
import { KpiStrip } from './components/KpiStrip';
import { AiSummaryCard } from './components/AiSummaryCard';
import { PriceVolumeCharts } from './components/PriceVolumeCharts';
import { HistoricalTable } from './components/HistoricalTable';
import { Footer } from './components/Footer';

const BANNER_STORAGE_KEY = 'crypto_data_explorer:educational_banner_dismissed';

export default function App() {
  const initialRange = useMemo(() => getQuickRangeDates('90D'), []);

  const [selectedCoinId, setSelectedCoinId] = useState<string>('bitcoin');
  const [selectedCurrency, setSelectedCurrency] = useState<FiatCode>('gbp');
  const [activeRange, setActiveRange] = useState<QuickRangeKey>('90D');
  const [startDate, setStartDate] = useState<string>(initialRange.startDate);
  const [endDate, setEndDate] = useState<string>(initialRange.endDate);

  const [bannerDismissed, setBannerDismissed] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem(BANNER_STORAGE_KEY) === '1';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  const [rawChart, setRawChart] = useState<CoinGeckoMarketChartResponse | null>(null);
  const [lastFetchedAt, setLastFetchedAt] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<ApiErrorState | null>(null);
  const [refreshNonce, setRefreshNonce] = useState<number>(0);

  const isFirstMountRef = useRef<boolean>(true);
  const bypassCacheNextRef = useRef<boolean>(false);

  const selectedCoin = useMemo(
    () => COINS.find((c) => c.id === selectedCoinId) ?? COINS[0],
    [selectedCoinId]
  );

  const selectedFiat = useMemo(
    () => FIAT_CURRENCIES.find((f) => f.code === selectedCurrency) ?? FIAT_CURRENCIES[0],
    [selectedCurrency]
  );

  const normalized = useMemo(() => {
    if (!rawChart || error) {
      return {
        series: [],
        hasInvalidPrices: false,
        invalidPriceCount: 0,
        sma7Eligible: false,
        sma7UnavailableReason: null,
      };
    }
    return normalizeToDailySeries(rawChart);
  }, [rawChart, error]);

  // If CoinGecko returned prices array but every single observation was zero/null/missing, halt calculations
  const allPricesInvalidError: ApiErrorState | null = useMemo(() => {
    if (
      !error &&
      rawChart &&
      Array.isArray(rawChart.prices) &&
      rawChart.prices.length > 0 &&
      normalized.series.length === 0 &&
      normalized.hasInvalidPrices
    ) {
      return {
        kind: 'invalid_data',
        headline: 'Live price data unavailable. Please try again.',
        detail: 'Returned price records contained only null or zero values.',
      };
    }
    return null;
  }, [error, rawChart, normalized]);

  const effectiveError = error ?? allPricesInvalidError;

  const dailySeries = effectiveError ? [] : normalized.series;
  const periodStats = useMemo(() => {
    if (effectiveError || dailySeries.length === 0) return null;
    return computePeriodStats(dailySeries, normalized.sma7Eligible);
  }, [effectiveError, dailySeries, normalized.sma7Eligible]);

  const handleDismissBanner = useCallback(() => {
    setBannerDismissed(true);
    try {
      sessionStorage.setItem(BANNER_STORAGE_KEY, '1');
    } catch {
      // Ignore storage failures
    }
  }, []);

  const handleSelectQuickRange = useCallback((range: Exclude<QuickRangeKey, 'CUSTOM'>) => {
    const dates = getQuickRangeDates(range);
    setActiveRange(range);
    setStartDate(dates.startDate);
    setEndDate(dates.endDate);
  }, []);

  const handleChangeStartDate = useCallback(
    (nextStart: string) => {
      const minStart = getFreeTierMinStartDate();
      const todayIso = getTodayIsoUTC();
      const clampedStart =
        nextStart < minStart ? minStart : nextStart > todayIso ? todayIso : nextStart;
      setActiveRange('CUSTOM');
      setStartDate(clampedStart);
      if (clampedStart > endDate) {
        setEndDate(clampedStart);
      }
    },
    [endDate]
  );

  const handleChangeEndDate = useCallback(
    (nextEnd: string) => {
      const minStart = getFreeTierMinStartDate();
      const todayIso = getTodayIsoUTC();
      const clampedEnd =
        nextEnd < minStart ? minStart : nextEnd > todayIso ? todayIso : nextEnd;
      setActiveRange('CUSTOM');
      setEndDate(clampedEnd);
      if (clampedEnd < startDate) {
        setStartDate(clampedEnd);
      }
    },
    [startDate]
  );

  const handleResetDefaults = useCallback(() => {
    const defaults = getQuickRangeDates('90D');
    setSelectedCoinId('bitcoin');
    setSelectedCurrency('gbp');
    setActiveRange('90D');
    setStartDate(defaults.startDate);
    setEndDate(defaults.endDate);
    setError(null);
  }, []);

  const handleManualRefresh = useCallback(() => {
    bypassCacheNextRef.current = true;
    setRefreshNonce((n) => n + 1);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const delayMs = isFirstMountRef.current ? 0 : 350;
    isFirstMountRef.current = false;

    const timer = window.setTimeout(async () => {
      const bypass = bypassCacheNextRef.current;
      bypassCacheNextRef.current = false;

      setLoading(true);
      setError(null);

      try {
        const result = await fetchMarketChartRange({
          coinId: selectedCoinId,
          currency: selectedCurrency,
          startDate,
          endDate,
          signal: controller.signal,
          bypassCache: bypass,
        });
        if (!controller.signal.aborted) {
          setRawChart(result.data);
          setLastFetchedAt(result.fetchedAt);
          setLoading(false);
        }
      } catch (err) {
        if ((err as Error)?.name === 'AbortError' || controller.signal.aborted) {
          return;
        }
        // Stop all calculations on failure by clearing rawChart
        setRawChart(null);
        if (err instanceof CoinGeckoApiError) {
          setError(err.state);
        } else {
          setError({
            kind: 'network',
            headline: 'Live price data unavailable. Please try again.',
            detail: 'An unexpected connection error occurred while contacting CoinGecko.',
          });
        }
        setLoading(false);
      }
    }, delayMs);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [selectedCoinId, selectedCurrency, startDate, endDate, refreshNonce]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      <TopBar onReset={handleResetDefaults} />
      <RiskBanner dismissed={bannerDismissed} onDismiss={handleDismissBanner} />

      <main className="flex-1 max-w-[1360px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        {/* Page Overview Header + Inline UTC Timestamp & Manual Refresh */}
        <section
          id="overview"
          className="flex flex-col md:flex-row md:items-end justify-between gap-4"
        >
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-blue-400">
              Educational &amp; Historical Research Overview
            </p>
            <h1 className="font-display text-xl sm:text-2xl font-semibold tracking-tight text-white text-balance">
              {selectedCoin.name} ({selectedCoin.symbol}) Historical Price Overview
            </h1>
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              <span>
                Shown in {selectedFiat.isoCode} ({selectedFiat.symbol})
              </span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">
                {formatDateDDMMYYYY(startDate)} to {formatDateDDMMYYYY(endDate)}
              </span>
              <span aria-hidden="true">·</span>
              <span className="font-mono text-xs tabular-nums">
                Last updated: {lastFetchedAt ? formatUtcTimestamp(lastFetchedAt) : 'Not fetched yet'}
              </span>
              <span aria-hidden="true">·</span>
              <button
                type="button"
                disabled={loading}
                onClick={handleManualRefresh}
                className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 hover:underline underline-offset-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded"
              >
                <RefreshCw
                  className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`}
                  aria-hidden="true"
                />
                <span>Refresh Data</span>
              </button>
            </div>
          </div>

          {periodStats && !loading && !effectiveError && (
            <div className="md:text-right shrink-0">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Most Recent Daily Price ({periodStats.latestDataDate})
              </p>
              <div className="flex items-baseline md:justify-end gap-2 mt-0.5">
                <span className="font-mono text-2xl font-bold text-slate-900 dark:text-white tabular-nums">
                  {formatCurrency(periodStats.endPrice, selectedCurrency)}
                </span>
                <span
                  className={`font-mono text-sm font-semibold tabular-nums ${
                    periodStats.pctChange > 0
                      ? 'text-emerald-700 dark:text-emerald-400'
                      : periodStats.pctChange < 0
                      ? 'text-red-700 dark:text-red-400'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {formatPercentage(periodStats.pctChange)}
                </span>
              </div>
            </div>
          )}
        </section>

        {/* Controls Bar */}
        <ControlBar
          selectedCoinId={selectedCoinId}
          onSelectCoin={setSelectedCoinId}
          selectedCurrency={selectedCurrency}
          onSelectCurrency={setSelectedCurrency}
          activeRange={activeRange}
          onSelectQuickRange={handleSelectQuickRange}
          onSelectCustomRange={() => setActiveRange('CUSTOM')}
          startDate={startDate}
          endDate={endDate}
          onChangeStartDate={handleChangeStartDate}
          onChangeEndDate={handleChangeEndDate}
        />

        {/* Clear Red Warning Banner on API Failure / Timeout / Error */}
        {effectiveError && (
          <div
            role="alert"
            className="bg-red-50 dark:bg-red-950/40 border border-red-300 dark:border-red-800/70 rounded-xl px-4 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
          >
            <div className="flex items-start gap-2.5 text-red-900 dark:text-red-100">
              <AlertCircle
                className="w-5 h-5 text-red-700 dark:text-red-400 shrink-0 mt-0.5"
                aria-hidden="true"
              />
              <div className="space-y-0.5">
                <p className="text-sm font-semibold text-red-900 dark:text-red-100">
                  {effectiveError.headline}
                </p>
                <p className="text-xs text-red-800 dark:text-red-200">{effectiveError.detail}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {effectiveError.kind === 'range_limit_365d' && (
                <button
                  type="button"
                  onClick={() => handleSelectQuickRange('1Y')}
                  className="px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500 rounded-lg transition-colors whitespace-nowrap cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                >
                  Load Past 365 Days (1Y)
                </button>
              )}
              <button
                type="button"
                onClick={handleManualRefresh}
                className="px-3.5 py-1.5 text-xs font-semibold text-red-900 dark:text-red-100 bg-white dark:bg-red-950/60 hover:bg-red-100 dark:hover:bg-red-900/60 border border-red-300 dark:border-red-700 rounded-lg transition-colors inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600"
              >
                <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Try Again</span>
              </button>
            </div>
          </div>
        )}

        {/* Partial Zero/Missing Price Data Notice */}
        {!effectiveError && normalized.hasInvalidPrices && dailySeries.length > 0 && (
          <div
            role="status"
            className="bg-amber-50 dark:bg-amber-950/35 border border-amber-200 dark:border-amber-800/60 rounded-xl px-4 py-3 text-xs text-amber-900 dark:text-amber-100"
          >
            Excluded {normalized.invalidPriceCount}{' '}
            {normalized.invalidPriceCount === 1 ? 'day' : 'days'} with zero, null, or missing
            closing prices from calculations. {normalized.sma7UnavailableReason}
          </div>
        )}

        {/* 4 Key Market Summary KPIs */}
        <KpiStrip stats={periodStats} currency={selectedCurrency} loading={loading} />

        {/* Interactive Price, Volume, and Drawdown Visualisations */}
        <PriceVolumeCharts
          series={dailySeries}
          stats={periodStats}
          coin={selectedCoin}
          currency={selectedCurrency}
          loading={loading}
          requestedStartDate={startDate}
          sma7Eligible={normalized.sma7Eligible}
          sma7UnavailableReason={normalized.sma7UnavailableReason}
        />

        {/* Grounded AI Market Summary Box */}
        <AiSummaryCard
          coin={selectedCoin}
          currency={selectedCurrency}
          stats={periodStats}
          loading={loading}
          error={effectiveError}
          hasInvalidPrices={normalized.hasInvalidPrices}
        />

        {/* Paginated Historical Data Table */}
        <HistoricalTable
          series={dailySeries}
          coin={selectedCoin}
          currency={selectedCurrency}
          loading={loading}
        />
      </main>

      <Footer />
    </div>
  );
}
