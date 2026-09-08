/**
 * Ported from Onyx-Dev-Labs/doodle-note (packages/ai/src/types.ts).
 * Copyright (c) 2026 Onyx Dev Labs — MIT License.
 * See docs/workhub/THIRD_PARTY.md for the full attribution note.
 */

/** A transcript segment as produced by the capture pipeline. */
export interface MergeSegment {
  /** Display label: a real name when known, else 'You' / 'Them'. */
  speaker: string;
  text: string;
  startMs: number;
}

/** A named speaker the prompts should attribute by name. */
export interface SpeakerInfo {
  /** The exact label used on transcript lines. */
  label: string;
  /** True for the Work Hub user (the note-taker). */
  isSelf: boolean;
}

/** Everything the note-merge needs about one meeting. */
export interface MergeInput {
  title?: string;
  /** The user's rough notes, as markdown. */
  rawNotesMarkdown: string;
  segments: MergeSegment[];
  /** Known speakers behind the transcript labels; absent = You/Them only. */
  speakers?: SpeakerInfo[];
  durationMs?: number;
  /** Note template shaping the output (see templates.ts); default "general". */
  templateId?: string;
}

export interface MergedNotes {
  /** Polished meeting notes as markdown. */
  markdown: string;
  engine: string;
  elapsedMs: number;
}

/** One completed question/answer pair in a meeting's chat thread. */
export interface AskExchange {
  question: string;
  answer: string;
}

/** Everything the "ask anything" answer needs about one meeting. */
export interface AskInput {
  title?: string;
  /** The user's rough notes, as markdown. */
  rawNotesMarkdown: string;
  /** AI-generated notes, when an Enhance run already happened. */
  enhancedMarkdown?: string | null;
  segments: MergeSegment[];
  /** Known speakers behind the transcript labels; absent = You/Them only. */
  speakers?: SpeakerInfo[];
  /** Prior exchanges in this conversation (oldest first). */
  history: AskExchange[];
  question: string;
}

/** The engine's answer to an "ask anything" question. */
export type AskAnswer = MergedNotes;

/** Progress of a long-meeting notes run (map-reduce condensation). */
export interface NotesProgress {
  phase: 'condensing' | 'writing';
  /** 1-based part counter, present while condensing. */
  current?: number;
  total?: number;
}

/**
 * A notes engine turns a meeting (rough notes + transcript) into polished
 * notes, and answers questions about it. Work Hub ships two: the HTTP
 * engine (default — any OpenAI-compatible local or cloud endpoint, e.g.
 * Ollama on the lab, or the Nous Portal shim pattern from v1) and, on
 * macOS desktop builds, the ported local llama.cpp engine.
 */
export interface NotesEngine {
  id: string;
  label: string;
  /**
   * Transcript budget (chars) for a single-pass merge; longer transcripts
   * are condensed first (map-reduce.ts). Unset = the local-context default.
   */
  readonly singlePassThresholdChars?: number;
  /** One raw generation — the primitive the notes orchestration composes. */
  runRaw(
    system: string,
    prompt: string,
    onToken?: (text: string) => void
  ): Promise<MergedNotes>;
  generateNotes(
    input: MergeInput,
    onToken?: (text: string) => void,
    onProgress?: (progress: NotesProgress) => void
  ): Promise<MergedNotes>;
  /** Answer a question grounded ONLY in this meeting's content. */
  askQuestion(
    input: AskInput,
    onToken?: (text: string) => void
  ): Promise<AskAnswer>;
}
