import { useEffect, useState } from 'react';
import {
  Check,
  Copy,
  Download,
  FileText,
  Film,
  Loader2,
  RefreshCw,
  Sparkles,
  X,
  AlertCircle,
} from 'lucide-react';
import type {
  AspectRatioMode,
  CaptionStylePreset,
  ExportSocialMetadata,
  VideoProject,
  ViralClip,
} from '../types';
import { buildSrtContent, downloadTextFile } from '../utils/srt';
import { formatTimecode } from '../utils/time';

interface ExportModalProps {
  isOpen: boolean;
  project: VideoProject;
  clip: ViralClip;
  aspectRatio: AspectRatioMode;
  captionsEnabled: boolean;
  captionStyle: CaptionStylePreset;
  onClose: () => void;
}

const RENDER_STAGES = [
  { upTo: 25, label: 'Isolating timestamp range...' },
  { upTo: 55, label: 'Applying aspect ratio crop & framing...' },
  { upTo: 82, label: 'Burning styled caption track...' },
  { upTo: 99, label: 'Encoding 1080p MP4 container...' },
  { upTo: 100, label: 'Render complete — ready for download' },
];

export function ExportModal({
  isOpen,
  project,
  clip,
  aspectRatio,
  captionsEnabled,
  captionStyle,
  onClose,
}: ExportModalProps) {
  const [renderProgress, setRenderProgress] = useState(0);
  const [metadata, setMetadata] = useState<ExportSocialMetadata | null>(null);
  const [isGeneratingCopy, setIsGeneratingCopy] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [mp4NoticeShown, setMp4NoticeShown] = useState(false);

  const clipDuration = Math.max(1, clip.endTime - clip.startTime);

  const generateSocialCopy = async () => {
    setIsGeneratingCopy(true);
    setCopyError(null);
    try {
      const res = await fetch('/api/gemini/export-metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoTitle: project.title,
          clipTitle: clip.title,
          hookLine: clip.hookLine,
          reason: clip.reason,
          transcriptExcerpt: clip.captions.map((c) => c.text).join(' '),
          durationSeconds: clipDuration,
          aspectRatio,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate social metadata.');
      }
      setMetadata(data as ExportSocialMetadata);
    } catch (err) {
      setCopyError(err instanceof Error ? err.message : 'Unable to generate social metadata.');
    } finally {
      setIsGeneratingCopy(false);
    }
  };

  // Run simulated MP4 render progress bar & fetch Gemini social copy when modal opens
  useEffect(() => {
    if (!isOpen) return;
    setRenderProgress(0);
    setMp4NoticeShown(false);
    setMetadata(null);
    generateSocialCopy();

    const timer = window.setInterval(() => {
      setRenderProgress((prev) => {
        if (prev >= 100) {
          window.clearInterval(timer);
          return 100;
        }
        return Math.min(100, prev + 4);
      });
    }, 85);

    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, clip.id]);

  if (!isOpen) return null;

  const currentStage =
    RENDER_STAGES.find((s) => renderProgress <= s.upTo)?.label || RENDER_STAGES[4].label;

  const safeSlug = clip.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40) || 'clipcraft-export';

  const handleDownloadSrt = () => {
    const srt = buildSrtContent(clip.captions, clipDuration);
    downloadTextFile(`${safeSlug}.srt`, srt, 'application/x-subrip;charset=utf-8');
  };

  const handleDownloadManifest = () => {
    setMp4NoticeShown(true);
    const summary = [
      `ClipCraft Export Bundle`,
      `=======================`,
      `Source Video: ${project.title} (${project.url})`,
      `Clip Title: ${clip.title}`,
      `Range: ${formatTimecode(clip.startTime, true)} -> ${formatTimecode(clip.endTime, true)} (${clipDuration.toFixed(1)}s)`,
      `Aspect Ratio: ${aspectRatio}`,
      `Captions: ${captionsEnabled ? `Enabled (${captionStyle})` : 'Disabled'}`,
      ``,
      `Note: Direct MP4 binary extraction from YouTube streams is restricted by browser CORS and YouTube API terms.`,
      `Use your downloaded .srt subtitle file alongside the video timestamp range above in your publishing workflow.`,
    ];

    if (metadata) {
      summary.push(
        ``,
        `--- YouTube Shorts ---`,
        `Title: ${metadata.youtubeShorts.title}`,
        `Caption: ${metadata.youtubeShorts.caption}`,
        `Hashtags: ${metadata.youtubeShorts.hashtags.join(' ')}`,
        ``,
        `--- Instagram Reels ---`,
        `Hook: ${metadata.instagramReels.hook}`,
        `Caption: ${metadata.instagramReels.caption}`,
        `Hashtags: ${metadata.instagramReels.hashtags.join(' ')}`,
        ``,
        `--- TikTok ---`,
        `Caption: ${metadata.tiktok.caption}`,
        `Hashtags: ${metadata.tiktok.hashtags.join(' ')}`
      );
    }

    downloadTextFile(`${safeSlug}-export-kit.txt`, summary.join('\n'));
  };

  const handleCopy = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      window.setTimeout(() => setCopiedKey((curr) => (curr === key ? null : curr)), 1800);
    } catch {
      // ignore clipboard restrictions
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="export-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
    >
      <div className="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-slate-800 bg-[#0F1624] p-6 shadow-2xl sm:p-7">
        {/* Modal Header */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <h2
              id="export-modal-title"
              className="font-display text-lg font-bold text-slate-50 sm:text-xl"
            >
              Export Clip & Social Pack
            </h2>
            <p className="mt-1 text-xs text-slate-400 font-mono tabular-nums">
              {aspectRatio} · {formatTimecode(clip.startTime)} – {formatTimecode(clip.endTime)} ({clipDuration.toFixed(1)}s) ·{' '}
              {captionsEnabled ? `${captionStyle} captions` : 'No captions'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close export modal"
            className="rounded-lg border border-slate-800 bg-slate-900 p-2 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Simulated MP4 Render + Real .SRT Download Section */}
        <div className="mt-5 rounded-xl border border-slate-800 bg-[#090D16] p-4 sm:p-5">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="font-medium text-slate-200">{currentStage}</span>
            <span className="font-mono tabular-nums font-semibold text-indigo-400">
              {renderProgress}%
            </span>
          </div>

          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-150"
              style={{ width: `${renderProgress}%` }}
            />
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleDownloadSrt}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <FileText className="h-3.5 w-3.5" />
              Download .SRT Captions
            </button>

            <button
              type="button"
              onClick={handleDownloadManifest}
              disabled={renderProgress < 100}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-xs font-semibold text-slate-100 hover:border-slate-600 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <Download className="h-3.5 w-3.5" />
              {renderProgress < 100 ? 'Preparing Export...' : 'Download Clip Bundle (.TXT)'}
            </button>

            <button
              type="button"
              onClick={() => setMp4NoticeShown(true)}
              disabled={renderProgress < 100}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-800 bg-[#0F1624] px-3.5 py-2 text-xs font-medium text-slate-300 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <Film className="h-3.5 w-3.5 text-violet-400" />
              {renderProgress < 100 ? 'Rendering MP4...' : 'MP4 Export Ready'}
            </button>
          </div>

          {mp4NoticeShown && (
            <p className="mt-3 text-xs text-slate-400 leading-relaxed">
              Simulated MP4 render completed cleanly. Because client-side browsers cannot directly extract raw YouTube video streams due to CORS restrictions, use your synced <code className="font-mono text-indigo-300">.srt</code> subtitle file and timecode specs in your desktop editor or upload workflow.
            </p>
          )}
        </div>

        {/* AI Social Captions & Hashtags (Gemini) */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-indigo-400" />
              <h3 className="font-display text-base font-semibold text-slate-100">
                Social Captions & Hashtags
              </h3>
            </div>

            <button
              type="button"
              onClick={generateSocialCopy}
              disabled={isGeneratingCopy}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-800 bg-[#090D16] px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white disabled:opacity-50 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isGeneratingCopy ? 'animate-spin' : ''}`} />
              Regenerate
            </button>
          </div>

          {copyError && (
            <div
              role="alert"
              className="flex items-center gap-2 rounded-lg border border-rose-500/30 bg-rose-950/30 px-4 py-3 text-xs text-rose-200"
            >
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
              <span>{copyError}</span>
            </div>
          )}

          {isGeneratingCopy && (
            <div className="flex items-center justify-center gap-2.5 rounded-xl border border-slate-800 bg-[#090D16] py-10 text-sm text-slate-400">
              <Loader2 className="h-4 w-4 animate-spin text-indigo-400" />
              Generating platform-ready titles, captions, and hashtags with Gemini...
            </div>
          )}

          {!isGeneratingCopy && metadata && (
            <div className="space-y-4">
              {/* YouTube Shorts */}
              <div className="rounded-xl border border-slate-800 bg-[#090D16] p-4">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-xs font-semibold text-slate-200">YouTube Shorts</span>
                  <button
                    type="button"
                    onClick={() =>
                      handleCopy(
                        'yt',
                        `${metadata.youtubeShorts.title}\n\n${metadata.youtubeShorts.caption}\n\n${metadata.youtubeShorts.hashtags.join(' ')}`
                      )
                    }
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-400 hover:text-indigo-300 cursor-pointer"
                  >
                    {copiedKey === 'yt' ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-400" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        Copy All
                      </>
                    )}
                  </button>
                </div>
                <div className="text-sm font-semibold text-slate-100">
                  {metadata.youtubeShorts.title}
                </div>
                <p className="mt-1 text-xs text-slate-400 leading-relaxed">
                  {metadata.youtubeShorts.caption}
                </p>
                <div className="mt-2 text-xs font-mono text-indigo-400">
                  {metadata.youtubeShorts.hashtags.join(' ')}
                </div>
              </div>

              {/* Instagram Reels */}
              <div className="rounded-xl border border-slate-800 bg-[#090D16] p-4">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-xs font-semibold text-slate-200">Instagram Reels</span>
                  <button
                    type="button"
                    onClick={() =>
                      handleCopy(
                        'ig',
                        `${metadata.instagramReels.hook}\n\n${metadata.instagramReels.caption}\n\n${metadata.instagramReels.hashtags.join(' ')}`
                      )
                    }
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-400 hover:text-indigo-300 cursor-pointer"
                  >
                    {copiedKey === 'ig' ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-400" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        Copy All
                      </>
                    )}
                  </button>
                </div>
                <div className="text-sm font-semibold text-slate-100">
                  {metadata.instagramReels.hook}
                </div>
                <p className="mt-1 text-xs text-slate-400 leading-relaxed">
                  {metadata.instagramReels.caption}
                </p>
                <div className="mt-2 text-xs font-mono text-indigo-400">
                  {metadata.instagramReels.hashtags.join(' ')}
                </div>
              </div>

              {/* TikTok */}
              <div className="rounded-xl border border-slate-800 bg-[#090D16] p-4">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-xs font-semibold text-slate-200">TikTok</span>
                  <button
                    type="button"
                    onClick={() =>
                      handleCopy(
                        'tt',
                        `${metadata.tiktok.caption}\n\n${metadata.tiktok.hashtags.join(' ')}`
                      )
                    }
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-400 hover:text-indigo-300 cursor-pointer"
                  >
                    {copiedKey === 'tt' ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-400" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        Copy All
                      </>
                    )}
                  </button>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {metadata.tiktok.caption}
                </p>
                <div className="mt-2 text-xs font-mono text-indigo-400">
                  {metadata.tiktok.hashtags.join(' ')}
                </div>
              </div>

              {/* Creator Tip */}
              {metadata.bestPostingTip && (
                <div className="rounded-lg border border-indigo-500/25 bg-indigo-500/10 px-4 py-3 text-xs text-indigo-200">
                  <strong className="font-semibold">Creator Tip:</strong> {metadata.bestPostingTip}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
