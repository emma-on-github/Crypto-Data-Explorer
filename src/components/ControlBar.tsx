import { useEffect, useMemo, useRef, useState } from 'react';
import { Calendar, Check, ChevronDown, Search } from 'lucide-react';
import { COINS, FIAT_CURRENCIES, QUICK_RANGES } from '../constants/market';
import { FiatCode, QuickRangeKey } from '../types/crypto';
import { getFreeTierMinStartDate, getTodayIsoUTC } from '../utils/formatters';

interface ControlBarProps {
  selectedCoinId: string;
  onSelectCoin: (coinId: string) => void;
  selectedCurrency: FiatCode;
  onSelectCurrency: (currency: FiatCode) => void;
  activeRange: QuickRangeKey;
  onSelectQuickRange: (range: Exclude<QuickRangeKey, 'CUSTOM'>) => void;
  onSelectCustomRange: () => void;
  startDate: string;
  endDate: string;
  onChangeStartDate: (date: string) => void;
  onChangeEndDate: (date: string) => void;
}

export function ControlBar({
  selectedCoinId,
  onSelectCoin,
  selectedCurrency,
  onSelectCurrency,
  activeRange,
  onSelectQuickRange,
  onSelectCustomRange,
  startDate,
  endDate,
  onChangeStartDate,
  onChangeEndDate,
}: ControlBarProps) {
  const [coinOpen, setCoinOpen] = useState(false);
  const [coinQuery, setCoinQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedCoin = useMemo(
    () => COINS.find((c) => c.id === selectedCoinId) ?? COINS[0],
    [selectedCoinId]
  );

  const filteredCoins = useMemo(() => {
    const q = coinQuery.trim().toLowerCase();
    if (!q) return COINS;
    return COINS.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.symbol.toLowerCase().includes(q) ||
        c.id.toLowerCase().includes(q)
    );
  }, [coinQuery]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setCoinOpen(false);
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setCoinOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  useEffect(() => {
    if (coinOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 20);
    } else {
      setCoinQuery('');
    }
  }, [coinOpen]);

  const todayIso = getTodayIsoUTC();
  const minStartDate = getFreeTierMinStartDate();

  return (
    <section
      aria-label="Market filters and date range controls"
      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-5 transition-colors"
    >
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-4">
        {/* Coin & Fiat Selectors */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 xl:flex xl:items-end xl:gap-3">
          {/* Searchable Coin Selector */}
          <div className="relative xl:w-72" ref={dropdownRef}>
            <label
              htmlFor="coin-selector-btn"
              className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5"
            >
              Choose a Cryptocurrency
            </label>
            <button
              id="coin-selector-btn"
              type="button"
              aria-haspopup="listbox"
              aria-expanded={coinOpen}
              onClick={() => setCoinOpen((prev) => !prev)}
              className="w-full h-10 px-3 flex items-center justify-between gap-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-slate-100 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
            >
              <span className="flex items-center gap-2 truncate">
                <span className="font-mono text-xs font-semibold text-blue-700 dark:text-blue-400 shrink-0">
                  {selectedCoin.symbol}
                </span>
                <span className="text-slate-300 dark:text-slate-600" aria-hidden="true">
                  /
                </span>
                <span className="font-medium truncate">{selectedCoin.name}</span>
              </span>
              <ChevronDown
                className={`w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0 transition-transform duration-150 ${
                  coinOpen ? 'rotate-180' : ''
                }`}
                aria-hidden="true"
              />
            </button>

            {coinOpen && (
              <div
                role="listbox"
                aria-label="Select cryptocurrency"
                className="absolute z-30 mt-1.5 w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg overflow-hidden"
              >
                <div className="p-2 border-b border-slate-100 dark:border-slate-800">
                  <div className="relative">
                    <Search
                      className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
                      aria-hidden="true"
                    />
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={coinQuery}
                      onChange={(e) => setCoinQuery(e.target.value)}
                      placeholder="Search name or ticker..."
                      aria-label="Search cryptocurrency"
                      className="w-full h-8 pl-8 pr-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-slate-800"
                    />
                  </div>
                </div>
                <ul className="max-h-64 overflow-y-auto py-1">
                  {filteredCoins.length === 0 ? (
                    <li className="px-3 py-4 text-xs text-slate-400 text-center">
                      No matching cryptocurrencies in the alphabetical reference list.
                    </li>
                  ) : (
                    filteredCoins.map((coin) => {
                      const isSelected = coin.id === selectedCoinId;
                      return (
                        <li key={coin.id}>
                          <button
                            type="button"
                            role="option"
                            aria-selected={isSelected}
                            onClick={() => {
                              onSelectCoin(coin.id);
                              setCoinOpen(false);
                            }}
                            className={`w-full px-3 py-2 flex items-center justify-between gap-2 text-left text-sm transition-colors cursor-pointer ${
                              isSelected
                                ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-900 dark:text-blue-200 font-medium'
                                : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
                            }`}
                          >
                            <span className="flex items-center gap-2.5 min-w-0">
                              <span className="font-mono text-xs font-semibold w-12 shrink-0 text-slate-900 dark:text-white">
                                {coin.symbol}
                              </span>
                              <span className="truncate">{coin.name}</span>
                            </span>
                            {isSelected && (
                              <Check
                                className="w-4 h-4 text-blue-700 dark:text-blue-400 shrink-0"
                                aria-hidden="true"
                              />
                            )}
                          </button>
                        </li>
                      );
                    })
                  )}
                </ul>
              </div>
            )}
          </div>

          {/* Fiat Currency Selector */}
          <div className="xl:w-48">
            <label
              htmlFor="fiat-selector"
              className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5"
            >
              Display Currency
            </label>
            <div className="relative">
              <select
                id="fiat-selector"
                value={selectedCurrency}
                onChange={(e) => onSelectCurrency(e.target.value as FiatCode)}
                className="w-full h-10 pl-3 pr-8 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600 rounded-lg text-sm font-medium text-slate-900 dark:text-slate-100 appearance-none cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
              >
                {FIAT_CURRENCIES.map((fiat) => (
                  <option key={fiat.code} value={fiat.code}>
                    {fiat.isoCode} ({fiat.symbol}) — {fiat.name}
                  </option>
                ))}
              </select>
              <ChevronDown
                className="w-4 h-4 text-slate-500 dark:text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
            </div>
          </div>
        </div>

        {/* Date Range Presets + Custom Toggle */}
        <div>
          <span className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5">
            Time Period
          </span>
          <div
            role="group"
            aria-label="Quick date range presets"
            className="inline-flex flex-wrap items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
          >
            {QUICK_RANGES.map((rangeKey) => {
              const isActive = activeRange === rangeKey;
              return (
                <button
                  key={rangeKey}
                  type="button"
                  onClick={() => onSelectQuickRange(rangeKey)}
                  className={`px-2.5 py-1.5 text-xs font-mono font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
                    isActive
                      ? 'bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-400 shadow-xs font-semibold'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-700/60'
                  }`}
                >
                  {rangeKey}
                </button>
              );
            })}
            <button
              type="button"
              aria-expanded={activeRange === 'CUSTOM'}
              onClick={onSelectCustomRange}
              className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 inline-flex items-center gap-1 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
                activeRange === 'CUSTOM'
                  ? 'bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-400 shadow-xs font-semibold'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-700/60'
              }`}
            >
              <Calendar className="w-3 h-3" aria-hidden="true" />
              <span>Custom</span>
            </button>
          </div>
        </div>
      </div>

      {/* Collapsible Custom Date Range Inputs */}
      {activeRange === 'CUSTOM' && (
        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label
                htmlFor="start-date-input"
                className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5"
              >
                Start Date
              </label>
              <div className="relative">
                <Calendar
                  className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
                  aria-hidden="true"
                />
                <input
                  id="start-date-input"
                  type="date"
                  value={startDate}
                  min={minStartDate}
                  max={endDate || todayIso}
                  onChange={(e) => {
                    if (e.target.value) onChangeStartDate(e.target.value);
                  }}
                  className="h-10 pl-8 pr-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600 rounded-lg text-xs font-mono text-slate-900 dark:text-slate-100 tabular-nums focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="end-date-input"
                className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5"
              >
                End Date
              </label>
              <div className="relative">
                <Calendar
                  className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
                  aria-hidden="true"
                />
                <input
                  id="end-date-input"
                  type="date"
                  value={endDate}
                  min={startDate || minStartDate}
                  max={todayIso}
                  onChange={(e) => {
                    if (e.target.value) onChangeEndDate(e.target.value);
                  }}
                  className="h-10 pl-8 pr-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600 rounded-lg text-xs font-mono text-slate-900 dark:text-slate-100 tabular-nums focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
            </div>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400">
            Free public API historical window: past 365 days
          </p>
        </div>
      )}
    </section>
  );
}
