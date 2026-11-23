import { useState } from 'react';
import {
  Captions,
  Download,
  Pause,
  Play,
  Repeat,
  RotateCcw,
  SlidersHorizontal,
} from 'lucide-react';
import type {
  AspectRatioMode,
  CaptionStylePreset,
  VideoProject,
  ViralClip,
} from '../types';
import { formatTimecode } from '../utils/time';
import { TimelineScrubber } from './TimelineScrubber';
import { YouTubePreviewPlayer } from './YouTubePreviewPlayer';

interface ClipEditorWorkspaceProps {
  project: VideoProject;
  clips: ViralClip[];
  selectedClip: ViralClip;
  aspectRatio: AspectRatioMode;
  cropOffsetPercent: number;
  captionsEnabled: boolean;
  captionStyle: CaptionStylePreset;
  currentTime: number;
  isPlaying: boolean;
  isLooping: boolean;
  seekNonce: number;
  seekTarget: number | null;
  onSelectClip: (clipId: string) => void;
  onUpdateClip: (updated: ViralClip) => void;
  onAspectRatioChange: (ratio: AspectRatioMode) => void;
  onCropOffsetChange: (offset: number) => void;
  onToggleCaptions: () => void;
  onCaptionStyleChange: (style: CaptionStylePreset) => void;
  onTimeUpdate: (time: number) => void;
  onPlayStateChange: (playing: boolean) => void;
  onToggleLoop: () => void;
  onSeek: (time: number) => void;
  onOpenExport: () => void;
}

const ASPECT_OPTIONS: Array<{ value: AspectRatioMode; label: string }> = [
  { value: '9:16', label: '9:16 Vertical' },
  { value: '1:1', label: '1:1 Square' },
  { value: '16:9', label: '16:9 Original' },
];

const CAPTION_PRESETS: Array<{ value: CaptionStylePreset; label: string; previewClass: string }> = [
  {
    value: 'bold-yellow',
    label: 'Bold Yellow',
    previewClass: 'text-yellow-400 font-extrabold uppercase',
  },
  {
    value: 'minimal-white',
    label: 'Minimal White',
    previewClass: 'text-white font-medium',
  },
  {
    value: 'neon',
    label: 'Neon',
    previewClass: 'text-indigo-200 font-bold drop-shadow-[0_0_8px_rgba(129,140,248,0.9)]',
  },
];

