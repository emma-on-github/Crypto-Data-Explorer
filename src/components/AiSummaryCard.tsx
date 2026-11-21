import { useEffect, useState } from 'react';
import { BarChart3, Loader2, PauseCircle } from 'lucide-react';
import { ApiErrorState, CoinOption, FiatCode, PeriodStats } from '../types/crypto';

interface AiSummaryCardProps {
  coin: CoinOption;
  currency: FiatCode;
  stats: PeriodStats | null;
  loading: boolean;
  error: ApiErrorState | null;
  hasInvalidPrices: boolean;
}

export function AiSummaryCard({
  coin,
  currency,
  stats,
  loading,
  error,
  hasInvalidPrices,
}: AiSummaryCardProps) {
  const [summary, setSummary] = useState<string | null>(null);
  const [generating, setGenerating] = useState<boolean>(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // Clear stale summary whenever selection changes or data becomes invalid/errored
  useEffect(() => {
    setSummary(null);
    setAiError(null);
    setGenerating(false);
  }, [coin.id, currency, stats?.earliestDataDate, stats?.latestDataDate, error, hasInvalidPrices]);

  const isPaused = Boolean(error) || hasInvalidPrices || (!loading && !stats);
  const canGenerate = !isPaused && !loading && stats !== null && !generating;

  async function handleGenerateSummary() {
    if (!canGenerate || !stats) return;

    setGenerating(true);
    setAiError(null);

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 25_000);

    try {
      const response = await fetch('/api/market-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          coinName: coin.name,
          coinSymbol: coin.symbol,
          currency,
          earliestDate: stats.earliestDataDate,
          latestDate: stats.latestDataDate,
          dayCount: stats.dayCount,
          startPrice: stats.startPrice,
          endPrice: stats.endPrice,
          pctChange: stats.pctChange,
          highPrice: stats.highPrice,
          highDate: stats.highDate,
          lowPrice: stats.lowPrice,
          lowDate: stats.lowDate,
          avgVolume: stats.avgVolume,
          volatilityStdDev: stats.volatilityStdDev,
          volatilityLabel: stats.volatilityLabel,
          maxDrawdownPct: stats.maxDrawdownPct,
          sma7Valid: stats.sma7Eligible,
          latestSma7: stats.latestSma7,
        }),
      });

      const rawText = await response.text();
      let payload: { summary?: string; error?: string } | null = null;
      try {
        payload = JSON.parse(rawText) as { summary?: string; error?: string };
      } catch {
        payload = null;
      }

      if (response.status === 404 || response.status === 405) {
        setAiError(
          'The summary endpoint (/api/market-summary) is not available on this host. Make sure the Node/Express server is running (static hosts such as GitHub Pages do not run server-side routes).'
        );
      } else if (!response.ok || !payload?.summary) {
        setAiError(payload?.error || `Unable to generate summary at this time (HTTP ${response.status}).`);
      } else {
        setSummary(payload.summary);
      }
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') {
        setAiError('The summary request timed out. Please try again.');
      } else {
        setAiError('Unable to reach the summary service. Please try again.');
      }
    } finally {
      window.clearTimeout(timeoutId);
      setGenerating(false);
    }
  }

  return (
    <section
      aria-label="Plain-English historical summary"
      aria-disabled={isPaused}
      className={`border rounded-xl p-4 sm:p-5 transition-colors ${
        isPaused
          ? 'bg-slate-900/50 border-slate-800 text-slate-400'
          : 'bg-slate-900 border-slate-800 text-slate-100'
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          {isPaused ? (
            <PauseCircle className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />
          ) : (
            <BarChart3 className="w-4 h-4 text-blue-400 shrink-0" aria-hidden="true" />
          )}
          <div>
            <h2 className="font-display text-sm font-semibold text-white">
              Plain-English Summary
            </h2>
            <p className="text-xs text-slate-400">
              Neutral recap of past historical figures for education and research · Not financial
              advice
            </p>
          </div>
        </div>

        <button
          type="button"
          disabled={!canGenerate}
          onClick={handleGenerateSummary}
          className="px-4 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer bg-blue-600 text-white hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed inline-flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
        >
          {generating && <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />}
          <span>{generating ? 'Writing Summary...' : 'Explain This Period'}</span>
        </button>
      </div>

      <div className="mt-3 pt-3 border-t border-slate-800 text-sm leading-relaxed">
        {isPaused ? (
          <p className="text-xs sm:text-sm font-medium text-slate-400">
            Analysis paused until valid price data is restored.
          </p>
        ) : loading ? (
          <p className="text-xs sm:text-sm text-slate-400">
            Waiting for verified price records to finish loading...
          </p>
        ) : aiError ? (
          <p className="text-xs sm:text-sm text-red-400">{aiError}</p>
        ) : summary ? (
          <p className="text-slate-200">{summary}</p>
        ) : (
          <p className="text-xs sm:text-sm text-slate-400">
            Click <span className="font-medium text-slate-200">Explain This Period</span> to read a
            neutral, beginner-friendly recap of {coin.name} ({coin.symbol}) based strictly on the
            past figures shown above.
          </p>
        )}
      </div>
    </section>
  );
}
