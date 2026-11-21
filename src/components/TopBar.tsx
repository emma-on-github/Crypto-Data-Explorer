interface TopBarProps {
  onReset: () => void;
}

export function TopBar({ onReset }: TopBarProps) {
  return (
    <header className="bg-slate-900 border-b border-slate-800">
      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 h-[76px] flex items-center justify-between gap-4 sm:gap-6">
        <a
          href="#overview"
          className="font-display text-[22px] sm:text-4xl font-bold tracking-tight text-white whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded"
        >
          Crypto Data Explorer
        </a>

        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={onReset}
            className="px-3.5 sm:px-4 py-2 text-xs font-semibold text-slate-900 bg-slate-100 hover:bg-white rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
          >
            Reset Defaults
          </button>
        </div>
      </div>
    </header>
  );
}
