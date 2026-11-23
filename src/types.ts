export type AspectRatioMode = '9:16' | '1:1' | '16:9';

export type CaptionStylePreset = 'bold-yellow' | 'minimal-white' | 'neon';

export interface TranscriptSegment {
  start: number;
  duration: number;
  text: string;
}

export interface ClipCaptionCue {
  id: string;
  startOffset: number; // seconds relative to clip startTime
  endOffset: number;   // seconds relative to clip startTime
  text: string;
}

export interface ViralClip {
  id: string;
  title: string;
  viralScore: number;
  startTime: number;
  endTime: number;
  reason: string;
  hookLine: string;
  captions: ClipCaptionCue[];
}

export interface VideoProject {
  videoId: string;
  url: string;
  title: string;
  author: string;
  thumbnailUrl: string;
  durationSeconds: number;
  description: string;
  transcript: TranscriptSegment[];
  hasRealTranscript: boolean;
  isSample?: boolean;
}

export interface ExportSocialMetadata {
  youtubeShorts: {
    title: string;
    caption: string;
    hashtags: string[];
  };
  instagramReels: {
    hook: string;
    caption: string;
    hashtags: string[];
  };
  tiktok: {
    caption: string;
    hashtags: string[];
  };
  bestPostingTip: string;
}
