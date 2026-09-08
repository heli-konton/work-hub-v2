/**
 * MeetingsStore — doc-backed meeting records, following the JournalStore
 * pattern: a meeting is a normal AFFiNE doc tagged with `meetingId` and
 * meeting-scoped properties. Because meetings are docs, they inherit
 * everything for free: canvas placement, doc links, search, sync in v3/v4.
 */
import { LiveData, Store } from '@toeverything/infra';

import type { DocsService } from '../../doc';

/** Meeting-scoped custom properties stored on the doc. */
export interface MeetingDocProperties {
  /** Stable meeting id — equals the doc id. */
  meetingId?: string;
  /** ISO timestamp of the first live-capture start, if any. */
  meetingStartedAt?: string;
  /** ISO timestamp of the last live-capture end, if any. */
  meetingEndedAt?: string;
  /** Blob id of the merged recording (audio.m4a), when captured. */
  meetingAudioBlobId?: string;
  /** Note template id used for the last Enhance run. */
  meetingTemplateId?: string;
}

function isMeetingId(value?: string | false): value is string {
  return typeof value === 'string' && value.length > 0;
}

export class MeetingsStore extends Store {
  constructor(private readonly docsService: DocsService) {
    super();
  }

  /** Every meeting doc, newest activity first is left to the view layer. */
  readonly allMeetings$ = LiveData.computed(get => {
    return get(this.docsService.list.docs$).filter(doc => {
      if (get(doc.trash$)) return false;
      return isMeetingId(get(doc.properties$.selector(p => p.meetingId)));
    });
  });

  meetingByDocId$(docId: string) {
    return LiveData.computed(get => {
      const doc = get(this.docsService.list.doc$(docId));
      if (!doc) return undefined;
      if (!isMeetingId(get(doc.properties$.selector(p => p.meetingId)))) {
        return undefined;
      }
      return doc;
    });
  }

  isMeetingDoc(docId: string): boolean {
    const doc = this.docsService.list.doc$(docId).value;
    if (!doc) return false;
    return isMeetingId(doc.properties$.value.meetingId);
  }

  /** True when the doc is already claimed by another meeting (or itself). */
  setMeetingProperties(
    docId: string,
    properties: Partial<MeetingDocProperties>
  ) {
    const doc = this.docsService.list.doc$(docId).value;
    if (!doc) return;
    if (properties.meetingId)
      doc.setProperty('meetingId', properties.meetingId);
    if (properties.meetingStartedAt !== undefined) {
      doc.setProperty('meetingStartedAt', properties.meetingStartedAt);
    }
    if (properties.meetingEndedAt !== undefined) {
      doc.setProperty('meetingEndedAt', properties.meetingEndedAt);
    }
    if (properties.meetingAudioBlobId !== undefined) {
      doc.setProperty('meetingAudioBlobId', properties.meetingAudioBlobId);
    }
    if (properties.meetingTemplateId !== undefined) {
      doc.setProperty('meetingTemplateId', properties.meetingTemplateId);
    }
  }
}
