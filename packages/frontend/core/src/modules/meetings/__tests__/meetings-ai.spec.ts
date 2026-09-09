import { describe, expect, it } from 'vitest';

import { buildAskUserMessage } from '../ai/ask-prompt';
import {
  buildChunkSystemPrompt,
  chunkSegments,
  DEFAULT_SINGLE_PASS_CHARS,
  generateMeetingNotes,
} from '../ai/map-reduce';
import { parseTranscriptLines } from '../ai/parse-transcript';
import { buildMergeUserMessage } from '../ai/prompt';
import { NOTE_TEMPLATES, templateById } from '../ai/templates';
import type { MergeSegment, NotesEngine } from '../ai/types';
import { buildEngineFromSettings } from '../services/ai';
import { segmentsBlobKey } from '../services/meetings';
import { DEEPSEEK_DEFAULTS } from '../store/ai-setting';

describe('meetings ai — transcript parsing', () => {
  it('parses timestamped speaker lines', () => {
    const segments = parseTranscriptLines(
      '[12:34] You: hello\n[12:35] Them: hi'
    );
    expect(segments).toHaveLength(2);
    expect(segments[0]).toEqual({
      speaker: 'You',
      text: 'hello',
      startMs: (12 * 60 + 34) * 1000,
    });
    expect(segments[1]?.speaker).toBe('Them');
  });

  it('parses plain speaker lines with synthetic timing', () => {
    const segments = parseTranscriptLines('Dan: let us ship it\nAnna: agreed');
    expect(segments[0]?.speaker).toBe('Dan');
    expect(segments[1]?.startMs).toBe(5000);
  });

  it('treats unmatched lines as the note-taker speaking', () => {
    const segments = parseTranscriptLines('a line without a speaker');
    expect(segments[0]).toEqual({
      speaker: 'You',
      text: 'a line without a speaker',
      startMs: 0,
    });
  });

  it('skips blank lines and empty bodies', () => {
    expect(parseTranscriptLines('\n\nYou: \n')).toHaveLength(0);
  });
});

describe('meetings ai — provider wiring', () => {
  it('builds a DeepSeek engine from default settings', () => {
    const engine = buildEngineFromSettings(DEEPSEEK_DEFAULTS);
    expect(engine.id).toBe(
      `http:${DEEPSEEK_DEFAULTS.baseUrl}:${DEEPSEEK_DEFAULTS.model}`
    );
    expect(engine.singlePassThresholdChars).toBe(96_000);
  });

  it('builds a local Ollama engine when pointed at one', () => {
    const engine = buildEngineFromSettings({
      ...DEEPSEEK_DEFAULTS,
      baseUrl: 'http://nova-core:11434/v1',
      model: 'llama3.1',
    });
    expect(engine.id).toContain('nova-core');
    expect(engine.id).toContain('llama3.1');
  });

  it('derives the segments blob key from the meeting id', () => {
    expect(segmentsBlobKey('abc-123')).toBe('meeting-abc-123-segments.json');
  });
});

describe('meetings ai — templates', () => {
  it('ships all seven meeting templates', () => {
    expect(NOTE_TEMPLATES.map(t => t.id)).toEqual([
      'general',
      'customer-discovery',
      'site-survey',
      'troubleshooting',
      'one-on-one',
      'standup',
      'interview',
    ]);
  });

  it('falls back to general for unknown ids', () => {
    expect(templateById('does-not-exist').id).toBe('general');
    expect(templateById(undefined).id).toBe('general');
  });
});

describe('meetings ai — chunking', () => {
  function seg(text: string, startMs = 0): MergeSegment {
    return { speaker: 'You', text, startMs };
  }

  it('returns one chunk for short transcripts', () => {
    expect(chunkSegments([seg('hi'), seg('there')])).toHaveLength(1);
  });

  it('splits long transcripts at segment boundaries with overlap', () => {
    const segments = Array.from({ length: 100 }, (_, i) =>
      seg('x'.repeat(600), i * 1000)
    );
    const chunks = chunkSegments(segments, 5000, 1000);
    expect(chunks.length).toBeGreaterThan(1);
    // The first segment of chunk N+1 must also end chunk N (overlap).
    const overlapSegment = chunks[1]![0]!;
    expect(chunks[0]!.some(s => s === overlapSegment)).toBe(true);
    // Every original segment is preserved in order (overlap re-included).
    const seen = new Set(chunks.flat());
    for (const segment of segments) {
      expect(seen.has(segment)).toBe(true);
    }
  });
});

