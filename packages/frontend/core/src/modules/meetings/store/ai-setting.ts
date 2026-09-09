import { LiveData, Store } from '@toeverything/infra';

import type { WorkspaceDBService } from '../../db';

/** AI provider settings for the meetings module. */
export interface MeetingsAISettings {
  /** OpenAI-compatible base URL. */
  baseUrl: string;
  /** Bearer API key; empty string = none (local Ollama). */
  apiKey: string;
  /** Model name sent to the provider. */
  model: string;
  /**
   * Transcript budget (chars) for a single-pass merge. Longer transcripts
   * are condensed first via map-reduce. Sized for DeepSeek's context.
   */
  singlePassThresholdChars: number;
}

export const DEEPSEEK_DEFAULTS: MeetingsAISettings = {
  baseUrl: 'https://api.deepseek.com/v1',
  apiKey: '',
  model: 'deepseek-chat',
  singlePassThresholdChars: 96_000,
};

export class MeetingsAISettingStore extends Store {
  private readonly key = 'meetingsAI';

  constructor(private readonly dbService: WorkspaceDBService) {
    super();
  }

  watchSetting() {
    return this.dbService.userdataDB$
      .map(db => LiveData.from(db.settings.find$({ key: this.key }), []))
      .flat()
      .map(raw => (raw?.[0]?.value as MeetingsAISettings) ?? undefined);
  }

  watchEffectiveSetting() {
    return this.watchSetting().map(
      value => ({ ...DEEPSEEK_DEFAULTS, ...value }) as MeetingsAISettings
    );
  }

  updateSetting<K extends keyof MeetingsAISettings>(
    key: K,
    value: MeetingsAISettings[K]
  ) {
    const db = this.dbService.userdataDB$.value;
    const prev = db.settings.find({ key: this.key })[0]?.value ?? {};
    db.settings.create({
      key: this.key,
      value: { ...DEEPSEEK_DEFAULTS, ...prev, [key]: value },
    });
  }
}
