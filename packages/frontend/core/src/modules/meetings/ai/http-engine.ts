/**
 * OpenAI-compatible HTTP notes engine.
 *
 * The Work Hub default engine: points at any OpenAI-compatible endpoint —
 * Ollama on the lab, the Nous Portal shim (the same pattern v1's check-in
 * used), or a cloud provider. Same NotesEngine contract as the ported local
 * llama.cpp engine, so the UI and map-reduce orchestration never care which
 * one is behind the wheel.
 */
import { buildAskSystemPrompt, buildAskUserMessage } from './ask-prompt';
import { generateMeetingNotes } from './map-reduce';
import type {
  AskAnswer,
  AskInput,
  MergedNotes,
  MergeInput,
  NotesEngine,
  NotesProgress,
} from './types';

export interface HttpEngineOptions {
  /** OpenAI-compatible base URL, e.g. http://nova-core:11434/v1 */
  baseUrl: string;
  /** Bearer token; empty for local Ollama. */
  apiKey?: string;
  model: string;
  /**
   * Transcript budget for a single-pass merge. Defaults to the local
   * 16K-context sizing; raise it for engines with large contexts.
   */
  singlePassThresholdChars?: number;
  /** Fetch implementation (Node 22+/browsers both have global fetch). */
  fetchImpl?: typeof fetch;
  temperature?: number;
}

interface ChatMessage {
  role: 'system' | 'user';
  content: string;
}

export class HttpNotesEngine implements NotesEngine {
  readonly id: string;
  readonly label: string;
  readonly singlePassThresholdChars?: number;

  private readonly options: HttpEngineOptions;

  constructor(options: HttpEngineOptions) {
    this.options = options;
    this.id = `http:${options.baseUrl}:${options.model}`;
    this.label = `HTTP: ${options.model}`;
    this.singlePassThresholdChars = options.singlePassThresholdChars;
  }

  async generateNotes(
    input: MergeInput,
    onToken?: (text: string) => void,
    onProgress?: (progress: NotesProgress) => void
  ): Promise<MergedNotes> {
    return generateMeetingNotes(this, input, onToken, onProgress);
  }

  async askQuestion(
    input: AskInput,
    onToken?: (text: string) => void
  ): Promise<AskAnswer> {
    return this.runRaw(
      buildAskSystemPrompt(input.speakers),
      buildAskUserMessage(input),
      onToken
    );
  }

  /**
   * One non-streaming generation. Streaming (SSE) is the next increment;
   * non-streaming keeps the first integration dependency-free.
   */
  async runRaw(
    systemPrompt: string,
    userMessage: string,
    onToken?: (text: string) => void
  ): Promise<MergedNotes> {
    const started = Date.now();
    const fetchImpl = this.options.fetchImpl ?? fetch;
    const url = `${this.options.baseUrl.replace(/\/$/, '')}/chat/completions`;
    const body: {
      model: string;
      messages: ChatMessage[];
      temperature: number;
      stream?: boolean;
    } = {
      model: this.options.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      temperature: this.options.temperature ?? 0.3,
    };

    let response: Response;
    try {
      response = await fetchImpl(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.options.apiKey
            ? { Authorization: `Bearer ${this.options.apiKey}` }
            : {}),
        },
        body: JSON.stringify(body),
      });
    } catch (err) {
      throw new Error(
        `HTTP engine request failed to ${url}: ${err instanceof Error ? err.message : String(err)}`
      );
    }
    if (!response.ok) {
      const detail = (await response.text().catch(() => '')).slice(0, 500);
      throw new Error(
        `HTTP engine returned ${response.status} for model ${this.options.model}: ${detail}`
      );
    }
    const json = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const markdown = (json.choices?.[0]?.message?.content ?? '').trim();
    onToken?.(markdown);
    return {
      markdown,
      engine: this.id,
      elapsedMs: Date.now() - started,
    };
  }
}