describe('meetings ai — prompts', () => {
  it('includes rough notes and transcript in the merge message', () => {
    const message = buildMergeUserMessage({
      title: 'Sprint plan',
      rawNotesMarkdown: 'ship the widget',
      segments: [{ speaker: 'Them', text: 'when can we ship?', startMs: 0 }],
    });
    expect(message).toContain('Sprint plan');
    expect(message).toContain('ship the widget');
    expect(message).toContain('when can we ship?');
  });

  it('marks truncated long transcripts instead of silently cutting', () => {
    const message = buildMergeUserMessage(
      {
        rawNotesMarkdown: '',
        segments: [{ speaker: 'You', text: 'a'.repeat(60_000), startMs: 0 }],
      },
      10_000
    );
    expect(message).toContain('omitted');
  });

  it('grounds ask prompts in meeting content only', () => {
    const message = buildAskUserMessage({
      title: 'Interview: Ada',
      rawNotesMarkdown: 'strong on infra',
      segments: [],
      history: [],
      question: 'Did they mention Kubernetes?',
    });
    expect(message).toContain('Interview: Ada');
    expect(message).toContain('Kubernetes?');
    expect(message).toContain('Answer using only the meeting context above.');
  });

  it('writes speaker rules as labels, never instructions', () => {
    const prompt = buildChunkSystemPrompt([
      { label: 'Ada Lovelace', isSelf: false },
    ]);
    expect(prompt).toContain('"Ada Lovelace"');
  });
});

describe('meetings ai — map-reduce orchestration', () => {
  function recordingEngine(
    impl: (system: string, prompt: string) => string
  ): NotesEngine {
    return {
      id: 'test',
      label: 'test',
      async runRaw(system, prompt) {
        return { markdown: impl(system, prompt), engine: 'test', elapsedMs: 0 };
      },
      generateNotes: () => {
        throw new Error('unused');
      },
      askQuestion: () => {
        throw new Error('unused');
      },
    };
  }

  it('single-pass when under the engine threshold', async () => {
    let calls = 0;
    const engine = recordingEngine((_s, p) => {
      calls++;
      expect(p).toContain('=== TRANSCRIPT ===');
      return 'ok';
    });
    const result = await generateMeetingNotes(engine, {
      rawNotesMarkdown: '',
      segments: [{ speaker: 'You', text: 'short meeting', startMs: 0 }],
    });
    expect(calls).toBe(1);
    expect(result.markdown).toBe('ok');
  });

  it('condenses in chunks when over the threshold, one failing chunk degrades', async () => {
    const segments = Array.from({ length: 40 }, (_, i) => ({
      speaker: i % 2 ? 'You' : 'Them',
      text: 'x'.repeat(2_000),
      startMs: i * 1000,
    }));
    const engine = recordingEngine((_s, p) => {
      if (p.includes('This is part 2 of')) {
        throw new Error('chunk 2 failed');
      }
      if (p.includes('CONDENSED TRANSCRIPT NOTES')) {
        expect(p).toContain('unavailable');
        return 'final notes';
      }
      return 'condensed facts';
    });
    const result = await generateMeetingNotes(
      { ...engine, singlePassThresholdChars: 1 },
      {
        rawNotesMarkdown: 'my rough notes',
        segments,
        title: 'Long one',
      }
    );
    expect(result.markdown).toBe('final notes');
  });

  it('keeps the local default threshold exported', () => {
    expect(DEFAULT_SINGLE_PASS_CHARS).toBeGreaterThan(10_000);
  });
});
