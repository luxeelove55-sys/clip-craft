import dotenv from 'dotenv';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const MODEL_NAME = 'gemini-4-hydrogen';

interface TranscriptSegment {
  start: number;
  duration: number;
  text: string;
}

interface CaptionTrack {
  baseUrl?: string;
  languageCode?: string;
  kind?: string;
}

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw new Error(
      'GEMINI_API_KEY is not configured. Please add your API key in Settings > Secrets.'
    );
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function extractVideoId(input: string): string | null {
  const trimmed = String(input || '').trim();
  if (!trimmed) return null;
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;

  try {
    const normalized = trimmed.startsWith('http') ? trimmed : `https://${trimmed}`;
    const parsed = new URL(normalized);
    const host = parsed.hostname.replace(/^www\./, '');

    if (host === 'youtu.be') {
      const id = parsed.pathname.split('/').filter(Boolean)[0];
      return id && /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
    }

    if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'music.youtube.com') {
      const vParam = parsed.searchParams.get('v');
      if (vParam && /^[a-zA-Z0-9_-]{11}$/.test(vParam)) return vParam;

      const segments = parsed.pathname.split('/').filter(Boolean);
      if (segments.length >= 2 && ['shorts', 'embed', 'live', 'v'].includes(segments[0])) {
        const candidate = segments[1];
        if (/^[a-zA-Z0-9_-]{11}$/.test(candidate)) return candidate;
      }
    }
  } catch {
    // fallback regex below
  }

  const match = trimmed.match(/(?:v=|\/)([a-zA-Z0-9_-]{11})(?:[?&/]|$)/);
  return match ? match[1] : null;
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_m, dec) => String.fromCharCode(Number(dec)))
    .replace(/\s+/g, ' ')
    .trim();
}

function extractBalancedJson(html: string, marker: string): Record<string, unknown> | null {
  const idx = html.indexOf(marker);
  if (idx === -1) return null;
  const start = html.indexOf('{', idx + marker.length);
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < html.length; i++) {
    const ch = html[i];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (ch === '\\' && inString) {
      escaped = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (!inString) {
      if (ch === '{') depth++;
      else if (ch === '}') {
        depth--;
        if (depth === 0) {
          const raw = html.slice(start, i + 1);
          try {
            return JSON.parse(raw) as Record<string, unknown>;
          } catch {
            return null;
          }
        }
      }
    }
  }
  return null;
}

async function fetchTranscriptFromTrack(baseUrl: string): Promise<TranscriptSegment[]> {
  try {
    const jsonUrl = baseUrl.includes('fmt=') ? baseUrl : `${baseUrl}&fmt=json3`;
    const res = await fetch(jsonUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
      },
      signal: AbortSignal.timeout(6000),
    });

    if (res.ok) {
      const contentType = res.headers.get('content-type') || '';
      const rawText = await res.text();
      if (contentType.includes('json') || rawText.trim().startsWith('{')) {
        const parsed = JSON.parse(rawText) as {
          events?: Array<{
            tStartMs?: number;
            dDurationMs?: number;
            segs?: Array<{ utf8?: string }>;
          }>;
        };
        const segments: TranscriptSegment[] = [];
        for (const ev of parsed.events || []) {
          if (!ev.segs || typeof ev.tStartMs !== 'number') continue;
          const text = decodeHtmlEntities(ev.segs.map((s) => s.utf8 || '').join(''));
          if (!text || text === '\n') continue;
          segments.push({
            start: Math.round((ev.tStartMs / 1000) * 10) / 10,
            duration: Math.max(1, Math.round(((ev.dDurationMs || 3000) / 1000) * 10) / 10),
            text,
          });
        }
        if (segments.length > 0) return segments;
      }
    }
  } catch {
    // fallback to XML timedtext
  }

  try {
    const res = await fetch(baseUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
      },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return [];
    const xml = await res.text();
    const regex = /<text start="([^"]+)" dur="([^"]+)"[^>]*>([\s\S]*?)<\/text>/g;
    const segments: TranscriptSegment[] = [];
    let match: RegExpExecArray | null;
    while ((match = regex.exec(xml)) !== null) {
      const start = parseFloat(match[1]);
      const duration = parseFloat(match[2]) || 3;
      const text = decodeHtmlEntities(match[3].replace(/<[^>]+>/g, ' '));
      if (text && Number.isFinite(start)) {
        segments.push({
          start: Math.round(start * 10) / 10,
          duration: Math.round(duration * 10) / 10,
          text,
        });
      }
    }
    return segments;
  } catch {
    return [];
  }
}

