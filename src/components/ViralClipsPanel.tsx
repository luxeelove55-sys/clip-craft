import { ArrowRight, Clock, Sparkles, AlertCircle } from 'lucide-react';
import type { ViralClip } from '../types';
import { formatDurationBadge, formatTimecode } from '../utils/time';

interface ViralClipsPanelProps {
  clips: ViralClip[];
  selectedClipId: string | null;
  isAnalyzing: boolean;
  analysisError: string | null;
  hasProject: boolean;
  onSelectClip: (clipId: string) => void;
  onAnalyze: () => void;
}

export function ViralClipsPanel({
  clips,
  selectedClipId,
  isAnalyzing,
  analysisError,
  hasProject,
  onSelectClip,
  onAnalyze,
}: ViralClipsPanelProps) {
  if (!hasProject) {
    return null;
  }

  return (
    <section id="viral-finder" className="border-b border-slate-800/80 bg-[#090D16]">
      <div className="mx-auto max-w-[1400px] px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="font-display text-xl font-bold tracking-tight text-slate-50 sm:text-2xl">
              AI Viral Moment Finder
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Select a suggested segment below to fine-tune timestamps, captions, and vertical framing in the studio.
            </p>
          </div>

          {clips.length > 0 && (
            <div className="text-xs font-mono tabular-nums text-slate-400">
              {clips.length} high-engagement clips detected
            </div>
          )}
        </div>

        {analysisError && (
          <div
            role="alert"
            className="mt-5 flex items-center gap-2.5 rounded-lg border border-rose-500/30 bg-rose-950/30 px-4 py-3 text-sm text-rose-200"
          >
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
            <span>{analysisError}</span>
          </div>
        )}

        {/* Loading skeleton state */}
        {isAnalyzing && (
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {[1, 2, 3, 4].map((item) => (
              <div
                key={item}
                className="rounded-xl border border-slate-800 bg-[#0F1624] p-5 animate-pulse"
              >
                <div className="flex items-center justify-between">
                  <div className="h-3.5 w-32 rounded bg-slate-800" />
                  <div className="h-4 w-14 rounded bg-slate-800" />
                </div>
                <div className="mt-3.5 h-5 w-4/5 rounded bg-slate-800" />
                <div className="mt-3 space-y-2">
                  <div className="h-3.5 w-full rounded bg-slate-800/80" />
                  <div className="h-3.5 w-2/3 rounded bg-slate-800/80" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state before running Gemini analysis */}
        {!isAnalyzing && clips.length === 0 && (
          <div className="mt-6 flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-800 bg-[#0F1624]/50 px-6 py-12 text-center">
            <Sparkles className="h-7 w-7 text-indigo-400" />
            <h3 className="mt-3 font-display text-base font-semibold text-slate-100">
              Ready to scan for viral moments
            </h3>
            <p className="mt-1 max-w-md text-sm text-slate-400">
              Run Gemini analysis to detect the strongest hooks, emotional payoffs, and shareable quotes across this video.
            </p>
            <button
              type="button"
              onClick={onAnalyze}
              className="mt-5 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <Sparkles className="h-4 w-4" />
              Analyze & Find Clips
            </button>
          </div>
        )}

        {/* Populated clip cards */}
        {!isAnalyzing && clips.length > 0 && (
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {clips.map((clip, idx) => {
              const isSelected = clip.id === selectedClipId;
              const duration = Math.max(1, clip.endTime - clip.startTime);

              return (
                <button
                  key={clip.id}
                  type="button"
                  onClick={() => onSelectClip(clip.id)}
                  className={`group text-left rounded-xl border p-5 transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 ${
                    isSelected
                      ? 'border-indigo-500 bg-[#131C2E] shadow-[0_0_0_1px_rgba(99,102,241,0.35)]'
                      : 'border-slate-800/90 bg-[#0F1624] hover:border-slate-700 hover:bg-[#121A2B]'
                  }`}
                >
                  {/* Metadata header row (unboxed text with typographic separators) */}
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2 text-xs text-slate-400 font-mono tabular-nums">
                      <span className="text-slate-300 font-semibold">
                        {String(idx + 1).padStart(2, '0')}.
                      </span>
                      <Clock className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
                      <span>
                        {formatTimecode(clip.startTime)} – {formatTimecode(clip.endTime)}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{formatDurationBadge(duration)}</span>
                    </div>

                    <div className="font-mono tabular-nums text-sm font-semibold text-indigo-400 shrink-0">
                      {clip.viralScore}/100
                    </div>
                  </div>

                  {/* Title */}
                  <h3 className="mt-2.5 font-display text-base font-semibold text-slate-50 group-hover:text-indigo-200 transition-colors">
                    {clip.title}
                  </h3>

                  {/* Explanation */}
                  <p className="mt-2 text-sm text-slate-400 leading-relaxed line-clamp-2">
                    {clip.reason}
                  </p>

                  {/* Footer action affordance */}
                  <div className="mt-4 flex items-center justify-between text-xs font-medium">
                    <span className="truncate text-slate-500 max-w-[70%]">
                      “{clip.hookLine}”
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 whitespace-nowrap shrink-0 transition-colors ${
                        isSelected
                          ? 'text-indigo-400'
                          : 'text-slate-300 group-hover:text-indigo-400'
                      }`}
                    >
                      {isSelected ? 'Editing Now' : 'Open in Studio'}
                      <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
