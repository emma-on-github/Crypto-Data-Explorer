import { useEffect, useMemo, useRef, useState } from 'react';
import { ExternalLink, Info, Loader2 } from 'lucide-react';
import { CoinOption, DailyDataPoint, FiatCode, PeriodStats } from '../types/crypto';
import { formatCurrency, formatPercentage, formatVolumeOrCap } from '../utils/formatters';

interface PriceVolumeChartsProps {
  series: DailyDataPoint[];
  stats: PeriodStats | null;
  coin: CoinOption;
  currency: FiatCode;
  loading: boolean;
  requestedStartDate: string;
  sma7Eligible: boolean;
  sma7UnavailableReason: string | null;
}

type ChartTab = 'price_volume' | 'drawdown';

export function PriceVolumeCharts({
  series,
  stats,
  coin,
  currency,
  loading,
  requestedStartDate,
  sma7Eligible,
  sma7UnavailableReason,
}: PriceVolumeChartsProps) {
  const [activeTab, setActiveTab] = useState<ChartTab>('price_volume');
  const [showSma7, setShowSma7] = useState(true);
  const [showSma30, setShowSma30] = useState(false);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [containerWidth, setContainerWidth] = useState<number>(960);
  const [smaInfoOpen, setSmaInfoOpen] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const smaInfoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const updateWidth = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0) setContainerWidth(Math.floor(rect.width));
    };
    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    setHoverIndex(null);
  }, [series, activeTab]);

  useEffect(() => {
    if (!smaInfoOpen) return;
    function handleOutside(e: MouseEvent) {
      if (smaInfoRef.current && !smaInfoRef.current.contains(e.target as Node)) {
        setSmaInfoOpen(false);
      }
    }
    function handleEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') setSmaInfoOpen(false);
    }
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [smaInfoOpen]);

  const padLeft = 14;
  const padRight = containerWidth < 540 ? 72 : 92;
  const plotWidth = Math.max(120, containerWidth - padLeft - padRight);

  const xForIndex = (idx: number) => {
    if (series.length <= 1) return padLeft + plotWidth / 2;
    return padLeft + (idx / (series.length - 1)) * plotWidth;
  };

  const handlePointerMove = (clientX: number, targetEl: SVGSVGElement) => {
    if (series.length === 0) return;
    const rect = targetEl.getBoundingClientRect();
    const relX = clientX - rect.left - padLeft;
    const ratio = Math.max(0, Math.min(1, relX / plotWidth));
    const idx = Math.round(ratio * Math.max(0, series.length - 1));
    setHoverIndex(idx);
  };

  // Price chart vertical bounds (include enabled SMAs so lines never clip)
  const priceBounds = useMemo(() => {
    if (series.length === 0) return { min: 0, max: 100 };
    let min = Infinity;
    let max = -Infinity;
    for (const pt of series) {
      if (pt.price < min) min = pt.price;
      if (pt.price > max) max = pt.price;
      if (showSma7 && sma7Eligible && pt.sma7 !== null) {
        if (pt.sma7 < min) min = pt.sma7;
        if (pt.sma7 > max) max = pt.sma7;
      }
      if (showSma30 && pt.sma30 !== null) {
        if (pt.sma30 < min) min = pt.sma30;
        if (pt.sma30 > max) max = pt.sma30;
      }
    }
    if (min === max) {
      const delta = min === 0 ? 1 : Math.abs(min) * 0.05;
      return { min: Math.max(0, min - delta), max: max + delta };
    }
    const span = max - min;
    return {
      min: Math.max(0, min - span * 0.08),
      max: max + span * 0.08,
    };
  }, [series, showSma7, sma7Eligible, showSma30]);

  const maxVolume = useMemo(() => {
    let m = 0;
    for (const pt of series) {
      if (pt.volume > m) m = pt.volume;
    }
    return m > 0 ? m * 1.12 : 1;
  }, [series]);

  const minDrawdown = useMemo(() => {
    let m = 0;
    for (const pt of series) {
      if (pt.drawdownPct < m) m = pt.drawdownPct;
    }
    return Math.min(-5, m * 1.12);
  }, [series]);

  // X-axis tick indices (5-6 evenly spaced dates)
  const xTickIndices = useMemo(() => {
    if (series.length === 0) return [];
    if (series.length === 1) return [0];
    const desiredTicks = containerWidth < 540 ? 4 : 6;
    const count = Math.min(desiredTicks, series.length);
    const indices: number[] = [];
    for (let i = 0; i < count; i++) {
      indices.push(Math.round((i / (count - 1)) * (series.length - 1)));
    }
    return Array.from(new Set(indices));
  }, [series.length, containerWidth]);

  // Dimensions
  const priceHeight = 310;
  const pricePadTop = 16;
  const pricePadBottom = 16;
  const pricePlotH = priceHeight - pricePadTop - pricePadBottom;

  const volHeight = 148;
  const volPadTop = 14;
  const volPadBottom = 28;
  const volPlotH = volHeight - volPadTop - volPadBottom;

  const ddHeight = 380;
  const ddPadTop = 20;
  const ddPadBottom = 30;
  const ddPlotH = ddHeight - ddPadTop - ddPadBottom;

  const yForPrice = (val: number) => {
    const ratio = (val - priceBounds.min) / (priceBounds.max - priceBounds.min || 1);
    return pricePadTop + (1 - ratio) * pricePlotH;
  };

  const yForVol = (val: number) => {
    const ratio = val / (maxVolume || 1);
    return volPadTop + (1 - ratio) * volPlotH;
  };

  const yForDrawdown = (pct: number) => {
    // 0% is at ddPadTop, minDrawdown is at ddPadTop + ddPlotH
    const ratio = pct / (minDrawdown || -1);
    return ddPadTop + Math.max(0, Math.min(1, ratio)) * ddPlotH;
  };

  const priceLinePath = useMemo(() => {
    if (series.length === 0) return '';
    return series
      .map((pt, i) => `${i === 0 ? 'M' : 'L'} ${xForIndex(i).toFixed(2)} ${yForPrice(pt.price).toFixed(2)}`)
      .join(' ');
  }, [series, plotWidth, priceBounds]);

  const priceAreaPath = useMemo(() => {
    if (series.length === 0) return '';
    const bottomY = (pricePadTop + pricePlotH).toFixed(2);
    const firstX = xForIndex(0).toFixed(2);
    const lastX = xForIndex(series.length - 1).toFixed(2);
    return `${priceLinePath} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;
  }, [priceLinePath, series.length, plotWidth]);

  const buildSmaPath = (getter: (pt: DailyDataPoint) => number | null) => {
    let path = '';
    let started = false;
    series.forEach((pt, i) => {
      const val = getter(pt);
      if (val === null) {
        started = false;
        return;
      }
      const x = xForIndex(i).toFixed(2);
      const y = yForPrice(val).toFixed(2);
      path += `${started ? ' L' : 'M'} ${x} ${y}`;
      started = true;
    });
    return path.trim();
  };

  const sma7Path = useMemo(
    () => (showSma7 && sma7Eligible ? buildSmaPath((p) => p.sma7) : ''),
    [series, showSma7, sma7Eligible, plotWidth, priceBounds]
  );

  const sma30Path = useMemo(() => (showSma30 ? buildSmaPath((p) => p.sma30) : ''), [
    series,
    showSma30,
    plotWidth,
    priceBounds,
  ]);

  const drawdownLinePath = useMemo(() => {
    if (series.length === 0) return '';
    return series
      .map(
        (pt, i) =>
          `${i === 0 ? 'M' : 'L'} ${xForIndex(i).toFixed(2)} ${yForDrawdown(pt.drawdownPct).toFixed(2)}`
      )
      .join(' ');
  }, [series, plotWidth, minDrawdown]);

  const drawdownAreaPath = useMemo(() => {
    if (series.length === 0) return '';
    const zeroY = yForDrawdown(0).toFixed(2);
    const firstX = xForIndex(0).toFixed(2);
    const lastX = xForIndex(series.length - 1).toFixed(2);
    return `${drawdownLinePath} L ${lastX} ${zeroY} L ${firstX} ${zeroY} Z`;
  }, [drawdownLinePath, series.length, plotWidth, minDrawdown]);

  const activePoint = hoverIndex !== null ? series[hoverIndex] ?? null : null;
  const activeX = hoverIndex !== null ? xForIndex(hoverIndex) : 0;

  // Check if coin launched after requestedStartDate
  const partialHistoryNotice = useMemo(() => {
    if (series.length === 0) return null;
    const firstIso = series[0].isoDate;
    if (firstIso > requestedStartDate) {
      // Only show if gap > 2 days
      const diffMs = Date.parse(firstIso) - Date.parse(requestedStartDate);
      if (diffMs > 2 * 86400 * 1000) {
        return `Earliest available ${coin.symbol} data in this window begins on ${series[0].displayDate}.`;
      }
    }
    return null;
  }, [series, requestedStartDate, coin.symbol]);

  const priceTicks = useMemo(() => {
    const steps = 4;
    const ticks: number[] = [];
    for (let i = 0; i <= steps; i++) {
      ticks.push(priceBounds.min + (i / steps) * (priceBounds.max - priceBounds.min));
    }
    return ticks;
  }, [priceBounds]);

  const volTicks = useMemo(() => [0, maxVolume * 0.5, maxVolume * 0.92], [maxVolume]);

  const ddTicks = useMemo(() => {
    const steps = 4;
    const ticks: number[] = [];
    for (let i = 0; i <= steps; i++) {
      ticks.push((i / steps) * minDrawdown);
    }
    return ticks;
  }, [minDrawdown]);

  const hasSma7Points = series.some((pt) => pt.sma7 !== null);
  const hasSma30Points = series.some((pt) => pt.sma30 !== null);

  return (
    <section
      id="charts"
      aria-label="Interactive historical price, trading activity, and drops from high charts"
      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-6 transition-colors"
    >
      {/* Chart Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div>
          <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
            <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
              {coin.name} ({coin.symbol}) Price History
            </h2>
            {stats && (
              <span className="text-xs font-mono text-slate-500 dark:text-slate-400 tabular-nums">
                {stats.earliestDataDate} – {stats.latestDataDate} · {stats.dayCount} daily records
              </span>
            )}
          </div>
          {partialHistoryNotice && (
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {partialHistoryNotice}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Moving Average Overlay Toggles (visible on Price & Activity tab) */}
          {activeTab === 'price_volume' && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-pressed={showSma7 && sma7Eligible}
                disabled={series.length > 0 && !sma7Eligible}
                onClick={() => setShowSma7((v) => !v)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
                  showSma7 && sma7Eligible
                    ? 'bg-amber-50 dark:bg-amber-950/50 border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                }`}
              >
                <span
                  className="w-2.5 h-0.5 bg-amber-600 dark:bg-amber-400 inline-block rounded-full"
                  aria-hidden="true"
                />
                <span>7-Day Average</span>
              </button>
              <button
                type="button"
                aria-pressed={showSma30}
                onClick={() => setShowSma30((v) => !v)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
                  showSma30
                    ? 'bg-teal-50 dark:bg-teal-950/50 border-teal-300 dark:border-teal-700 text-teal-900 dark:text-teal-200'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                }`}
              >
                <span
                  className="w-2.5 h-0.5 bg-teal-600 dark:bg-teal-400 inline-block rounded-full"
                  aria-hidden="true"
                />
                <span>30-Day Average</span>
              </button>

              {/* Plain-English Average Info Icon & Popover */}
              <div
                ref={smaInfoRef}
                className="relative"
                onMouseEnter={() => setSmaInfoOpen(true)}
                onMouseLeave={() => setSmaInfoOpen(false)}
              >
                <button
                  type="button"
                  aria-label="What do 7-Day Average and 30-Day Average mean?"
                  aria-expanded={smaInfoOpen}
                  onClick={() => setSmaInfoOpen((open) => !open)}
                  className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                >
                  <Info className="w-4 h-4" aria-hidden="true" />
                </button>

                {smaInfoOpen && (
                  <div
                    role="tooltip"
                    className="absolute right-0 sm:left-0 sm:right-auto z-30 mt-1.5 w-72 sm:w-80 bg-slate-900 dark:bg-slate-800 text-white rounded-xl p-3.5 shadow-lg border border-slate-700/80 text-xs leading-relaxed space-y-2"
                  >
                    <p className="font-semibold text-slate-100">
                      What are multi-day averages?
                    </p>
                    <div>
                      <p className="font-medium text-amber-300">7-Day Average (7D SMA)</p>
                      <p className="text-slate-300">
                        The average end-of-day price over the last 7 days. It smooths out small
                        day-to-day bumps so short-term direction is easier to see.
                      </p>
                    </div>
                    <div>
                      <p className="font-medium text-teal-300">30-Day Average (30D SMA)</p>
                      <p className="text-slate-300">
                        The average end-of-day price over the last 30 days. It filters out daily
                        noise to show the bigger trend over a month.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* View Tabs: Price & Activity vs Drops from Peak */}
          <div
            role="tablist"
            aria-label="Chart view mode"
            className="inline-flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'price_volume'}
              onClick={() => setActiveTab('price_volume')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
                activeTab === 'price_volume'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-semibold'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Price &amp; Activity
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'drawdown'}
              onClick={() => setActiveTab('drawdown')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
                activeTab === 'drawdown'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-semibold'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Drops from Peak
            </button>
          </div>
        </div>
      </div>

      {/* 7-Day Average Completeness Notice */}
      {activeTab === 'price_volume' && !loading && series.length > 0 && !sma7Eligible && (
        <div
          role="status"
          className="mt-4 text-xs font-medium text-amber-900 dark:text-amber-100 bg-amber-50/80 dark:bg-amber-950/35 border border-amber-200 dark:border-amber-800/60 rounded-lg px-3.5 py-2"
        >
          {sma7UnavailableReason ?? 'Insufficient historical data to calculate 7-Day Average (7D SMA).'}
        </div>
      )}

      {/* Drops from Peak Context Strip */}
      {activeTab === 'drawdown' && stats && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 rounded-lg px-3.5 py-2.5">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span>
              Biggest Drop from High:{' '}
              <span className="font-mono font-semibold text-red-700 dark:text-red-400 tabular-nums">
                {formatPercentage(stats.maxDrawdownPct, { signed: false })}
              </span>
            </span>
            <span aria-hidden="true" className="text-slate-300 dark:text-slate-600">
              ·
            </span>
            <span className="font-mono tabular-nums">
              Highest {stats.maxDrawdownPeakDate} to Lowest {stats.maxDrawdownTroughDate}
            </span>
          </div>
          <span className="text-slate-400">
            Shows how far the price sat below its highest point reached so far within these dates
          </span>
        </div>
      )}

      {/* Chart Canvas Area */}
      <div ref={containerRef} className="relative mt-4 select-none">
        {loading && (
          <div
            role="status"
            aria-live="polite"
            className="h-[460px] flex flex-col items-center justify-center gap-3 text-slate-500 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-800/30 rounded-lg border border-dashed border-slate-200 dark:border-slate-800"
          >
            <Loader2
              className="w-7 h-7 animate-spin text-blue-700 dark:text-blue-400"
              aria-hidden="true"
            />
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
              Fetching {coin.name} historical data in {currency.toUpperCase()}...
            </p>
          </div>
        )}

        {!loading && series.length === 0 && (
          <div className="h-[360px] flex flex-col items-center justify-center gap-2 text-center px-6 bg-slate-50/60 dark:bg-slate-800/30 rounded-lg border border-dashed border-slate-200 dark:border-slate-800">
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              No historical price data available for this selection
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md">
              {coin.name} may not have launched during the chosen dates, or CoinGecko returned no
              records for this timeframe. Try adjusting the Start Date or selecting a preset like
              90D or 1Y.
            </p>
          </div>
        )}

        {!loading && series.length > 0 && (
          <div className="relative">
            {/* Floating Hover Tooltip */}
            {activePoint && (
              <div
                style={{
                  left:
                    activeX > containerWidth * 0.58
                      ? Math.max(8, activeX - 244)
                      : Math.min(containerWidth - 248, activeX + 14),
                  top: 10,
                }}
                className="pointer-events-none absolute z-20 w-56 bg-slate-900/95 text-white rounded-lg p-3 shadow-lg border border-slate-700/80 text-xs"
              >
                <p className="font-mono font-semibold text-slate-200 pb-1.5 mb-1.5 border-b border-slate-700/80 tabular-nums">
                  {activePoint.displayDate}
                </p>

                {activeTab === 'price_volume' ? (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-400">End-of-Day Price</span>
                      <span className="font-mono font-semibold text-white tabular-nums">
                        {formatCurrency(activePoint.price, currency)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-400">Daily Change</span>
                      <span
                        className={`font-mono font-medium tabular-nums ${
                          activePoint.dailyChangePct === null
                            ? 'text-slate-400'
                            : activePoint.dailyChangePct > 0
                            ? 'text-emerald-400'
                            : activePoint.dailyChangePct < 0
                            ? 'text-red-400'
                            : 'text-slate-300'
                        }`}
                      >
                        {formatPercentage(activePoint.dailyChangePct)}
                      </span>
                    </div>
                    {showSma7 && sma7Eligible && activePoint.sma7 !== null && (
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-amber-300">7-Day Average</span>
                        <span className="font-mono text-amber-200 tabular-nums">
                          {formatCurrency(activePoint.sma7, currency)}
                        </span>
                      </div>
                    )}
                    {showSma30 && activePoint.sma30 !== null && (
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-teal-300">30-Day Average</span>
                        <span className="font-mono text-teal-200 tabular-nums">
                          {formatCurrency(activePoint.sma30, currency)}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between gap-2 pt-1 mt-1 border-t border-slate-700/70">
                      <span className="text-slate-400">24h Activity</span>
                      <span className="font-mono text-slate-200 tabular-nums">
                        {formatVolumeOrCap(activePoint.volume, currency, true)}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-400">Drop from High</span>
                      <span className="font-mono font-semibold text-red-400 tabular-nums">
                        {formatPercentage(activePoint.drawdownPct, { signed: false })}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-400">End-of-Day Price</span>
                      <span className="font-mono text-white tabular-nums">
                        {formatCurrency(activePoint.price, currency)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-400">Highest Price So Far</span>
                      <span className="font-mono text-slate-300 tabular-nums">
                        {formatCurrency(activePoint.peakPrice, currency)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'price_volume' ? (
              <div>
                {/* Main Price & Trend Chart */}
                <svg
                  width={containerWidth}
                  height={priceHeight}
                  viewBox={`0 0 ${containerWidth} ${priceHeight}`}
                  role="img"
                  aria-label={`${coin.name} end-of-day price chart in ${currency.toUpperCase()}`}
                  className="block overflow-visible touch-pan-y cursor-crosshair"
                  onMouseMove={(e) => handlePointerMove(e.clientX, e.currentTarget)}
                  onMouseLeave={() => setHoverIndex(null)}
                  onTouchMove={(e) => {
                    if (e.touches[0]) handlePointerMove(e.touches[0].clientX, e.currentTarget);
                  }}
                >
                  <defs>
                    <linearGradient id="explorerPriceFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#1D4ED8" stopOpacity="0.16" />
                      <stop offset="100%" stopColor="#1D4ED8" stopOpacity="0.01" />
                    </linearGradient>
                  </defs>

                  {/* Horizontal Gridlines & Right Y-Axis */}
                  {priceTicks.map((tick, idx) => {
                    const y = yForPrice(tick);
                    return (
                      <g key={idx}>
                        <line
                          x1={padLeft}
                          y1={y}
                          x2={padLeft + plotWidth}
                          y2={y}
                          className="stroke-slate-200 dark:stroke-slate-800"
                          strokeDasharray={idx === 0 ? undefined : '3 3'}
                          strokeWidth={1}
                        />
                        <text
                          x={padLeft + plotWidth + 8}
                          y={y + 3.5}
                          className="fill-slate-500 dark:fill-slate-400 text-[10px] font-mono tabular-nums"
                        >
                          {formatCurrency(tick, currency, { compact: tick >= 100_000 })}
                        </text>
                      </g>
                    );
                  })}

                  {/* Price Area & Line */}
                  <path d={priceAreaPath} fill="url(#explorerPriceFill)" />
                  <path
                    d={priceLinePath}
                    fill="none"
                    className="stroke-blue-700 dark:stroke-blue-400"
                    strokeWidth={2}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />

                  {/* SMA Overlays */}
                  {showSma7 && sma7Path && (
                    <path
                      d={sma7Path}
                      fill="none"
                      stroke="#D97706"
                      strokeWidth={1.6}
                      strokeLinejoin="round"
                    />
                  )}
                  {showSma30 && sma30Path && (
                    <path
                      d={sma30Path}
                      fill="none"
                      stroke="#0D9488"
                      strokeWidth={1.6}
                      strokeLinejoin="round"
                    />
                  )}

                  {/* Active Crosshair & Point Markers */}
                  {activePoint && hoverIndex !== null && (
                    <g>
                      <line
                        x1={activeX}
                        y1={pricePadTop}
                        x2={activeX}
                        y2={priceHeight}
                        className="stroke-slate-400 dark:stroke-slate-600"
                        strokeDasharray="3 3"
                        strokeWidth={1}
                      />
                      <circle
                        cx={activeX}
                        cy={yForPrice(activePoint.price)}
                        r={4.5}
                        className="fill-blue-700 dark:fill-blue-400 stroke-white dark:stroke-slate-900"
                        strokeWidth={2}
                      />
                      {showSma7 && sma7Eligible && activePoint.sma7 !== null && (
                        <circle
                          cx={activeX}
                          cy={yForPrice(activePoint.sma7)}
                          r={3.5}
                          fill="#D97706"
                          className="stroke-white dark:stroke-slate-900"
                          strokeWidth={1.5}
                        />
                      )}
                      {showSma30 && activePoint.sma30 !== null && (
                        <circle
                          cx={activeX}
                          cy={yForPrice(activePoint.sma30)}
                          r={3.5}
                          fill="#0D9488"
                          className="stroke-white dark:stroke-slate-900"
                          strokeWidth={1.5}
                        />
                      )}
                    </g>
                  )}
                </svg>

                {/* Synchronized Trading Activity Bar Chart */}
                <div className="pt-1 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 pt-1">
                    <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300">
                      Daily 24h Trading Activity ({currency.toUpperCase()})
                    </span>
                    <span className="text-[11px] text-slate-400 dark:text-slate-500">
                      Total value bought and sold each day (higher bars = busier trading day)
                    </span>
                  </div>
                  <svg
                    width={containerWidth}
                    height={volHeight}
                    viewBox={`0 0 ${containerWidth} ${volHeight}`}
                    role="img"
                    aria-label={`${coin.name} daily trading activity bar chart in ${currency.toUpperCase()}`}
                    className="block overflow-visible touch-pan-y cursor-crosshair"
                    onMouseMove={(e) => handlePointerMove(e.clientX, e.currentTarget)}
                    onMouseLeave={() => setHoverIndex(null)}
                    onTouchMove={(e) => {
                      if (e.touches[0]) handlePointerMove(e.touches[0].clientX, e.currentTarget);
                    }}
                  >
                    {/* Volume Horizontal Gridlines */}
                    {volTicks.map((tick, idx) => {
                      const y = yForVol(tick);
                      return (
                        <g key={idx}>
                          <line
                            x1={padLeft}
                            y1={y}
                            x2={padLeft + plotWidth}
                            y2={y}
                            className="stroke-slate-200 dark:stroke-slate-800"
                            strokeDasharray={idx === 0 ? undefined : '3 3'}
                            strokeWidth={1}
                          />
                          {idx > 0 && (
                            <text
                              x={padLeft + plotWidth + 8}
                              y={y + 3.5}
                              className="fill-slate-500 dark:fill-slate-400 text-[10px] font-mono tabular-nums"
                            >
                              {formatVolumeOrCap(tick, currency, true)}
                            </text>
                          )}
                        </g>
                      );
                    })}

                    {/* Volume Bars */}
                    {series.map((pt, i) => {
                      const barSlot = plotWidth / Math.max(1, series.length);
                      const barW = Math.max(1.5, Math.min(18, barSlot * 0.68));
                      const cx = xForIndex(i);
                      const topY = yForVol(pt.volume);
                      const baseY = volPadTop + volPlotH;
                      const barH = Math.max(1, baseY - topY);
                      const isHovered = hoverIndex === i;

                      return (
                        <rect
                          key={pt.isoDate}
                          x={cx - barW / 2}
                          y={topY}
                          width={barW}
                          height={barH}
                          rx={1}
                          className={
                            isHovered
                              ? 'fill-blue-700 dark:fill-blue-400'
                              : 'fill-slate-400 dark:fill-slate-600'
                          }
                          opacity={isHovered ? 0.95 : 0.65}
                        />
                      );
                    })}

                    {/* Synchronized Crosshair */}
                    {hoverIndex !== null && (
                      <line
                        x1={activeX}
                        y1={0}
                        x2={activeX}
                        y2={volPadTop + volPlotH}
                        className="stroke-slate-400 dark:stroke-slate-600"
                        strokeDasharray="3 3"
                        strokeWidth={1}
                      />
                    )}

                    {/* X-Axis Date Labels */}
                    {xTickIndices.map((idx) => {
                      const pt = series[idx];
                      if (!pt) return null;
                      const x = xForIndex(idx);
                      const anchor =
                        idx === 0 ? 'start' : idx === series.length - 1 ? 'end' : 'middle';
                      return (
                        <text
                          key={pt.isoDate}
                          x={x}
                          y={volHeight - 6}
                          textAnchor={anchor}
                          className="fill-slate-500 dark:fill-slate-400 text-[10px] font-mono tabular-nums"
                        >
                          {pt.displayDate}
                        </text>
                      );
                    })}
                  </svg>
                </div>
              </div>
            ) : (
              /* Drops from Peak Chart */
              <svg
                width={containerWidth}
                height={ddHeight}
                viewBox={`0 0 ${containerWidth} ${ddHeight}`}
                role="img"
                aria-label={`${coin.name} percentage drop from peak chart`}
                className="block overflow-visible touch-pan-y cursor-crosshair"
                onMouseMove={(e) => handlePointerMove(e.clientX, e.currentTarget)}
                onMouseLeave={() => setHoverIndex(null)}
                onTouchMove={(e) => {
                  if (e.touches[0]) handlePointerMove(e.touches[0].clientX, e.currentTarget);
                }}
              >
                <defs>
                  <linearGradient id="explorerDrawdownFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#DC2626" stopOpacity="0.06" />
                    <stop offset="100%" stopColor="#DC2626" stopOpacity="0.24" />
                  </linearGradient>
                </defs>

                {ddTicks.map((tick, idx) => {
                  const y = yForDrawdown(tick);
                  return (
                    <g key={idx}>
                      <line
                        x1={padLeft}
                        y1={y}
                        x2={padLeft + plotWidth}
                        y2={y}
                        className={
                          idx === 0
                            ? 'stroke-slate-300 dark:stroke-slate-700'
                            : 'stroke-slate-200 dark:stroke-slate-800'
                        }
                        strokeDasharray={idx === 0 ? undefined : '3 3'}
                        strokeWidth={1}
                      />
                      <text
                        x={padLeft + plotWidth + 8}
                        y={y + 3.5}
                        className="fill-slate-500 dark:fill-slate-400 text-[10px] font-mono tabular-nums"
                      >
                        {tick.toFixed(1)}%
                      </text>
                    </g>
                  );
                })}

                <path d={drawdownAreaPath} fill="url(#explorerDrawdownFill)" />
                <path
                  d={drawdownLinePath}
                  fill="none"
                  className="stroke-red-600 dark:stroke-red-400"
                  strokeWidth={2}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />

                {activePoint && hoverIndex !== null && (
                  <g>
                    <line
                      x1={activeX}
                      y1={ddPadTop}
                      x2={activeX}
                      y2={ddPadTop + ddPlotH}
                      className="stroke-slate-400 dark:stroke-slate-600"
                      strokeDasharray="3 3"
                      strokeWidth={1}
                    />
                    <circle
                      cx={activeX}
                      cy={yForDrawdown(activePoint.drawdownPct)}
                      r={4.5}
                      className="fill-red-600 dark:fill-red-400 stroke-white dark:stroke-slate-900"
                      strokeWidth={2}
                    />
                  </g>
                )}

                {xTickIndices.map((idx) => {
                  const pt = series[idx];
                  if (!pt) return null;
                  const x = xForIndex(idx);
                  const anchor =
                    idx === 0 ? 'start' : idx === series.length - 1 ? 'end' : 'middle';
                  return (
                    <text
                      key={pt.isoDate}
                      x={x}
                      y={ddHeight - 6}
                      textAnchor={anchor}
                      className="fill-slate-500 dark:fill-slate-400 text-[10px] font-mono tabular-nums"
                    >
                      {pt.displayDate}
                    </text>
                  );
                })}
              </svg>
            )}
          </div>
        )}
      </div>

      {/* Chart Footer: Legend + Mandatory CoinGecko Attribution */}
      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          {activeTab === 'price_volume' ? (
            <>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-blue-700 dark:bg-blue-400 inline-block" aria-hidden="true" />
                End-of-Day Price
              </span>
              {showSma7 && (
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-3 h-0.5 bg-amber-600 inline-block" aria-hidden="true" />
                  {sma7Eligible && hasSma7Points
                    ? '7-Day Average'
                    : sma7UnavailableReason ?? 'Insufficient historical data to calculate 7-Day Average (7D SMA).'}
                </span>
              )}
              {showSma30 && (
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-3 h-0.5 bg-teal-600 inline-block" aria-hidden="true" />
                  30-Day Average {!hasSma30Points && series.length > 0 ? '(needs 30+ days)' : ''}
                </span>
              )}
            </>
          ) : (
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-red-600 dark:bg-red-400 inline-block" aria-hidden="true" />
              Drop from Highest Point (%)
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          <span>Historical market data powered by</span>
          <a
            href="https://www.coingecko.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-medium text-slate-200 hover:text-blue-400 underline underline-offset-2"
          >
            <span>CoinGecko</span>
            <ExternalLink className="w-3 h-3" aria-hidden="true" />
          </a>
        </div>
      </div>
    </section>
  );
}
