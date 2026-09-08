/**
 * NDJSON event protocol between the Work Hub app and the capture/transcribe
 * sidecar. Mirrors the doodle-note Swift engine contract (MIT, Onyx Dev
 * Labs) so the same sidecar binary can be reused on macOS builds.
 *
 * Every stdout line is one JSON object with an `event` field:
 *   {"event":"status","stage":"loading_models","model":"parakeet-tdt-v2"}
 *   {"event":"download","progress":0.42,"phase":"downloading"}
 *   {"event":"ready"}
 *   {"event":"partial","text":"hello wor"}
 *   {"event":"final","text":"Hello world.","confidence":0.97}
 *   {"event":"segment","speaker":"You","text":"...","startMs":0,"endMs":1234,"confidence":0.9}
 *   {"event":"audio","path":"/tmp/.../audio.m4a"}
 *   {"event":"done"}
 *   {"event":"error","message":"..."}
 */

export type CaptureChannel = 'mic' | 'system';

export interface EngineStatusEvent {
  event: 'status';
  stage: string;
  model?: string;
}

export interface EngineDownloadEvent {
  event: 'download';
  progress: number;
  phase: string;
}

export interface EngineReadyEvent {
  event: 'ready';
}

export interface EnginePartialEvent {
  event: 'partial';
  text: string;
}

export interface EngineFinalEvent {
  event: 'final';
  text: string;
  confidence?: number;
}

export interface EngineSegmentEvent {
  event: 'segment';
  speaker: string;
  text: string;
  startMs: number;
  endMs: number;
  confidence: number;
}

export interface EngineAudioEvent {
  event: 'audio';
  path: string;
}

export interface EngineDoneEvent {
  event: 'done';
}

export interface EngineErrorEvent {
  event: 'error';
  message: string;
}

export type EngineEvent =
  | EngineStatusEvent
  | EngineDownloadEvent
  | EngineReadyEvent
  | EnginePartialEvent
  | EngineFinalEvent
  | EngineSegmentEvent
  | EngineAudioEvent
  | EngineDoneEvent
  | EngineErrorEvent;

/**
 * A capture source. Desktop Electron spawns the Swift sidecar; the web
 * build records the mic with getUserMedia. Both emit EngineEvents, so the
 * UI is transport-agnostic.
 */
export interface CaptureSource {
  readonly kind: 'sidecar' | 'media-recorder';
  start(options: CaptureOptions): void;
  stop(): Promise<void>;
  readonly events: AsyncIterable<EngineEvent>;
}

export interface CaptureOptions {
  /** Which channels to capture; the web build supports mic only. */
  channels: CaptureChannel[];
  /** Where crash-safe checkpoints / merged audio land (sidecar). */
  audioDir?: string;
  /** CoreAudio device UID pin (sidecar). */
  inputDevice?: string;
}
