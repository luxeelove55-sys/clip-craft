import { useEffect, useRef, useState } from 'react';
import { Eye, EyeOff, Pause, Play, Volume2, VolumeX, Heart, MessageCircle, Share2 } from 'lucide-react';
import type { AspectRatioMode, CaptionStylePreset, ClipCaptionCue } from '../types';
import { formatTimecode } from '../utils/time';

interface YTPlayerInstance {
  playVideo: () => void;
  pauseVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  getCurrentTime: () => number;
  mute: () => void;
  unMute: () => void;
  isMuted: () => boolean;
  cueVideoById: (opts: { videoId: string; startSeconds?: number }) => void;
  destroy: () => void;
}

interface YTGlobal {
  Player: new (
    el: HTMLElement,
    options: {
      videoId: string;
      width?: string | number;
      height?: string | number;
      playerVars?: Record<string, string | number>;
      events?: {
        onReady?: () => void;
        onStateChange?: (event: { data: number }) => void;
        onError?: (event: { data: number }) => void;
      };
    }
  ) => YTPlayerInstance;
  PlayerState: {
    ENDED: number;
    PLAYING: number;
    PAUSED: number;
    BUFFERING: number;
    CUED: number;
  };
}

declare global {
  interface Window {
    YT?: YTGlobal;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let ytApiPromise: Promise<YTGlobal> | null = null;

function loadYouTubeIframeApi(): Promise<YTGlobal> {
  if (window.YT?.Player) {
    return Promise.resolve(window.YT);
  }
  if (ytApiPromise) {
    return ytApiPromise;
  }

  ytApiPromise = new Promise((resolve) => {
    const prevCallback = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (prevCallback) prevCallback();
      if (window.YT) resolve(window.YT);
    };

    const existing = document.querySelector('script[src="https://www.youtube.com/iframe_api"]');
    if (!existing) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      tag.async = true;
      document.head.appendChild(tag);
    }
  });

  return ytApiPromise;
}

interface YouTubePreviewPlayerProps {
  videoId: string;
  thumbnailUrl: string;
  startTime: number;
  endTime: number;
  currentTime: number;
  isPlaying: boolean;
  isLooping: boolean;
  aspectRatio: AspectRatioMode;
  cropOffsetPercent: number; // -50 to +50
  captionsEnabled: boolean;
  captionStyle: CaptionStylePreset;
  captions: ClipCaptionCue[];
  seekNonce: number;
  seekTarget: number | null;
  onTimeUpdate: (time: number) => void;
  onPlayStateChange: (playing: boolean) => void;
}