function formatSecondsCompact(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${String(m).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
}

function formatApiError(err: unknown): { status: number; message: string } {
  const raw = err instanceof Error ? err.message : String(err || 'Unknown server error');
  if (raw.includes('GEMINI_API_KEY')) {
    return { status: 400, message: raw };
  }
  if (raw.includes('API_KEY_INVALID') || raw.includes('PERMISSION_DENIED') || raw.includes('403')) {
    return {
      status: 403,
      message:
        'Gemini API key was rejected or lacks permission. Please verify your key in Settings > Secrets.',
    };
  }
  if (raw.includes('RESOURCE_EXHAUSTED') || raw.includes('429')) {
    return {
      status: 429,
      message: 'Gemini API rate limit or quota reached. Please wait a moment and try again.',
    };
  }
  return { status: 500, message: raw };
}

async function createServer() {
  const app = express();
  app.use(express.json({ limit: '2mb' }));

  app.post('/api/youtube/info', async (req, res) => {
    try {
      const url = String(req.body?.url || '').trim();
      const videoId = extractVideoId(url);
      if (!videoId) {
        res.status(400).json({
          error: 'Please enter a valid YouTube URL (e.g. https://www.youtube.com/watch?v=...).',
        });
        return;
      }

      const canonicalUrl = `https://www.youtube.com/watch?v=${videoId}`;
      let title = `YouTube Video (${videoId})`;
      let author = 'YouTube Creator';
      let thumbnailUrl = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
      let durationSeconds = 600;
      let description = '';
      let transcript: TranscriptSegment[] = [];

      // 1. Fetch reliable oEmbed metadata
      try {
        const oembedRes = await fetch(
          `https://www.youtube.com/oembed?url=${encodeURIComponent(canonicalUrl)}&format=json`,
          { signal: AbortSignal.timeout(5000) }
        );
        if (oembedRes.ok) {
          const oembed = (await oembedRes.json()) as {
            title?: string;
            author_name?: string;
            thumbnail_url?: string;
          };
          if (oembed.title) title = oembed.title;
          if (oembed.author_name) author = oembed.author_name;
          if (oembed.thumbnail_url) thumbnailUrl = oembed.thumbnail_url;
        }
      } catch {
        // Ignore oEmbed failure, continue with defaults or watch page scrape
      }

      // 2. Scrape YouTube watch page for duration, description, and captions
      try {
        const watchRes = await fetch(canonicalUrl, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
            'Accept-Language': 'en-US,en;q=0.9',
          },
          signal: AbortSignal.timeout(7000),
        });

        if (watchRes.ok) {
          const html = await watchRes.text();
          const playerResponse = extractBalancedJson(html, 'ytInitialPlayerResponse =');
          if (playerResponse) {
            const videoDetails = playerResponse.videoDetails as
              | {
                  title?: string;
                  author?: string;
                  lengthSeconds?: string;
                  shortDescription?: string;
                }
              | undefined;

            if (videoDetails?.title) title = videoDetails.title;
            if (videoDetails?.author) author = videoDetails.author;
            if (videoDetails?.shortDescription) description = videoDetails.shortDescription;
            if (videoDetails?.lengthSeconds) {
              const parsedLen = Number(videoDetails.lengthSeconds);
              if (Number.isFinite(parsedLen) && parsedLen > 0) {
                durationSeconds = parsedLen;
              }
            }

            const captions = playerResponse.captions as
              | {
                  playerCaptionsTracklistRenderer?: {
                    captionTracks?: CaptionTrack[];
                  };
                }
              | undefined;
            const tracks = captions?.playerCaptionsTracklistRenderer?.captionTracks || [];
            if (tracks.length > 0) {
              const preferred =
                tracks.find((t) => t.languageCode === 'en' && t.kind !== 'asr') ||
                tracks.find((t) => t.languageCode?.startsWith('en')) ||
                tracks[0];
              if (preferred?.baseUrl) {
                transcript = await fetchTranscriptFromTrack(preferred.baseUrl);
              }
            }
          }
        }
      } catch {
        // Watch page scrape optional; gracefully fall back to oEmbed + user notes
      }

      res.json({
        videoId,
        url: canonicalUrl,
        title,
        author,
        thumbnailUrl,
        durationSeconds,
        description,
        transcript,
        hasRealTranscript: transcript.length > 0,
      });
    } catch (err) {
      const formatted = formatApiError(err);
      res.status(formatted.status).json({ error: formatted.message });
    }
  });

  app.post('/api/gemini/analyze', async (req, res) => {
    try {
      const ai = getGeminiClient();
      const {
        title = 'Untitled Video',
        author = 'Creator',
        durationSeconds = 600,
        description = '',
        transcript = [],
        customNotes = '',
      } = req.body as {
        title?: string;
        author?: string;
        durationSeconds?: number;
        description?: string;
        transcript?: TranscriptSegment[];
        customNotes?: string;
      };

      const totalDuration = Math.max(30, Number(durationSeconds) || 600);

      // Condense transcript so it covers the whole timeline cleanly without overflowing context
      let transcriptBlock = '';
      if (Array.isArray(transcript) && transcript.length > 0) {
        const maxLines = 240;
        const step = transcript.length > maxLines ? Math.ceil(transcript.length / maxLines) : 1;
        const sampled: string[] = [];
        for (let i = 0; i < transcript.length; i += step) {
          const chunk = transcript
            .slice(i, i + step)
            .map((seg) => seg.text)
            .join(' ')
            .trim();
          const t = transcript[i].start;
          if (chunk) {
            sampled.push(`[${formatSecondsCompact(t)} | ${Math.floor(t)}s] ${chunk}`);
          }
        }
        transcriptBlock = sampled.join('\n');
      }

      const prompt = [
        `You are an elite short-form video producer specializing in YouTube Shorts, Instagram Reels, and TikTok retention.`,
        `Analyze the following long-form YouTube video and identify 4 distinct high-engagement, viral-worthy clip segments (between 20 and 58 seconds each).`,
        ``,
        `VIDEO METADATA:`,
        `- Title: ${title}`,
        `- Channel: ${author}`,
        `- Total Duration: ${totalDuration} seconds (${formatSecondsCompact(totalDuration)})`,
        description ? `- Description / Chapters:\n${description.slice(0, 2200)}` : '',
        customNotes ? `- Creator Focus / Notes:\n${customNotes.slice(0, 2000)}` : '',
        transcriptBlock
          ? `- Timestamped Transcript:\n${transcriptBlock}`
          : `- Note: No public caption track was attached. Use the title, description, chapters, and creator notes to select 4 distinct, realistic timestamp windows within 0s..${totalDuration}s and generate punchy, context-accurate captions for each clip.`,
        ``,
        `REQUIREMENTS:`,
        `1. Return exactly 4 clips sorted from highest viralScore to lowest.`,
        `2. Each clip MUST have startTime >= 0 and endTime <= ${totalDuration}, with clip length between 18 and 58 seconds.`,
        `3. Do not overlap clips. Spread them across strong hooks, surprising insights, emotional payoffs, or contrarian takeaways.`,
        `4. viralScore must be a realistic integer between 76 and 98.`,
        `5. For each clip, include 5 to 8 short, rhythmic caption cues (captions array) with startOffset and endOffset in seconds relative to the clip start (0 to clip duration), sized for 9:16 mobile readability (5-9 words per cue).`,
      ]
        .filter(Boolean)
        .join('\n');

      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: prompt,
        config: {
          systemInstruction:
            'You are ClipCraft AI, a precision short-form video strategist. Always return strictly valid JSON matching the requested schema, grounded in the provided timestamps and topic.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              clips: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: {
                      type: Type.STRING,
                      description: 'Catchy short-form title (under 60 characters).',
                    },
                    viralScore: {
                      type: Type.INTEGER,
                      description: 'Engagement score from 1 to 100.',
                    },
                    startTime: {
                      type: Type.NUMBER,
                      description: 'Start timestamp in whole seconds within the source video.',
                    },
                    endTime: {
                      type: Type.NUMBER,
                      description: 'End timestamp in whole seconds within the source video.',
                    },
                    reason: {
                      type: Type.STRING,
                      description: 'Brief 1-2 sentence explanation of why this moment hooks viewers.',
                    },
                    hookLine: {
                      type: Type.STRING,
                      description: 'Opening spoken hook or focal quote of the clip.',
                    },
                    captions: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          startOffset: { type: Type.NUMBER },
                          endOffset: { type: Type.NUMBER },
                          text: { type: Type.STRING },
                        },
                        required: ['startOffset', 'endOffset', 'text'],
                      },
                    },
                  },
                  required: [
                    'title',
                    'viralScore',
                    'startTime',
                    'endTime',
                    'reason',
                    'hookLine',
                    'captions',
                  ],
                },
              },
            },
            required: ['clips'],
          },
        },
      });

      const rawJson = (response.text || '{}').trim();
      const parsed = JSON.parse(rawJson) as {
        clips?: Array<{
          title: string;
          viralScore: number;
          startTime: number;
          endTime: number;
          reason: string;
          hookLine: string;
          captions: Array<{ startOffset: number; endOffset: number; text: string }>;
        }>;
      };

      const sanitizedClips = (parsed.clips || []).slice(0, 5).map((clip, idx) => {
        const start = Math.max(0, Math.min(totalDuration - 15, Math.round(clip.startTime || 0)));
        const rawEnd = Math.round(clip.endTime || start + 35);
        const end = Math.max(start + 12, Math.min(totalDuration, rawEnd));
        const clipLen = end - start;

        // If real transcript has cues inside [start, end], prefer aligned real cues if there are >= 2
        const realCues = Array.isArray(transcript)
          ? transcript
              .filter((s) => s.start >= start - 1 && s.start < end)
              .map((s, cIdx) => {
                const startOffset = Math.max(0, Math.round((s.start - start) * 10) / 10);
                const endOffset = Math.min(
                  clipLen,
                  Math.max(startOffset + 1.2, Math.round((s.start - start + s.duration) * 10) / 10)
                );
                return {
                  id: `clip-${idx + 1}-real-${cIdx}`,
                  startOffset,
                  endOffset,
                  text: s.text,
                };
              })
          : [];

        const aiCues = (clip.captions || []).map((c, cIdx) => {
          const sOff = Math.max(0, Math.min(clipLen - 0.5, Number(c.startOffset) || 0));
          const eOff = Math.min(clipLen, Math.max(sOff + 0.8, Number(c.endOffset) || sOff + 3));
          return {
            id: `clip-${idx + 1}-ai-${cIdx}`,
            startOffset: Math.round(sOff * 10) / 10,
            endOffset: Math.round(eOff * 10) / 10,
            text: String(c.text || '').trim(),
          };
        });

        return {
          id: `ai-clip-${Date.now()}-${idx + 1}`,
          title: String(clip.title || `Highlight Clip ${idx + 1}`).trim(),
          viralScore: Math.max(60, Math.min(99, Math.round(Number(clip.viralScore) || 85))),
          startTime: start,
          endTime: end,
          reason: String(clip.reason || 'High retention hook with strong narrative payoff.').trim(),
          hookLine: String(clip.hookLine || clip.title || '').trim(),
          captions: realCues.length >= 2 ? realCues : aiCues,
        };
      });

      res.json({ clips: sanitizedClips });
    } catch (err) {
      const formatted = formatApiError(err);
      res.status(formatted.status).json({ error: formatted.message });
    }
  });

  app.post('/api/gemini/export-metadata', async (req, res) => {
    try {
      const ai = getGeminiClient();
      const {
        videoTitle = '',
        clipTitle = '',
        hookLine = '',
        reason = '',
        transcriptExcerpt = '',
        durationSeconds = 35,
        aspectRatio = '9:16',
      } = req.body as {
        videoTitle?: string;
        clipTitle?: string;
        hookLine?: string;
        reason?: string;
        transcriptExcerpt?: string;
        durationSeconds?: number;
        aspectRatio?: string;
      };

      const prompt = [
        `Generate ready-to-publish social media captions, titles, and hashtags for a short-form video clip.`,
        `Source Video: ${videoTitle}`,
        `Clip Title: ${clipTitle}`,
        `Hook Line: ${hookLine}`,
        `Why It Works: ${reason}`,
        `Duration: ${Math.round(durationSeconds)}s | Aspect Ratio: ${aspectRatio}`,
        transcriptExcerpt ? `Spoken Captions Excerpt:\n${transcriptExcerpt}` : '',
        ``,
        `Provide tailored copy for YouTube Shorts, Instagram Reels, and TikTok, plus one concise posting tip.`,
      ]
        .filter(Boolean)
        .join('\n');

      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: prompt,
        config: {
          systemInstruction:
            'You are a short-form social media strategist. Generate concise, authentic, non-spammy captions and relevant hashtags without generic fluff.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              youtubeShorts: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING, description: 'Punchy Shorts title under 70 chars.' },
                  caption: { type: Type.STRING, description: 'Short description for Shorts.' },
                  hashtags: { type: Type.ARRAY, items: { type: Type.STRING } },
                },
                required: ['title', 'caption', 'hashtags'],
              },
              instagramReels: {
                type: Type.OBJECT,
                properties: {
                  hook: { type: Type.STRING, description: 'First-line caption hook.' },
                  caption: { type: Type.STRING, description: 'Engaging Reels caption with CTA.' },
                  hashtags: { type: Type.ARRAY, items: { type: Type.STRING } },
                },
                required: ['hook', 'caption', 'hashtags'],
              },
              tiktok: {
                type: Type.OBJECT,
                properties: {
                  caption: { type: Type.STRING, description: 'Conversational TikTok caption.' },
                  hashtags: { type: Type.ARRAY, items: { type: Type.STRING } },
                },
                required: ['caption', 'hashtags'],
              },
              bestPostingTip: {
                type: Type.STRING,
                description: 'One concrete creator execution tip for this clip.',
              },
            },
            required: ['youtubeShorts', 'instagramReels', 'tiktok', 'bestPostingTip'],
          },
        },
      });

      const rawJson = (response.text || '{}').trim();
      const parsed = JSON.parse(rawJson);
      res.json(parsed);
    } catch (err) {
      const formatted = formatApiError(err);
      res.status(formatted.status).json({ error: formatted.message });
    }
  });

  // Mount Vite in dev or static files in production
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    if (fs.existsSync(distDir)) {
      app.use(express.static(distDir));
      app.get('*', (_req, res) => {
        res.sendFile(path.join(distDir, 'index.html'));
      });
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ClipCraft server listening on http://0.0.0.0:${PORT}`);
  });
}

createServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
