interface TopNavProps {
  hasProject: boolean;
  onTrySample: () => void;
  onResetProject: () => void;
}

export function TopNav({ hasProject, onTrySample, onResetProject }: TopNavProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-[#090D16]/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-8 px-4 py-3.5 sm:px-6 lg:px-8">
        {/* Zone 1: Brand wordmark (single text element) */}
        <a
          href="#top"
          className="font-display text-lg font-bold tracking-tight text-slate-50 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-indigo-500"
        >
          ClipCraft
        </a>

        {/* Zone 2: Clean single-line navigation links */}
        <nav
          aria-label="Primary navigation"
          className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-400"
        >
          <a
            href="#loader"
            className="hover:text-slate-100 hover:underline underline-offset-8 decoration-indigo-500/70 transition-colors whitespace-nowrap shrink-0"
          >
            Video Source
          </a>
          <a
            href="#viral-finder"
            className="hover:text-slate-100 hover:underline underline-offset-8 decoration-indigo-500/70 transition-colors whitespace-nowrap shrink-0"
          >
            Viral Finder
          </a>
          <a
            href="#clip-editor"
            className="hover:text-slate-100 hover:underline underline-offset-8 decoration-indigo-500/70 transition-colors whitespace-nowrap shrink-0"
          >
            Clip Studio
          </a>
          <a
            href="#workflow"
            className="hover:text-slate-100 hover:underline underline-offset-8 decoration-indigo-500/70 transition-colors whitespace-nowrap shrink-0"
          >
            Export Specs
          </a>
        </nav>

        {/* Zone 3: Single primary action */}
        <div className="flex items-center shrink-0">
          {hasProject ? (
            <button
              type="button"
              onClick={onResetProject}
              className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-xs font-semibold text-slate-100 hover:border-slate-600 hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
            >
              New Video
            </button>
          ) : (
            <button
              type="button"
              onClick={onTrySample}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
            >
              Try Sample Video
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
