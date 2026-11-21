import { Info, X } from 'lucide-react';

interface RiskBannerProps {
  dismissed: boolean;
  onDismiss: () => void;
}

export function RiskBanner({ dismissed, onDismiss }: RiskBannerProps) {
  if (dismissed) return null;

  return (
    <div
      role="region"
      aria-label="Educational notice"
      className="bg-amber-50/80 dark:bg-amber-950/35 border-b border-amber-200/90 dark:border-amber-800/50 transition-colors"
    >
      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex items-start sm:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-2.5 text-xs sm:text-[13px] leading-relaxed text-amber-950 dark:text-amber-100">
          <Info
            className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5 sm:mt-0"
            aria-hidden="true"
          />
          <p>
            <span className="font-semibold">Educational &amp; Research Notice:</span> Crypto Data
            Explorer is built strictly for education and historical research. Cryptocurrency prices
            can rise and fall sharply, and nothing on this site is financial advice, a
            recommendation, or an endorsement of any asset.{' '}
            <a
              href="#disclaimer"
              className="font-medium underline underline-offset-2 text-amber-300 hover:text-amber-200 whitespace-nowrap"
            >
              Read full disclaimer
            </a>
          </p>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss educational notice"
          className="p-1.5 rounded-md text-amber-800 hover:text-amber-950 hover:bg-amber-100 dark:text-amber-300 dark:hover:text-amber-100 dark:hover:bg-amber-900/50 transition-colors shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
