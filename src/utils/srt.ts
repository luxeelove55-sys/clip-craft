import type { ClipCaptionCue } from '../types';

function formatSrtTimestamp(seconds: number): string {
  const safeMs = Math.max(0, Math.round(seconds * 1000));
  const hours = Math.floor(safeMs / 3600000);
  const minutes = Math.floor((safeMs % 3600000) / 60000);
  const secs = Math.floor((safeMs % 60000) / 1000);
  const ms = safeMs % 1000;

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
}

export function buildSrtContent(cues: ClipCaptionCue[], clipDuration: number): string {
  const sorted = [...cues]
    .filter((c) => c.text.trim().length > 0)
    .sort((a, b) => a.startOffset - b.startOffset);

  if (sorted.length === 0) {
    return `1\n00:00:00,000 --> ${formatSrtTimestamp(Math.max(1, clipDuration))}\n[No captions added]\n`;
  }

  return sorted
    .map((cue, index) => {
      const start = Math.max(0, cue.startOffset);
      const end = Math.min(clipDuration, Math.max(start + 0.4, cue.endOffset));
      return `${index + 1}\n${formatSrtTimestamp(start)} --> ${formatSrtTimestamp(end)}\n${cue.text.trim()}\n`;
    })
    .join('\n');
}

export function downloadTextFile(filename: string, content: string, mimeType = 'text/plain;charset=utf-8'): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