export function ClipEditorWorkspace({
  project,
  clips,
  selectedClip,
  aspectRatio,
  cropOffsetPercent,
  captionsEnabled,
  captionStyle,
  currentTime,
  isPlaying,
  isLooping,
  seekNonce,
  seekTarget,
  onSelectClip,
  onUpdateClip,
  onAspectRatioChange,
  onCropOffsetChange,
  onToggleCaptions,
  onCaptionStyleChange,
  onTimeUpdate,
  onPlayStateChange,
  onToggleLoop,
  onSeek,
  onOpenExport,
}: ClipEditorWorkspaceProps) {
  const [showCueEditor, setShowCueEditor] = useState(false);

  const handleRangeChange = (nextStart: number, nextEnd: number) => {
    onUpdateClip({
      ...selectedClip,
      startTime: nextStart,
      endTime: nextEnd,
    });
  };

  const handleTitleChange = (title: string) => {
    onUpdateClip({
      ...selectedClip,
      title,
    });
  };

  const handleCueTextChange = (cueId: string, text: string) => {
    onUpdateClip({
      ...selectedClip,
      captions: selectedClip.captions.map((c) => (c.id === cueId ? { ...c, text } : c)),
    });
  };

  const handleJumpToStart = () => {
    onSeek(selectedClip.startTime);
  };

  const handlePlayToggle = () => {
    if (!isPlaying && (currentTime < selectedClip.startTime || currentTime >= selectedClip.endTime - 0.2)) {
      onSeek(selectedClip.startTime);
    }
    onPlayStateChange(!isPlaying);
  };

  return (
    <section id="clip-editor" className="border-b border-slate-800/80 bg-[#0B101B]">
      <div className="mx-auto max-w-[1400px] px-4 py-10 sm:px-6 lg:px-8">
        {/* Studio Header Bar */}
        <div className="flex flex-col gap-4 pb-6 border-b border-slate-800/80 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 text-xs text-slate-400">
              <span className="font-semibold text-indigo-400">Clip Studio</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">
                Score {selectedClip.viralScore}/100
              </span>
              <span aria-hidden="true">·</span>
              <span className="truncate">{project.title}</span>
            </div>
            <h2 className="mt-1 font-display text-xl font-bold text-slate-50 truncate sm:text-2xl">
              {selectedClip.title}
            </h2>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={onOpenExport}
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:from-indigo-500 hover:to-violet-500 transition-all whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
            >
              <Download className="h-4 w-4" />
              Export Clip
            </button>
          </div>
        </div>

        {/* Split-Screen Workspace */}
        <div className="mt-8 grid gap-8 lg:grid-cols-12 lg:items-start">
          {/* LEFT PANEL: Timeline, Aspect Ratio, Auto-Captions */}
          <div className="space-y-6 lg:col-span-7">
            {/* Quick Clip Switcher */}
            {clips.length > 1 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {clips.map((c, idx) => {
                  const active = c.id === selectedClip.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => onSelectClip(c.id)}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        active
                          ? 'border-indigo-500 bg-indigo-500/15 text-indigo-200'
                          : 'border-slate-800 bg-[#0F1624] text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Clip {idx + 1} · {formatTimecode(c.startTime)}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Clip Title & Playback Transport */}
            <div className="rounded-xl border border-slate-800 bg-[#0F1624] p-5 space-y-5">
              <div>
                <label
                  htmlFor="clip-title-input"
                  className="block text-xs font-medium text-slate-400 mb-1.5"
                >
                  Clip Working Title
                </label>
                <input
                  id="clip-title-input"
                  type="text"
                  value={selectedClip.title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  className="w-full rounded-lg border border-slate-800 bg-[#090D16] px-3.5 py-2 text-sm font-medium text-slate-100 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              {/* Transport Strip */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800/80 pt-4">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handlePlayToggle}
                    className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                  >
                    {isPlaying ? (
                      <>
                        <Pause className="h-3.5 w-3.5 fill-current" />
                        Pause
                      </>
                    ) : (
                      <>
                        <Play className="h-3.5 w-3.5 fill-current" />
                        Play Clip
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleJumpToStart}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-800 bg-[#090D16] px-3 py-2 text-xs font-medium text-slate-300 hover:border-slate-700 hover:text-white transition-colors cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Restart
                  </button>

                  <button
                    type="button"
                    onClick={onToggleLoop}
                    className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                      isLooping
                        ? 'border-indigo-500/60 bg-indigo-500/15 text-indigo-300'
                        : 'border-slate-800 bg-[#090D16] text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Repeat className="h-3.5 w-3.5" />
                    Loop {isLooping ? 'On' : 'Off'}
                  </button>
                </div>

                <div className="font-mono tabular-nums text-xs text-slate-400">
                  Playhead:{' '}
                  <span className="text-slate-100 font-semibold">
                    {formatTimecode(currentTime, true)}
                  </span>
                </div>
              </div>

              {/* Interactive Timeline Scrubber */}
              <TimelineScrubber
                durationSeconds={project.durationSeconds}
                startTime={selectedClip.startTime}
                endTime={selectedClip.endTime}
                currentTime={currentTime}
                onChangeRange={handleRangeChange}
                onSeek={onSeek}
              />
            </div>

            {/* Aspect Ratio & Framing Controls */}
            <div className="rounded-xl border border-slate-800 bg-[#0F1624] p-5 space-y-5">
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-xs font-medium text-slate-300">Aspect Ratio</span>
                  <span className="text-xs text-slate-500">
                    {aspectRatio === '9:16'
                      ? 'Shorts / Reels / TikTok'
                      : aspectRatio === '1:1'
                        ? 'Square Social Feed'
                        : 'Original Widescreen'}
                  </span>
                </div>

                <div
                  role="radiogroup"
                  aria-label="Output aspect ratio"
                  className="grid grid-cols-3 gap-1.5 rounded-lg border border-slate-800 bg-[#090D16] p-1"
                >
                  {ASPECT_OPTIONS.map((opt) => {
                    const active = aspectRatio === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        onClick={() => onAspectRatioChange(opt.value)}
                        className={`rounded-md px-3 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                          active
                            ? 'bg-indigo-600 text-white'
                            : 'text-slate-400 hover:text-slate-100'
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {aspectRatio !== '16:9' && (
                <div className="border-t border-slate-800/80 pt-4">
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="inline-flex items-center gap-1.5 font-medium text-slate-300">
                      <SlidersHorizontal className="h-3.5 w-3.5 text-slate-400" />
                      Horizontal Framing Pan
                    </span>
                    <span className="font-mono tabular-nums text-slate-400">
                      {cropOffsetPercent === 0
                        ? 'Center'
                        : cropOffsetPercent < 0
                          ? `Left ${Math.abs(cropOffsetPercent)}%`
                          : `Right ${cropOffsetPercent}%`}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={-50}
                    max={50}
                    step={2}
                    value={cropOffsetPercent}
                    onChange={(e) => onCropOffsetChange(Number(e.target.value))}
                    aria-label="Horizontal crop position"
                    className="w-full accent-indigo-500 cursor-pointer"
                  />
                </div>
              )}
            </div>

            {/* Auto-Captions & Style Presets */}
            <div className="rounded-xl border border-slate-800 bg-[#0F1624] p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Captions className="h-4 w-4 text-indigo-400" />
                  <div>
                    <div className="text-sm font-semibold text-slate-100">Auto-Captions</div>
                    <div className="text-xs text-slate-400">
                      Live animated subtitle overlay synced to clip timing
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  role="switch"
                  aria-checked={captionsEnabled}
                  onClick={onToggleCaptions}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 ${
                    captionsEnabled ? 'bg-indigo-600' : 'bg-slate-700'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
                      captionsEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {captionsEnabled && (
                <>
                  <div className="grid grid-cols-3 gap-2 pt-1">
                    {CAPTION_PRESETS.map((preset) => {
                      const active = captionStyle === preset.value;
                      return (
                        <button
                          key={preset.value}
                          type="button"
                          onClick={() => onCaptionStyleChange(preset.value)}
                          className={`flex flex-col items-center justify-center gap-1.5 rounded-lg border p-3 text-center transition-colors cursor-pointer ${
                            active
                              ? 'border-indigo-500 bg-indigo-500/15'
                              : 'border-slate-800 bg-[#090D16] hover:border-slate-700'
                          }`}
                        >
                          <span className={`text-xs ${preset.previewClass}`}>Aa Bb</span>
                          <span className="text-[11px] font-medium text-slate-300 whitespace-nowrap">
                            {preset.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="border-t border-slate-800/80 pt-3">
                    <button
                      type="button"
                      onClick={() => setShowCueEditor((v) => !v)}
                      className="text-xs font-medium text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer"
                    >
                      {showCueEditor
                        ? 'Hide Caption Text Editor'
                        : `Edit Caption Lines (${selectedClip.captions.length})`}
                    </button>

                    {showCueEditor && (
                      <div className="mt-3 max-h-52 space-y-2 overflow-y-auto pr-1">
                        {selectedClip.captions.map((cue) => (
                          <div key={cue.id} className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => onSeek(selectedClip.startTime + cue.startOffset)}
                              className="w-16 shrink-0 rounded border border-slate-800 bg-[#090D16] px-2 py-1.5 font-mono tabular-nums text-[11px] text-indigo-400 hover:border-indigo-500/50 cursor-pointer"
                              title="Seek to this caption"
                            >
                              +{cue.startOffset.toFixed(1)}s
                            </button>
                            <input
                              type="text"
                              value={cue.text}
                              onChange={(e) => handleCueTextChange(cue.id, e.target.value)}
                              className="flex-1 rounded border border-slate-800 bg-[#090D16] px-2.5 py-1.5 text-xs text-slate-100 focus:border-indigo-500 focus:outline-none"
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* RIGHT PANEL: Live 9:16 Mobile Preview Frame */}
          <div className="lg:col-span-5 lg:sticky lg:top-20">
            <div className="rounded-xl border border-slate-800 bg-[#0F1624] p-5 sm:p-6">
              <YouTubePreviewPlayer
                videoId={project.videoId}
                thumbnailUrl={project.thumbnailUrl}
                startTime={selectedClip.startTime}
                endTime={selectedClip.endTime}
                currentTime={currentTime}
                isPlaying={isPlaying}
                isLooping={isLooping}
                aspectRatio={aspectRatio}
                cropOffsetPercent={cropOffsetPercent}
                captionsEnabled={captionsEnabled}
                captionStyle={captionStyle}
                captions={selectedClip.captions}
                seekNonce={seekNonce}
                seekTarget={seekTarget}
                onTimeUpdate={onTimeUpdate}
                onPlayStateChange={onPlayStateChange}
              />

              <div className="mt-5 border-t border-slate-800/80 pt-4 flex items-center justify-between gap-3">
                <p className="text-xs text-slate-400">
                  Real-time YouTube IFrame preview with synced caption overlay.
                </p>
                <button
                  type="button"
                  onClick={onOpenExport}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-500/50 bg-indigo-500/15 px-3.5 py-2 text-xs font-semibold text-indigo-300 hover:bg-indigo-500/25 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5" />
                  Export Clip
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
