import type { MergeSegment } from './types';

/**
 * Parse a pasted transcript into segments for the AI pipeline.
 *
 * Accepted line shapes:
 *   "[12:34] You: hello"  /  "12:34 You: hello"  → timestamped
 *   "You: hello"          → synthetic startMs (5s apart in order)
 *   anything else         → speaker "You", whole line as text
 */
const TIMESTAMPED = /^(?:\[(\d{1,3}):(\d{2})\]|\s*(\d{1,3}):(\d{2})\s+)(.+)$/;
const SPEAKERED = /^(.{1,40}?):\s*(.*)$/;

export function parseTranscriptLines(text: string): MergeSegment[] {
  const lines = text
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line.length > 0);

  const segments: MergeSegment[] = [];

  for (const line of lines) {
    let speaker = 'You';
    let body = line;
    let startMs = segments.length * 5000;

    const timestamped = TIMESTAMPED.exec(line);
    if (timestamped) {
      const minutes = Number(timestamped[1] ?? timestamped[3]);
      const seconds = Number(timestamped[2] ?? timestamped[4]);
      if (!Number.isNaN(minutes) && !Number.isNaN(seconds)) {
        startMs = (minutes * 60 + seconds) * 1000;
      }
      body = (timestamped[5] ?? '').trim();
    }

    const speakered = SPEAKERED.exec(body);
    if (speakered) {
      speaker = (speakered[1] ?? '').trim();
      body = (speakered[2] ?? '').trim();
    }

    if (!body) continue;
    segments.push({ speaker, text: body, startMs });
  }

  return segments;
}
