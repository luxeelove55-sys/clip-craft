import { useEffect, useState, type FormEvent } from 'react';
import { Film, Link2, Loader2, Play, Sparkles, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';
import type { VideoProject } from '../types';
import { formatTimecode } from '../utils/time';

interface HeroLoaderProps {
  project: VideoProject | null;
  isLoadingVideo: boolean;
  isAnalyzing: boolean;
  videoError: string | null;
  customNotes: string;
  onCustomNotesChange: (notes: string) => void;
  onLoadUrl: (url: string) => void;
  onTrySample: () => void;
  onAnalyzeClips: () => void;
}

export function HeroLoader({
  project,
  isLoadingVideo,
  isAnalyzing,
  videoError,
  customNotes,
  onCustomNotesChange,
  onLoadUrl,
  onTrySample,
  onAnalyzeClips,
}: HeroLoaderProps) {
  const [urlInput, setUrlInput] = useState(project?.url || '');
  const [showContextDrawer, setShowContextDrawer] = useState(false);
  const [thumbFailed, setThumbFailed] = useState(false);

  useEffect(() => {
    setThumbFailed(false);
    if (project?.url) {
      setUrlInput(project.url);
    } else if (project === null) {
      setUrlInput('');
      setShowContextDrawer(false);
    }
  }, [project]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim() || isLoadingVideo) return;
    setThumbFailed(false);
    onLoadUrl(urlInput.trim());
  };

  const handleSampleClick = () => {
    setThumbFailed(false);
    setUrlInput('https://www.youtube.com/watch?v=UF8uR6Z6KLc');
    onTrySample();
  };

  return (
    <section id="loader" className="relative overflow-hidden border-b border-slate-800/80">
      {/* Subtle atmospheric dark radial wash */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-[radial-gradient(ellipse_70%_55%_at_50%_-10%,rgba(99,102,241,0.18),transparent)]"
      />

      <div className="relative mx-auto max-w-[1400px] px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="mx-auto max-w-3xl text-center">
          <h1
            className="font-display text-3xl font-bold tracking-tight text-slate-50 sm:text-5xl sm:leading-[1.12]"
            style={{ textWrap: 'balance' }}
          >
            Turn long-form YouTube videos into viral vertical clips
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base text-slate-400 leading-relaxed sm:text-lg">
            Paste any YouTube link to surface high-retention moments with Gemini, reframe for 9:16 mobile feeds, and export synced captions with social copy.
          </p>

          {/* URL Input Bar */}
          <form
            onSubmit={handleSubmit}
            className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:rounded-xl sm:border sm:border-slate-800 sm:bg-[#0F1624] sm:p-2"
          >
            <div className="relative flex-1">
              <Link2
                aria-hidden="true"
                className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
              />
              <input
                type="text"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="Paste YouTube URL (e.g. https://www.youtube.com/watch?v=...)"
                aria-label="YouTube video URL"
                className="w-full rounded-lg border border-slate-800 bg-[#0F1624] py-3 pl-10 pr-4 text-sm text-slate-100 placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none sm:border-0 sm:bg-transparent sm:py-2.5"
              />
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <button
                type="submit"
                disabled={isLoadingVideo || !urlInput.trim()}
                className="inline-flex flex-1 sm:flex-initial items-center justify-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
              >
                {isLoadingVideo ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading
                  </>
                ) : (
                  <>
                    <Play className="h-3.5 w-3.5 fill-current" />
                    Load Video
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleSampleClick}
                disabled={isLoadingVideo}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm font-medium text-slate-200 hover:border-slate-600 hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
              >
                Try Sample Video
              </button>
            </div>
          </form>

          {videoError && (
            <div
              role="alert"
              className="mt-4 flex items-center justify-center gap-2 rounded-lg border border-rose-500/30 bg-rose-950/30 px-4 py-2.5 text-sm text-rose-200"
            >
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
              <span>{videoError}</span>
            </div>
          )}
        </div>

        {/* Loaded Video Summary Strip */}
        {project && (
          <div className="mx-auto mt-10 max-w-5xl rounded-xl border border-slate-800 bg-[#0F1624] p-4 sm:p-5">
            <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
              <div className="flex items-start gap-4 min-w-0">
                <div className="relative h-20 w-36 shrink-0 overflow-hidden rounded-lg border border-slate-800 bg-slate-900">
                  {!thumbFailed ? (
                    <img
                      src={project.thumbnailUrl}
                      alt={project.title}
                      referrerPolicy="no-referrer"
                      onError={() => setThumbFailed(true)}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900 text-slate-500">
                      <Film className="h-6 w-6" />
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <h2 className="font-display text-base font-semibold text-slate-100 truncate sm:text-lg">
                    {project.title}
                  </h2>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-400">
                    <span className="font-medium text-slate-300">{project.author}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums">
                      {formatTimecode(project.durationSeconds)} duration
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>
                      {project.hasRealTranscript
                        ? `${project.transcript.length} transcript cues synced`
                        : 'Metadata loaded (add topic notes for tighter clips)'}
                    </span>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setShowContextDrawer((v) => !v)}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                    >
                      {showContextDrawer ? (
                        <>
                          <ChevronUp className="h-3.5 w-3.5" />
                          Hide Transcript & Context
                        </>
                      ) : (
                        <>
                          <ChevronDown className="h-3.5 w-3.5" />
                          Inspect Transcript & Notes
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <button
                  type="button"
                  onClick={onAnalyzeClips}
                  disabled={isAnalyzing}
                  className="inline-flex w-full md:w-auto items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:from-indigo-500 hover:to-violet-500 disabled:opacity-60 disabled:cursor-not-allowed transition-all whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Analyzing with Gemini
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      Analyze & Find Clips
                    </>
                  )}
                </button>
              </div>
            </div>

            {showContextDrawer && (
              <div className="mt-5 border-t border-slate-800/90 pt-4 grid gap-4 md:grid-cols-2">
                <div>
                  <label
                    htmlFor="custom-notes-input"
                    className="block text-xs font-medium text-slate-300 mb-1.5"
                  >
                    Topic Focus or Paste Custom Transcript (optional)
                  </label>
                  <textarea
                    id="custom-notes-input"
                    rows={4}
                    value={customNotes}
                    onChange={(e) => onCustomNotesChange(e.target.value)}
                    placeholder="Add key topics, speaker timestamps, or paste a transcript snippet to guide Gemini..."
                    className="w-full rounded-lg border border-slate-800 bg-[#090D16] px-3 py-2 text-xs text-slate-200 placeholder:text-slate-600 focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <div className="text-xs font-medium text-slate-300 mb-1.5">
                    Extracted Transcript Preview
                  </div>
                  <div className="h-28 overflow-y-auto rounded-lg border border-slate-800 bg-[#090D16] p-3 text-xs text-slate-400 space-y-1.5">
                    {project.transcript.length > 0 ? (
                      project.transcript.slice(0, 40).map((seg, i) => (
                        <div key={`${seg.start}-${i}`} className="flex gap-2.5">
                          <span className="font-mono tabular-nums text-indigo-400 shrink-0">
                            {formatTimecode(seg.start)}
                          </span>
                          <span className="text-slate-300">{seg.text}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-slate-500">
                        No public caption track was returned for this video. Gemini will analyze the video title, description, and any notes you add on the left.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
