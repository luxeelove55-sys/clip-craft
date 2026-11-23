import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { Minus, Plus } from 'lucide-react';
import { formatTimecode } from '../utils/time';

interface TimelineScrubberProps {
  durationSeconds: number;
  startTime: number;
  endTime: number;
  currentTime: number;
  onChangeRange: (start: number, end: number) => void;
  onSeek: (time: number) => void;
}

type DragTarget = 'start' | 'end' | 'playhead' | null;

const MIN_CLIP_SECONDS = 5;

export function TimelineScrubber({
  durationSeconds,
  startTime,
  endTime,
  currentTime,
  onChangeRange,
  onSeek,
}: TimelineScrubberProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<DragTarget>(null);

  const safeDuration = Math.max(10, durationSeconds);
  const startPct = Math.max(0, Math.min(100, (startTime / safeDuration) * 100));
  const endPct = Math.max(startPct, Math.min(100, (endTime / safeDuration) * 100));
  const playheadPct = Math.max(0, Math.min(100, (currentTime / safeDuration) * 100));
  const clipLength = Math.max(1, endTime - startTime);

  const getTimeFromClientX = (clientX: number): number => {
    const el = trackRef.current;
    if (!el) return startTime;
    const rect = el.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return Math.round(ratio * safeDuration * 2) / 2; // 0.5s precision
  };

  const handleTrackPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).dataset.handle) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging('playhead');
    const t = getTimeFromClientX(e.clientX);
    onSeek(t);
  };

  const handleHandlePointerDown = (
    target: 'start' | 'end',
    e: ReactPointerEvent<HTMLButtonElement>
  ) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(target);
  };

  const handlePointerMove = (e: ReactPointerEvent<HTMLElement>) => {
    if (!dragging) return;
    const t = getTimeFromClientX(e.clientX);

    if (dragging === 'start') {
      const clamped = Math.max(0, Math.min(endTime - MIN_CLIP_SECONDS, t));
      onChangeRange(clamped, endTime);
      onSeek(clamped);
    } else if (dragging === 'end') {
      const clamped = Math.min(safeDuration, Math.max(startTime + MIN_CLIP_SECONDS, t));
      onChangeRange(startTime, clamped);
    } else if (dragging === 'playhead') {
      onSeek(t);
    }
  };

  const handlePointerUp = () => {
    setDragging(null);
  };

  const nudgeStart = (delta: number) => {
    const next = Math.max(0, Math.min(endTime - MIN_CLIP_SECONDS, startTime + delta));
    onChangeRange(Math.round(next * 10) / 10, endTime);
    onSeek(next);
  };

  const nudgeEnd = (delta: number) => {
    const next = Math.min(safeDuration, Math.max(startTime + MIN_CLIP_SECONDS, endTime + delta));
    onChangeRange(startTime, Math.round(next * 10) / 10);
  };

  // Decorative subtle ruler ticks across the full timeline
  const ticks = [0, 0.25, 0.5, 0.75, 1];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-slate-300">Timeline Trim</span>
        <span className="font-mono tabular-nums text-slate-400">
          Clip length: <strong className="text-indigo-400">{clipLength.toFixed(1)}s</strong>
        </span>
      </div>

      {/* Interactive Scrubber Track */}
      <div
        ref={trackRef}
        onPointerDown={handleTrackPointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        role="group"
        aria-label="Clip timeline scrubber"
        className="relative h-14 select-none touch-none rounded-lg border border-slate-800 bg-[#090D16] px-1 cursor-pointer"
      >
        {/* Subtle waveform bars */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-2 inset-y-2.5 flex items-center justify-between gap-0.5 opacity-35"
        >
          {Array.from({ length: 48 }).map((_, i) => {
            const h = 22 + ((i * 37) % 68);
            return (
              <span
                key={i}
                className="w-1 rounded-full bg-slate-600"
                style={{ height: `${h}%` }}
              />
            );
          })}
        </div>

        {/* Selected Clip Range Window */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-1 rounded border-y-2 border-indigo-500 bg-indigo-500/20"
          style={{
            left: `${startPct}%`,
            width: `${Math.max(1, endPct - startPct)}%`,
          }}
        />

        {/* Playhead Needle */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 z-10 w-0.5 bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]"
          style={{ left: `${playheadPct}%` }}
        >
          <span className="absolute -top-1 -left-1.5 h-2.5 w-3.5 rounded-sm bg-white" />
        </div>

        {/* Start Trim Handle */}
        <button
          type="button"
          data-handle="start"
          aria-label={`Adjust start time (${formatTimecode(startTime, true)})`}
          onPointerDown={(e) => handleHandlePointerDown('start', e)}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          style={{ left: `${startPct}%` }}
          className="absolute top-0 bottom-0 z-20 -translate-x-1/2 flex w-6 items-center justify-center cursor-ew-resize focus-visible:outline-2 focus-visible:outline-indigo-400"
        >
          <span className="flex h-10 w-3 items-center justify-center rounded bg-indigo-500 shadow-md hover:bg-indigo-400 transition-colors">
            <span className="h-4 w-0.5 rounded-full bg-white/90" />
          </span>
        </button>

        {/* End Trim Handle */}
        <button
          type="button"
          data-handle="end"
          aria-label={`Adjust end time (${formatTimecode(endTime, true)})`}
          onPointerDown={(e) => handleHandlePointerDown('end', e)}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          style={{ left: `${endPct}%` }}
          className="absolute top-0 bottom-0 z-20 -translate-x-1/2 flex w-6 items-center justify-center cursor-ew-resize focus-visible:outline-2 focus-visible:outline-indigo-400"
        >
          <span className="flex h-10 w-3 items-center justify-center rounded bg-violet-500 shadow-md hover:bg-violet-400 transition-colors">
            <span className="h-4 w-0.5 rounded-full bg-white/90" />
          </span>
        </button>
      </div>

      {/* Ruler Timecodes */}
      <div className="flex items-center justify-between text-[11px] font-mono tabular-nums text-slate-500">
        {ticks.map((ratio) => (
          <span key={ratio}>{formatTimecode(safeDuration * ratio)}</span>
        ))}
      </div>

      {/* Fine-tune In / Out Nudges */}
      <div className="grid grid-cols-2 gap-3 pt-1">
        <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-[#090D16] px-3 py-2">
          <div>
            <div className="text-[11px] text-slate-500">In Point</div>
            <div className="font-mono tabular-nums text-xs font-semibold text-indigo-300">
              {formatTimecode(startTime, true)}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => nudgeStart(-1)}
              aria-label="Nudge start 1 second earlier"
              className="flex h-7 w-7 items-center justify-center rounded border border-slate-800 bg-slate-900 text-slate-300 hover:border-slate-700 hover:text-white transition-colors cursor-pointer"
            >
              <Minus className="h-3 w-3" />
            </button>
            <button
              type="button"
              onClick={() => nudgeStart(1)}
              aria-label="Nudge start 1 second later"
              className="flex h-7 w-7 items-center justify-center rounded border border-slate-800 bg-slate-900 text-slate-300 hover:border-slate-700 hover:text-white transition-colors cursor-pointer"
            >
              <Plus className="h-3 w-3" />
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-[#090D16] px-3 py-2">
          <div>
            <div className="text-[11px] text-slate-500">Out Point</div>
            <div className="font-mono tabular-nums text-xs font-semibold text-violet-300">
              {formatTimecode(endTime, true)}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => nudgeEnd(-1)}
              aria-label="Nudge end 1 second earlier"
              className="flex h-7 w-7 items-center justify-center rounded border border-slate-800 bg-slate-900 text-slate-300 hover:border-slate-700 hover:text-white transition-colors cursor-pointer"
            >
              <Minus className="h-3 w-3" />
            </button>
            <button
              type="button"
              onClick={() => nudgeEnd(1)}
              aria-label="Nudge end 1 second later"
              className="flex h-7 w-7 items-center justify-center rounded border border-slate-800 bg-slate-900 text-slate-300 hover:border-slate-700 hover:text-white transition-colors cursor-pointer"
            >
              <Plus className="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
