import { useState } from 'react';
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  HelpCircle,
  Minus,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import { FiatCode, PeriodStats } from '../types/crypto';
import { formatCurrency, formatPercentage, formatVolumeOrCap } from '../utils/formatters';

interface KpiStripProps {
  stats: PeriodStats | null;
  currency: FiatCode;
  loading: boolean;
}

function HelperHint({ text }: { text: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className="relative inline-flex items-center"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        aria-label="What does this mean?"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
      >
        <HelpCircle className="w-3.5 h-3.5" aria-hidden="true" />
      </button>
      {open && (
        <div
          role="tooltip"
          className="absolute right-0 top-full mt-1.5 z-30 w-56 bg-slate-900 dark:bg-slate-800 text-white text-xs leading-relaxed rounded-lg p-2.5 shadow-lg border border-slate-700/80"
        >
          {text}
        </div>
      )}
    </div>
  );
}

export function KpiStrip({ stats, currency, loading }: KpiStripProps) {
  if (loading) {
    return (
      <section
        aria-label="Key summary loading"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {[0, 1, 2, 3].map((idx) => (
          <div
            key={idx}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 animate-pulse"
          >
            <div className="h-3.5 w-32 bg-slate-200 dark:bg-slate-800 rounded mb-3" />
            <div className="h-7 w-36 bg-slate-200 dark:bg-slate-800 rounded mb-2" />
            <div className="h-3.5 w-40 bg-slate-100 dark:bg-slate-800/60 rounded" />
          </div>
        ))}
      </section>
    );
  }

  if (!stats) {
    return (
      <section
        aria-label="Key summary empty"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {[
          'Overall Price Change',
          'Highest & Lowest Price',
          'Average Daily Trading Activity',
          'Typical Daily Price Swings',
        ].map((title) => (
          <div
            key={title}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5"
          >
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">{title}</p>
            <p className="font-mono text-2xl font-semibold text-slate-300 dark:text-slate-600 tabular-nums">
              —
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1.5">
              No records in selected dates
            </p>
          </div>
        ))}
      </section>
    );
  }

  const isPositive = stats.pctChange > 0;
  const isNegative = stats.pctChange < 0;

  const returnColorClass = isPositive
    ? 'text-emerald-700 dark:text-emerald-400'
    : isNegative
    ? 'text-red-700 dark:text-red-400'
    : 'text-slate-700 dark:text-slate-300';

  const swingStyles = {
    Calm: {
      text: 'text-emerald-700 dark:text-emerald-400',
      label: 'Calm',
      desc: 'Usually moves less than 2% per day',
      Icon: ShieldCheck,
    },
    'Moderate Swings': {
      text: 'text-amber-700 dark:text-amber-400',
      label: 'Moderate Swings',
      desc: 'Typically moves 2% to 5% per day',
      Icon: Activity,
    },
    'Large Swings': {
      text: 'text-red-700 dark:text-red-400',
      label: 'Large Swings',
      desc: 'Typically moves over 5% per day',
      Icon: ShieldAlert,
    },
    'Insufficient Data': {
      text: 'text-slate-600 dark:text-slate-400',
      label: 'Not Enough Days',
      desc: 'Needs at least 3 days of records',
      Icon: Activity,
    },
  }[stats.volatilityLabel];

  const SwingIcon = swingStyles.Icon;

  return (
    <section
      aria-label="Historical period summary"
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
    >
      {/* 1. Overall Price Change */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex flex-col justify-between transition-colors">
        <div>
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Overall Price Change
            </p>
            <HelperHint text="How much the end-of-day price rose or fell between your start date and end date." />
          </div>
          <div
            className={`mt-2 flex items-center gap-1.5 font-mono text-2xl font-semibold tabular-nums ${returnColorClass}`}
          >
            {isPositive && <ArrowUpRight className="w-5 h-5 shrink-0" aria-hidden="true" />}
            {isNegative && <ArrowDownRight className="w-5 h-5 shrink-0" aria-hidden="true" />}
            {!isPositive && !isNegative && <Minus className="w-5 h-5 shrink-0" aria-hidden="true" />}
            <span>{formatPercentage(stats.pctChange)}</span>
          </div>
        </div>
        <p className="mt-2.5 text-xs font-mono text-slate-600 dark:text-slate-300 tabular-nums">
          {formatCurrency(stats.absChange, currency, { signed: true })}{' '}
          <span className="font-sans text-slate-400 dark:text-slate-500">
            ({stats.earliestDataDate} to {stats.latestDataDate})
          </span>
        </p>
      </div>

      {/* 2. Highest & Lowest Price */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex flex-col justify-between transition-colors">
        <div>
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Highest &amp; Lowest Price
            </p>
            <HelperHint text="The highest and lowest daily end-of-day prices recorded during these dates." />
          </div>
          <div className="mt-2 space-y-1.5">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-xs text-slate-500 dark:text-slate-400">Highest</span>
              <span className="font-mono text-base font-semibold text-slate-900 dark:text-white tabular-nums">
                {formatCurrency(stats.highPrice, currency)}
              </span>
            </div>
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-xs text-slate-500 dark:text-slate-400">Lowest</span>
              <span className="font-mono text-base font-semibold text-slate-900 dark:text-white tabular-nums">
                {formatCurrency(stats.lowPrice, currency)}
              </span>
            </div>
          </div>
        </div>
        <p className="mt-2.5 text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
          High {stats.highDate} <span aria-hidden="true">·</span> Low {stats.lowDate}
        </p>
      </div>

      {/* 3. Average Daily Trading Activity */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex flex-col justify-between transition-colors">
        <div>
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Average Daily Trading Activity
            </p>
            <HelperHint text="Also called volume: the average total value bought and sold per day across global markets." />
          </div>
          <p
            className="mt-2 font-mono text-2xl font-semibold text-slate-900 dark:text-white tabular-nums"
            title={formatVolumeOrCap(stats.avgVolume, currency, false)}
          >
            {formatVolumeOrCap(stats.avgVolume, currency, true)}
          </p>
        </div>
        <p className="mt-2.5 text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
          Daily average across {stats.dayCount} {stats.dayCount === 1 ? 'day' : 'days'}
        </p>
      </div>

      {/* 4. Typical Daily Price Swings */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex flex-col justify-between transition-colors">
        <div>
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Typical Daily Price Swings
            </p>
            <HelperHint text="Measures how sharply the price usually moves up or down from one day to the next." />
          </div>
          <div className={`mt-2 flex items-center gap-2 ${swingStyles.text}`}>
            <SwingIcon className="w-5 h-5 shrink-0" aria-hidden="true" />
            <span className="font-display text-xl font-semibold">{swingStyles.label}</span>
          </div>
        </div>
        <p className="mt-2.5 text-xs text-slate-500 dark:text-slate-400">{swingStyles.desc}</p>
      </div>
    </section>
  );
}
