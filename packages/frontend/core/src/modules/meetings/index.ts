import { type Framework } from '@toeverything/infra';

import { WorkspaceDBService } from '../db';
import { DocsService } from '../doc';
import { WorkspaceScope, WorkspaceService } from '../workspace';
import { MeetingsAIService } from './services/ai';
import { MeetingsService } from './services/meetings';
import { MeetingsAISettingStore } from './store/ai-setting';
import { MeetingsStore } from './store/meetings';

export * from './ai/ask-prompt';
export * from './ai/http-engine';
export * from './ai/map-reduce';
export * from './ai/prompt';
export * from './ai/templates';
export * from './ai/types';
export * from './engine/events';
export { buildEngineFromSettings, MeetingsAIService } from './services/ai';
export { MeetingsService, segmentsBlobKey } from './services/meetings';
export type { MeetingsAISettings } from './store/ai-setting';
export { DEEPSEEK_DEFAULTS, MeetingsAISettingStore } from './store/ai-setting';
export type { MeetingDocProperties } from './store/meetings';
export { MeetingsStore } from './store/meetings';

export function configureMeetingsModule(framework: Framework) {
  framework
    .scope(WorkspaceScope)
    .service(MeetingsService, [DocsService, WorkspaceService, MeetingsStore])
    .store(MeetingsStore, [DocsService])
    .service(MeetingsAIService, [MeetingsAISettingStore])
    .store(MeetingsAISettingStore, [WorkspaceDBService]);
}
