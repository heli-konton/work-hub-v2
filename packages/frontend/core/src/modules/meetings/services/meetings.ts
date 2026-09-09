import { getStoreManager } from '@affine/core/blocksuite/manager/store';
import { MarkdownTransformer } from '@blocksuite/affine/widgets/linked-doc';
import { Service } from '@toeverything/infra';

import type { DocsService } from '../../doc';
import type { WorkspaceService } from '../../workspace';
import { formatTranscript } from '../ai/prompt';
import type { MergeSegment } from '../ai/types';
import type { MeetingsStore } from '../store/meetings';

/** Blob key for the machine-readable transcript segments of a meeting. */
export function segmentsBlobKey(meetingId: string): string {
  return `meeting-${meetingId}-segments.json`;
}

export class MeetingsService extends Service {
  constructor(
    private readonly docsService: DocsService,
    private readonly workspaceService: WorkspaceService,
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

  private blockSuiteDoc(meetingId: string) {
    return this.workspaceService.workspace.docCollection
      .getDoc(meetingId)
      ?.getStore();
  }

  /** Import markdown into a fresh note block of the meeting doc. */
  private async importMarkdownToNewNote(meetingId: string, markdown: string) {
    const doc = this.blockSuiteDoc(meetingId);
    if (!doc) return;
    const pageBlock = doc.getBlocksByFlavour('affine:page').at(0);
    if (!pageBlock) return;
    const noteBlockId = doc.addBlock('affine:note', {}, pageBlock.id);
    await MarkdownTransformer.importMarkdownToBlock({
      doc,
      blockId: noteBlockId,
      markdown,
      extensions: getStoreManager().config.init().value.get('store'),
    });
  }

  /**
   * Persist transcript segments: human-readable markdown in a note block,
   * machine-readable JSON as a workspace blob (for the AI pipeline).
   */
  async writeTranscript(meetingId: string, segments: MergeSegment[]) {
    const doc = this.blockSuiteDoc(meetingId);
    if (!doc) return;
    const markdown = formatTranscript(segments);
    await this.importMarkdownToNewNote(meetingId, markdown);
    await doc.blobSync.set(
      segmentsBlobKey(meetingId),
      new Blob([JSON.stringify({ meetingId, segments })], {
        type: 'application/json',
      })
    );
  }

  /** Read the machine-readable segments back for the AI pipeline. */
  async readSegments(meetingId: string): Promise<MergeSegment[]> {
    const doc = this.blockSuiteDoc(meetingId);
    if (!doc) return [];
    const blob = await doc.blobSync.get(segmentsBlobKey(meetingId));
    if (!blob) return [];
    try {
      const parsed = JSON.parse(await blob.text()) as {
        segments: MergeSegment[];
      };
      return parsed.segments;
    } catch {
      return [];
    }
  }

  /** Write AI-generated meeting notes into the meeting doc. */
  async writeSummary(meetingId: string, markdown: string) {
    await this.importMarkdownToNewNote(meetingId, markdown);
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
