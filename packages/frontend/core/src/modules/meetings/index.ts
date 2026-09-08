import { type Framework } from '@toeverything/infra';

import { DocsService } from '../doc';
import { WorkspaceScope } from '../workspace';
import { MeetingsService } from './services/meetings';
import { MeetingsStore } from './store/meetings';

export * from './ai/ask-prompt';
export * from './ai/http-engine';
export * from './ai/map-reduce';
export * from './ai/prompt';
export * from './ai/templates';
export * from './ai/types';
export * from './engine/events';
export { MeetingsService } from './services/meetings';
export type { MeetingDocProperties } from './store/meetings';
export { MeetingsStore } from './store/meetings';

export function configureMeetingsModule(framework: Framework) {
  framework
    .scope(WorkspaceScope)
    .service(MeetingsService, [DocsService, MeetingsStore])
    .store(MeetingsStore, [DocsService]);
}
