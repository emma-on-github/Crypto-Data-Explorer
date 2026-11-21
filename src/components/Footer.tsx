import { ExternalLink } from 'lucide-react';
import { LEGAL_DISCLAIMER_TEXT, SUPPLEMENTARY_LEGAL_NOTICE_TEXT } from '../constants/market';

export function Footer() {
  return (
    <footer
      id="disclaimer"
      className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 mt-10 transition-colors"
    >
      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
          <div>
            <p className="font-display text-base font-bold text-slate-900 dark:text-white">
              Crypto Data Explorer
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              Independent educational &amp; historical cryptocurrency research tool{' '}
              <span aria-hidden="true">·</span> Created by{' '}
              <span className="font-medium text-slate-200">Emma Hicks</span>
            </p>
          </div>

          <div className="text-sm text-slate-300 flex items-center gap-1.5">
            <span>Historical market data powered by</span>
            <a
              href="https://www.coingecko.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-semibold text-blue-400 hover:text-blue-300 underline underline-offset-2"
            >
              <span>CoinGecko</span>
              <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
            </a>
          </div>
        </div>

        <section aria-labelledby="educational-disclaimer-heading" className="space-y-2.5">
          <h2
            id="educational-disclaimer-heading"
            className="text-sm font-semibold text-slate-800 dark:text-slate-200"
          >
            Educational &amp; Regulatory Notice
          </h2>
          <p className="text-xs sm:text-[13px] leading-relaxed text-slate-600 dark:text-slate-300 max-w-5xl">
            {LEGAL_DISCLAIMER_TEXT}
          </p>
          <p className="text-xs sm:text-[13px] leading-relaxed text-slate-500 dark:text-slate-400 max-w-5xl">
            {SUPPLEMENTARY_LEGAL_NOTICE_TEXT}
          </p>
        </section>
      </div>
    </footer>
  );
}
