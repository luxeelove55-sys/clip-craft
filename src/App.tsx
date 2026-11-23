import { useCallback, useState } from 'react';
import { TopNav } from './components/TopNav';
import { HeroLoader } from './components/HeroLoader';
import { ViralClipsPanel } from './components/ViralClipsPanel';
import { ClipEditorWorkspace } from './components/ClipEditorWorkspace';
import { ExportModal } from './components/ExportModal';
import { SAMPLE_VIDEO_PROJECT, SAMPLE_VIRAL_CLIPS } from './data/sampleVideo';
import type {
  AspectRatioMode,
  CaptionStylePreset,
  VideoProject,
  ViralClip,
} from './types';

export default function App() {
  const [project, setProject] = useState<VideoProject | null>(null);
  const [clips, setClips] = useState<ViralClip[]>([]);
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);

  const [isLoadingVideo, setIsLoadingVideo] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [customNotes, setCustomNotes] = useState('');

  // Studio Editor States
  const [aspectRatio, setAspectRatio] = useState<AspectRatioMode>('9:16');
  const [cropOffsetPercent, setCropOffsetPercent] = useState(0);
  const [captionsEnabled, setCaptionsEnabled] = useState(true);
  const [captionStyle, setCaptionStyle] = useState<CaptionStylePreset>('bold-yellow');

  // Playback Sync States
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLooping, setIsLooping] = useState(true);
  const [seekNonce, setSeekNonce] = useState(0);
  const [seekTarget, setSeekTarget] = useState<number | null>(null);

  // Export Modal State
  const [isExportOpen, setIsExportOpen] = useState(false);

  const selectedClip = clips.find((c) => c.id === selectedClipId) || null;

  const handleSeek = useCallback((time: number) => {
    const safe = Math.max(0, time);
    setCurrentTime(safe);
    setSeekTarget(safe);
    setSeekNonce((n) => n + 1);
  }, []);

  const handleSelectClip = useCallback((clipId: string) => {
    setSelectedClipId(clipId);
    const target = clips.find((c) => c.id === clipId);
    if (target) {
      setIsPlaying(false);
      setCurrentTime(target.startTime);
      setSeekTarget(target.startTime);
      setSeekNonce((n) => n + 1);
    }
    const el = document.getElementById('clip-editor');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [clips]);

  const handleLoadUrl = async (url: string) => {
    setIsLoadingVideo(true);
    setVideoError(null);
    setAnalysisError(null);
    setIsPlaying(false);

    try {
      const res = await fetch('/api/youtube/info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Could not load YouTube video.');
      }

      const loadedProject = data as VideoProject;
      setProject(loadedProject);
      setClips([]);
      setSelectedClipId(null);
      setCurrentTime(0);
    } catch (err) {
      setVideoError(
        err instanceof Error ? err.message : 'Unable to load the requested YouTube URL.'
      );
    } finally {
      setIsLoadingVideo(false);
    }
  };

  const handleTrySample = () => {
    setVideoError(null);
    setAnalysisError(null);
    setIsPlaying(false);
    setProject(SAMPLE_VIDEO_PROJECT);
    setClips(SAMPLE_VIRAL_CLIPS);
    const first = SAMPLE_VIRAL_CLIPS[0];
    setSelectedClipId(first.id);
    setCurrentTime(first.startTime);
    setSeekTarget(first.startTime);
    setSeekNonce((n) => n + 1);
  };

  const handleAnalyzeClips = async () => {
    if (!project) return;
    setIsAnalyzing(true);
    setAnalysisError(null);
    setIsPlaying(false);

    try {
      const res = await fetch('/api/gemini/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoId: project.videoId,
          title: project.title,
          author: project.author,
          durationSeconds: project.durationSeconds,
          description: project.description,
          transcript: project.transcript,
          customNotes,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gemini analysis failed.');
      }

      const nextClips = (data.clips || []) as ViralClip[];
      if (nextClips.length === 0) {
        throw new Error('Gemini did not return any clip segments. Try adding context notes.');
      }

      setClips(nextClips);
      setSelectedClipId(nextClips[0].id);
      setCurrentTime(nextClips[0].startTime);
      setSeekTarget(nextClips[0].startTime);
      setSeekNonce((n) => n + 1);

      const el = document.getElementById('viral-finder');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    } catch (err) {
      setAnalysisError(
        err instanceof Error ? err.message : 'Unable to analyze video clips right now.'
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleUpdateClip = (updated: ViralClip) => {
    setClips((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
  };

  const handleResetProject = () => {
    setIsPlaying(false);
    setProject(null);
    setClips([]);
    setSelectedClipId(null);
    setVideoError(null);
    setAnalysisError(null);
    setCustomNotes('');
  };

  return (
    <div id="top" className="min-h-screen flex flex-col bg-[#090D16] text-slate-100">
      <TopNav
        hasProject={Boolean(project)}
        onTrySample={handleTrySample}
        onResetProject={handleResetProject}
      />

      <main className="flex-1">
        <HeroLoader
          project={project}
          isLoadingVideo={isLoadingVideo}
          isAnalyzing={isAnalyzing}
          videoError={videoError}
          customNotes={customNotes}
          onCustomNotesChange={setCustomNotes}
          onLoadUrl={handleLoadUrl}
          onTrySample={handleTrySample}
          onAnalyzeClips={handleAnalyzeClips}
        />

        <ViralClipsPanel
          clips={clips}
          selectedClipId={selectedClipId}
          isAnalyzing={isAnalyzing}
          analysisError={analysisError}
          hasProject={Boolean(project)}
          onSelectClip={handleSelectClip}
          onAnalyze={handleAnalyzeClips}
        />

        {project && selectedClip && (
          <ClipEditorWorkspace
            project={project}
            clips={clips}
            selectedClip={selectedClip}
            aspectRatio={aspectRatio}
            cropOffsetPercent={cropOffsetPercent}
            captionsEnabled={captionsEnabled}
            captionStyle={captionStyle}
            currentTime={currentTime}
            isPlaying={isPlaying}
            isLooping={isLooping}
            seekNonce={seekNonce}
            seekTarget={seekTarget}
            onSelectClip={handleSelectClip}
            onUpdateClip={handleUpdateClip}
            onAspectRatioChange={setAspectRatio}
            onCropOffsetChange={setCropOffsetPercent}
            onToggleCaptions={() => setCaptionsEnabled((v) => !v)}
            onCaptionStyleChange={setCaptionStyle}
            onTimeUpdate={setCurrentTime}
            onPlayStateChange={setIsPlaying}
            onToggleLoop={() => setIsLooping((v) => !v)}
            onSeek={handleSeek}
            onOpenExport={() => {
              setIsPlaying(false);
              setIsExportOpen(true);
            }}
          />
        )}

        {/* Workflow & Capabilities Overview */}
        <section id="workflow" className="bg-[#090D16]">
          <div className="mx-auto max-w-[1400px] px-4 py-14 sm:px-6 lg:px-8">
            <div className="max-w-2xl">
              <h2 className="font-display text-xl font-bold tracking-tight text-slate-50 sm:text-2xl">
                Built for high-retention short-form workflows
              </h2>
              <p className="mt-2 text-sm text-slate-400 leading-relaxed">
                From long-form interviews, podcasts, and keynotes to publish-ready vertical cuts in three streamlined stages.
              </p>
            </div>

            <div className="mt-8 grid gap-6 md:grid-cols-3">
              <div className="rounded-xl border border-slate-800/90 bg-[#0F1624] p-6">
                <div className="font-mono tabular-nums text-xs font-semibold text-indigo-400">
                  01. Moment Discovery
                </div>
                <h3 className="mt-2 font-display text-base font-semibold text-slate-100">
                  Gemini Viral Hook Finder
                </h3>
                <p className="mt-2 text-sm text-slate-400 leading-relaxed">
                  Scans video metadata and timestamped transcripts to pinpoint 3–5 scroll-stopping segments scored by retention potential.
                </p>
              </div>

              <div className="rounded-xl border border-slate-800/90 bg-[#0F1624] p-6">
                <div className="font-mono tabular-nums text-xs font-semibold text-indigo-400">
                  02. Vertical Reframing
                </div>
                <h3 className="mt-2 font-display text-base font-semibold text-slate-100">
                  Live 9:16 Studio Preview
                </h3>
                <p className="mt-2 text-sm text-slate-400 leading-relaxed">
                  Trim exact in/out timestamps on an interactive scrubber, pan horizontal framing, and preview styled captions over real YouTube playback.
                </p>
              </div>

              <div className="rounded-xl border border-slate-800/90 bg-[#0F1624] p-6">
                <div className="font-mono tabular-nums text-xs font-semibold text-indigo-400">
                  03. Caption & Copy Export
                </div>
                <h3 className="mt-2 font-display text-base font-semibold text-slate-100">
                  Synced .SRT & Social Metadata
                </h3>
                <p className="mt-2 text-sm text-slate-400 leading-relaxed">
                  Download clean SubRip (.srt) caption tracks alongside Gemini-crafted titles, descriptions, and hashtags for Shorts, Reels, and TikTok.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-800/80 bg-[#090D16]">
        <div className="mx-auto flex max-w-[1400px] flex-col items-center justify-between gap-4 px-4 py-6 text-xs text-slate-500 sm:flex-row sm:px-6 lg:px-8">
          <span>ClipCraft · Short-Form YouTube Studio</span>
          <div className="flex items-center gap-6">
            <a href="#loader" className="hover:text-slate-300 transition-colors">
              Video Source
            </a>
            <a href="#viral-finder" className="hover:text-slate-300 transition-colors">
              Viral Finder
            </a>
            <a href="#clip-editor" className="hover:text-slate-300 transition-colors">
              Clip Studio
            </a>
          </div>
        </div>
      </footer>

      {project && selectedClip && (
        <ExportModal
          isOpen={isExportOpen}
          project={project}
          clip={selectedClip}
          aspectRatio={aspectRatio}
          captionsEnabled={captionsEnabled}
          captionStyle={captionStyle}
          onClose={() => setIsExportOpen(false)}
        />
      )}
    </div>
  );
}
