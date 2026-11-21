import { useEffect, useMemo, useState } from 'react';
import { ArrowUpDown, ChevronLeft, ChevronRight, HelpCircle } from 'lucide-react';
import { CoinOption, DailyDataPoint, FiatCode } from '../types/crypto';
import { formatCurrency, formatPercentage, formatVolumeOrCap } from '../utils/formatters';

interface HistoricalTableProps {
  series: DailyDataPoint[];
  coin: CoinOption;
  currency: FiatCode;
  loading: boolean;
}

const PAGE_SIZE = 15;

export function HistoricalTable({ series, coin, currency, loading }: HistoricalTableProps) {
  const [sortDesc, setSortDesc] = useState(true);
  const [page, setPage] = useState(1);
  const [showGlossary, setShowGlossary] = useState(false);

  useEffect(() => {
    setPage(1);
  }, [series]);

  const orderedRows = useMemo(() => {
    return sortDesc ? [...series].reverse() : series;
  }, [series, sortDesc]);

  const totalPages = Math.max(1, Math.ceil(orderedRows.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);

  const pageRows = useMemo(() => {
    const startIdx = (safePage - 1) * PAGE_SIZE;
    return orderedRows.slice(startIdx, startIdx + PAGE_SIZE);
  }, [orderedRows, safePage]);

  return (
    <section
      id="history"
      aria-label="Daily historical price records"
      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden transition-colors"
    >
      <div className="px-4 sm:px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
            Daily Historical Records
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            One end-of-day record per calendar day for {coin.name} ({coin.symbol}) in{' '}
            {currency.toUpperCase()}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            aria-expanded={showGlossary}
            onClick={() => setShowGlossary((v) => !v)}
            className="px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
          >
            <HelpCircle
              className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400"
              aria-hidden="true"
            />
            <span>What do these columns mean?</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setSortDesc((d) => !d);
              setPage(1);
            }}
            className="px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
          >
            <ArrowUpDown
              className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400"
              aria-hidden="true"
            />
            <span>{sortDesc ? 'Newest First' : 'Oldest First'}</span>
          </button>
        </div>
      </div>

      {showGlossary && (
        <div className="px-4 sm:px-6 py-3.5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-600 dark:text-slate-300">
          <div>
            <p className="font-semibold text-slate-800 dark:text-slate-100">End-of-Day Price</p>
            <p className="mt-0.5 leading-relaxed">
              The final price recorded for that day (at midnight UTC).
            </p>
          </div>
          <div>
            <p className="font-semibold text-slate-800 dark:text-slate-100">
              Total Market Value (Market Cap)
            </p>
            <p className="mt-0.5 leading-relaxed">
              The combined value of all coins currently in circulation (price × circulating supply).
            </p>
          </div>
          <div>
            <p className="font-semibold text-slate-800 dark:text-slate-100">
              24h Trading Activity (Volume)
            </p>
            <p className="mt-0.5 leading-relaxed">
              The total monetary value of coins bought and sold during that 24-hour window.
            </p>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 text-xs font-medium text-slate-600 dark:text-slate-300">
              <th scope="col" className="py-3 px-4 sm:px-6 whitespace-nowrap">
                Date (DD-MM-YYYY)
              </th>
              <th scope="col" className="py-3 px-4 text-right whitespace-nowrap">
                End-of-Day Price
              </th>
              <th scope="col" className="py-3 px-4 text-right whitespace-nowrap">
                Daily Change (%)
              </th>
              <th scope="col" className="py-3 px-4 text-right whitespace-nowrap">
                Total Market Value (Market Cap)
              </th>
              <th scope="col" className="py-3 px-4 sm:pr-6 text-right whitespace-nowrap">
                24h Trading Activity (Volume)
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-sm">
            {loading &&
              Array.from({ length: 8 }).map((_, idx) => (
                <tr key={idx} className="animate-pulse">
                  <td className="py-3 px-4 sm:px-6">
                    <div className="h-4 w-24 bg-slate-200 dark:bg-slate-800 rounded" />
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="h-4 w-24 bg-slate-200 dark:bg-slate-800 rounded ml-auto" />
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="h-4 w-16 bg-slate-200 dark:bg-slate-800 rounded ml-auto" />
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="h-4 w-28 bg-slate-200 dark:bg-slate-800 rounded ml-auto" />
                  </td>
                  <td className="py-3 px-4 sm:pr-6 text-right">
                    <div className="h-4 w-24 bg-slate-200 dark:bg-slate-800 rounded ml-auto" />
                  </td>
                </tr>
              ))}

            {!loading && pageRows.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="py-12 px-4 text-center text-sm text-slate-500 dark:text-slate-400"
                >
                  No daily records found for the selected cryptocurrency and dates.
                </td>
              </tr>
            )}

            {!loading &&
              pageRows.map((row) => {
                const changeClass =
                  row.dailyChangePct === null
                    ? 'text-slate-400 dark:text-slate-500'
                    : row.dailyChangePct > 0
                    ? 'text-emerald-700 dark:text-emerald-400'
                    : row.dailyChangePct < 0
                    ? 'text-red-700 dark:text-red-400'
                    : 'text-slate-600 dark:text-slate-400';

                return (
                  <tr
                    key={row.isoDate}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-2.5 px-4 sm:px-6 font-mono text-xs text-slate-700 dark:text-slate-300 tabular-nums whitespace-nowrap">
                      {row.displayDate}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono text-xs sm:text-[13px] font-medium text-slate-900 dark:text-white tabular-nums whitespace-nowrap">
                      {formatCurrency(row.price, currency)}
                    </td>
                    <td
                      className={`py-2.5 px-4 text-right font-mono text-xs sm:text-[13px] font-medium tabular-nums whitespace-nowrap ${changeClass}`}
                    >
                      {formatPercentage(row.dailyChangePct)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono text-xs sm:text-[13px] text-slate-700 dark:text-slate-300 tabular-nums whitespace-nowrap">
                      {formatVolumeOrCap(row.marketCap, currency, false)}
                    </td>
                    <td className="py-2.5 px-4 sm:pr-6 text-right font-mono text-xs sm:text-[13px] text-slate-700 dark:text-slate-300 tabular-nums whitespace-nowrap">
                      {formatVolumeOrCap(row.volume, currency, false)}
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {!loading && orderedRows.length > 0 && (
        <div className="px-4 sm:px-6 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-600 dark:text-slate-300">
          <p className="font-mono tabular-nums">
            Showing {(safePage - 1) * PAGE_SIZE + 1}–
            {Math.min(safePage * PAGE_SIZE, orderedRows.length)} of {orderedRows.length} daily
            records
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={safePage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-45 disabled:pointer-events-none inline-flex items-center gap-1 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
            >
              <ChevronLeft className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Previous</span>
            </button>
            <span className="font-mono text-slate-700 dark:text-slate-300 px-2 tabular-nums">
              Page {safePage} of {totalPages}
            </span>
            <button
              type="button"
              disabled={safePage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-45 disabled:pointer-events-none inline-flex items-center gap-1 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