export function YouTubePreviewPlayer({
  videoId,
  thumbnailUrl,
  startTime,
  endTime,
  currentTime,
  isPlaying,
  isLooping,
  aspectRatio,
  cropOffsetPercent,
  captionsEnabled,
  captionStyle,
  captions,
  seekNonce,
  seekTarget,
  onTimeUpdate,
  onPlayStateChange,
}: YouTubePreviewPlayerProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayerInstance | null>(null);
  const loadedVideoRef = useRef<string | null>(null);

  const [playerReady, setPlayerReady] = useState(false);
  const [embedBlocked, setEmbedBlocked] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showSafeZone, setShowSafeZone] = useState(false);

  // Refs to keep event/interval closures fresh
  const boundsRef = useRef({ startTime, endTime, isLooping });
  boundsRef.current = { startTime, endTime, isLooping };

  const currentTimeRef = useRef(currentTime);
  currentTimeRef.current = currentTime;

  const callbacksRef = useRef({ onTimeUpdate, onPlayStateChange });
  callbacksRef.current = { onTimeUpdate, onPlayStateChange };

  // Initialize YouTube Player
  useEffect(() => {
    let active = true;
    setPlayerReady(false);
    setEmbedBlocked(false);

    loadYouTubeIframeApi().then((YT) => {
      if (!active || !hostRef.current) return;

      // Clear previous mount node cleanly
      hostRef.current.innerHTML = '';
      const mountEl = document.createElement('div');
      mountEl.className = 'w-full h-full';
      hostRef.current.appendChild(mountEl);

      loadedVideoRef.current = videoId;

      const player = new YT.Player(mountEl, {
        videoId,
        width: '100%',
        height: '100%',
        playerVars: {
          autoplay: 0,
          controls: 0,
          disablekb: 1,
          fs: 0,
          iv_load_policy: 3,
          modestbranding: 1,
          playsinline: 1,
          rel: 0,
          start: Math.floor(boundsRef.current.startTime),
        },
        events: {
          onReady: () => {
            if (!active) return;
            setPlayerReady(true);
            try {
              player.seekTo(boundsRef.current.startTime, true);
            } catch {
              // ignore
            }
          },
          onStateChange: (ev) => {
            if (!active) return;
            if (ev.data === YT.PlayerState.PLAYING) {
              callbacksRef.current.onPlayStateChange(true);
            } else if (
              ev.data === YT.PlayerState.PAUSED ||
              ev.data === YT.PlayerState.ENDED
            ) {
              callbacksRef.current.onPlayStateChange(false);
            }
          },
          onError: () => {
            if (!active) return;
            setEmbedBlocked(true);
            setPlayerReady(true);
          },
        },
      });

      playerRef.current = player;
    });

    return () => {
      active = false;
      try {
        playerRef.current?.destroy();
      } catch {
        // ignore
      }
      playerRef.current = null;
    };
  }, [videoId]);

  // Sync play/pause commands from parent
  useEffect(() => {
    if (!playerReady || embedBlocked || !playerRef.current) return;
    try {
      if (isPlaying) {
        playerRef.current.playVideo();
      } else {
        playerRef.current.pauseVideo();
      }
    } catch {
      // ignore transient state errors
    }
  }, [isPlaying, playerReady, embedBlocked]);

  // Sync explicit seeks
  useEffect(() => {
    if (seekTarget === null || !playerReady) return;
    if (!embedBlocked && playerRef.current) {
      try {
        playerRef.current.seekTo(seekTarget, true);
      } catch {
        // ignore
      }
    }
    onTimeUpdate(seekTarget);
  }, [seekNonce, seekTarget, playerReady, embedBlocked, onTimeUpdate]);

  // Poll playback position (or simulate smoothly if embed is blocked by video owner)
  useEffect(() => {
    if (!isPlaying) return;

    const timer = window.setInterval(() => {
      const { startTime: s, endTime: e, isLooping: loop } = boundsRef.current;

      if (!embedBlocked && playerRef.current) {
        try {
          const t = playerRef.current.getCurrentTime();
          if (Number.isFinite(t)) {
            if (t >= e) {
              if (loop) {
                playerRef.current.seekTo(s, true);
                callbacksRef.current.onTimeUpdate(s);
              } else {
                playerRef.current.pauseVideo();
                callbacksRef.current.onPlayStateChange(false);
                callbacksRef.current.onTimeUpdate(e);
              }
            } else {
              callbacksRef.current.onTimeUpdate(t);
            }
          }
        } catch {
          // ignore
        }
      } else {
        // Fallback timer when YouTube disables external embedding on a specific video
        const next = currentTimeRef.current + 0.1;
        if (next >= e) {
          if (loop) {
            callbacksRef.current.onTimeUpdate(s);
          } else {
            callbacksRef.current.onPlayStateChange(false);
            callbacksRef.current.onTimeUpdate(e);
          }
        } else {
          callbacksRef.current.onTimeUpdate(next);
        }
      }
    }, 100);

    return () => window.clearInterval(timer);
  }, [isPlaying, embedBlocked]);

  const togglePlay = () => {
    if (!isPlaying && (currentTime >= endTime - 0.2 || currentTime < startTime)) {
      if (!embedBlocked && playerRef.current) {
        try {
          playerRef.current.seekTo(startTime, true);
        } catch {
          // ignore
        }
      }
      onTimeUpdate(startTime);
    }
    onPlayStateChange(!isPlaying);
  };

  const toggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    if (!embedBlocked && playerRef.current) {
      try {
        if (nextMuted) playerRef.current.mute();
        else playerRef.current.unMute();
      } catch {
        // ignore
      }
    }
  };

  // Compute active caption cue based on elapsed time inside the clip
  const clipElapsed = Math.max(0, currentTime - startTime);
  const activeCue = captions.find(
    (cue) => clipElapsed >= cue.startOffset && clipElapsed <= cue.endOffset
  );

  // Proportional width calculation to crop 16:9 YouTube player edge-to-edge cleanly
  const iframeWidthStyle =
    aspectRatio === '9:16'
      ? '316.05%' // (16/9) / (9/16) = 256/81 = 3.1605x
      : aspectRatio === '1:1'
        ? '177.78%' // (16/9) / 1 = 1.7778x
        : '100%';

  // Clamp translateX based on cropOffsetPercent (-50..50)
  const maxShiftPct =
    aspectRatio === '9:16' ? 34 : aspectRatio === '1:1' ? 21 : 0;
  const shiftPct = (cropOffsetPercent / 50) * maxShiftPct;

  const frameSizeClass =
    aspectRatio === '9:16'
      ? 'w-[288px] sm:w-[324px] aspect-[9/16]'
      : aspectRatio === '1:1'
        ? 'w-[320px] sm:w-[376px] aspect-square'
        : 'w-full max-w-[560px] aspect-video';

  return (
    <div className="flex flex-col items-center">
      {/* Top Preview Controls Strip */}
      <div className="mb-3 flex w-full max-w-[560px] items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-2 font-mono tabular-nums">
          <span className="text-slate-200 font-medium">{aspectRatio}</span>
          <span aria-hidden="true">·</span>
          <span>
            {formatTimecode(clipElapsed, true)} / {formatTimecode(Math.max(1, endTime - startTime), true)}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowSafeZone((v) => !v)}
            className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              showSafeZone
                ? 'border-indigo-500/60 bg-indigo-500/15 text-indigo-300'
                : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-200'
            }`}
          >
            {showSafeZone ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
            Safe Zones
          </button>

          <button
            type="button"
            onClick={toggleMute}
            aria-label={isMuted ? 'Unmute preview' : 'Mute preview'}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-800 bg-slate-900 text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            {isMuted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      {/* Device Frame Viewport */}
      <div
        className={`relative overflow-hidden rounded-[26px] border-[3px] border-slate-800 bg-black shadow-2xl transition-all duration-300 ${frameSizeClass}`}
      >
        {/* Scaled & Reframed YouTube Player Container */}
        <div
          className="pointer-events-none absolute inset-y-0 left-1/2 h-full transition-transform duration-150"
          style={{
            width: iframeWidthStyle,
            transform: `translateX(calc(-50% + ${shiftPct}%))`,
          }}
        >
          {embedBlocked ? (
            <div className="relative h-full w-full">
              <img
                src={thumbnailUrl}
                alt="Video preview fallback"
                referrerPolicy="no-referrer"
                className="h-full w-full object-cover opacity-85"
              />
              <div className="absolute top-4 left-1/2 -translate-x-1/2 rounded-md bg-black/75 px-3 py-1.5 text-center text-[11px] text-slate-300 whitespace-nowrap">
                YouTube embed disabled by owner — simulated playback active
              </div>
            </div>
          ) : (
            <div ref={hostRef} className="h-full w-full" />
          )}
        </div>

        {/* Contrast Scrim for Caption Legibility */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-black/85 via-black/35 to-transparent"
        />

        {/* Animated Caption Overlay */}
        {captionsEnabled && activeCue && (
          <div
            className={`pointer-events-none absolute inset-x-4 z-20 flex justify-center text-center transition-all duration-150 ${
              aspectRatio === '9:16' ? 'bottom-16' : 'bottom-8'
            }`}
          >
            {captionStyle === 'bold-yellow' && (
              <p
                key={activeCue.id}
                className="font-display text-lg sm:text-xl font-extrabold uppercase tracking-tight leading-tight text-yellow-400 drop-shadow-[0_3px_0_rgba(0,0,0,0.98)]"
                style={{
                  WebkitTextStroke: '1px rgba(0,0,0,0.85)',
                  textShadow: '0 4px 14px rgba(0,0,0,0.9)',
                }}
              >
                {activeCue.text}
              </p>
            )}

            {captionStyle === 'minimal-white' && (
              <p
                key={activeCue.id}
                className="max-w-[92%] rounded-lg bg-slate-950/80 px-3.5 py-2 text-sm sm:text-base font-medium leading-snug text-white backdrop-blur-sm border border-white/10"
              >
                {activeCue.text}
              </p>
            )}

            {captionStyle === 'neon' && (
              <p
                key={activeCue.id}
                className="font-display text-base sm:text-lg font-bold tracking-wide leading-snug text-indigo-100"
                style={{
                  textShadow:
                    '0 0 12px rgba(129,140,248,0.95), 0 0 26px rgba(139,92,246,0.85), 0 2px 4px rgba(0,0,0,0.95)',
                }}
              >
                {activeCue.text}
              </p>
            )}
          </div>
        )}

        {/* Optional Shorts / Reels Safe-Zone Wireframe Overlay */}
        {showSafeZone && aspectRatio === '9:16' && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-10 flex flex-col justify-end p-3.5"
          >
            <div className="flex items-end justify-between gap-4 opacity-55">
              <div className="space-y-1.5 pb-2">
                <div className="h-2.5 w-24 rounded bg-white/40" />
                <div className="h-2 w-36 rounded bg-white/30" />
              </div>
              <div className="flex flex-col items-center gap-3 pb-2 text-white/80">
                <Heart className="h-5 w-5" />
                <MessageCircle className="h-5 w-5" />
                <Share2 className="h-5 w-5" />
              </div>
            </div>
          </div>
        )}

        {/* Click-to-Play Interactive Layer */}
        <button
          type="button"
          onClick={togglePlay}
          aria-label={isPlaying ? 'Pause clip preview' : 'Play clip preview'}
          className="group absolute inset-0 z-30 flex items-center justify-center bg-transparent cursor-pointer focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-indigo-400"
        >
          <span
            className={`flex h-12 w-12 items-center justify-center rounded-full bg-black/65 text-white backdrop-blur-sm border border-white/15 transition-opacity duration-150 ${
              isPlaying ? 'opacity-0 group-hover:opacity-100' : 'opacity-100'
            }`}
          >
            {isPlaying ? (
              <Pause className="h-5 w-5 fill-current" />
            ) : (
              <Play className="h-5 w-5 fill-current translate-x-0.5" />
            )}
          </span>
        </button>
      </div>
    </div>
  );
}
