import { Service } from '@toeverything/infra';

import { HttpNotesEngine } from '../ai/http-engine';
import type { MergeSegment } from '../ai/types';
import type {
  MeetingsAISettings,
  MeetingsAISettingStore,
} from '../store/ai-setting';

/**
 * Pure engine factory — exported for tests and for the settings UI preview.
 * DeepSeek's API is OpenAI-compatible, so the HTTP engine covers it as-is.
 */
export function buildEngineFromSettings(settings: MeetingsAISettings) {
  return new HttpNotesEngine({
    baseUrl: settings.baseUrl,
    apiKey: settings.apiKey || undefined,
    model: settings.model,
    singlePassThresholdChars: settings.singlePassThresholdChars,
  });
}

/**
 * Builds the notes engine for the current workspace settings and runs the
 * meeting-notes pipeline. The UI consumes `setting$` + `generateNotes`.
 */
export class MeetingsAIService extends Service {
  constructor(private readonly settingStore: MeetingsAISettingStore) {
    super();
  }

  readonly setting$ = this.settingStore.watchEffectiveSetting();

  engine$(settings: MeetingsAISettings) {
    return buildEngineFromSettings(settings);
  }

  async generateMeetingNotes(input: {
    title?: string;
    rawNotesMarkdown: string;
    segments: MergeSegment[];
    durationMs?: number;
    templateId?: string;
    onToken?: (text: string) => void;
  }): Promise<{ markdown: string; engine: string; elapsedMs: number }> {
    const settings = this.setting$.value;
    const engine = this.engine$(settings);
    return engine.generateNotes(
      {
        title: input.title,
        rawNotesMarkdown: input.rawNotesMarkdown,
        segments: input.segments,
        durationMs: input.durationMs,
        templateId: input.templateId,
      },
      input.onToken
    );
  }

  updateSetting<K extends keyof MeetingsAISettings>(
    key: K,
    value: MeetingsAISettings[K]
  ) {
    this.settingStore.updateSetting(key, value);
  }
}
