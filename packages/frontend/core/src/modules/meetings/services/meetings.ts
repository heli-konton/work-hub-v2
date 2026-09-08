import { Service } from '@toeverything/infra';

import type { DocsService } from '../../doc';
import type { MeetingsStore } from '../store/meetings';

export class MeetingsService extends Service {
  constructor(
    private readonly docsService: DocsService,
    private readonly meetingsStore: MeetingsStore
  ) {
    super();
  }

  readonly allMeetings$ = this.meetingsStore.allMeetings$;

  /**
   * Create a meeting doc: a page tagged with the meeting properties.
   * Returns the doc id — that id IS the meeting id.
   */
  createMeeting(title: string): string {
    const doc = this.docsService.createDoc({
      primaryMode: 'page',
      title: title || 'Untitled meeting',
    });
    this.meetingsStore.setMeetingProperties(doc.id, {
      meetingId: doc.id,
      meetingStartedAt: new Date().toISOString(),
    });
    return doc.id;
  }

  /** Mark a live-capture session boundary on the meeting doc. */
  markCaptureEnded(meetingId: string, endedAt = new Date().toISOString()) {
    this.meetingsStore.setMeetingProperties(meetingId, {
      meetingEndedAt: endedAt,
    });
  }

  /** Record the merged audio blob id after a clean capture stop. */
  attachAudio(meetingId: string, blobId: string) {
    this.meetingsStore.setMeetingProperties(meetingId, {
      meetingAudioBlobId: blobId,
    });
  }

  /** Remember which template shaped the last Enhance run. */
  rememberTemplate(meetingId: string, templateId: string) {
    this.meetingsStore.setMeetingProperties(meetingId, {
      meetingTemplateId: templateId,
    });
  }

  /**
   * End-of-day staging (next milestone): pull pending meetings, run the
   * notes engine, and write proposed tracker changes. The idempotency key
   * is (meetingId, templateId, segment-hash) so re-runs never duplicate.
   */
  async stageMeeting(_meetingId: string): Promise<never> {
    throw new Error(
      'stageMeeting is a next-milestone operation — see docs/workhub/DESIGN.md §Meetings'
    );
  }
}
