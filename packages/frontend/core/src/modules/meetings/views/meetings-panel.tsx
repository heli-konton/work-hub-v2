import { Button, IconButton, Scrollable } from '@affine/component';
import { WorkbenchService } from '@affine/core/modules/workbench';
import { MeetingIcon, PlusIcon } from '@blocksuite/icons/rc';
import { useLiveData, useService } from '@toeverything/infra';
import { useMemo, useState } from 'react';

import { parseTranscriptLines } from '../ai/parse-transcript';
import { formatTranscript } from '../ai/prompt';
import { NOTE_TEMPLATES } from '../ai/templates';
import type { MergeSegment } from '../ai/types';
import { MeetingsAIService } from '../services/ai';
import { MeetingsService } from '../services/meetings';
import * as styles from './meetings-panel.css';
import { RecordingBar } from './recording-bar';

export const MeetingsPanel = () => {
  const meetingsService = useService(MeetingsService);
  const aiService = useService(MeetingsAIService);
  const workbenchService = useService(WorkbenchService);

  const meetings = useLiveData(meetingsService.allMeetings$);
  const setting = useLiveData(aiService.setting$);

  const [title, setTitle] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [roughNotes, setRoughNotes] = useState('');
  const [transcript, setTranscript] = useState('');
  const [templateId, setTemplateId] = useState(NOTE_TEMPLATES[0]?.id);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('');

  const meetingDocs = useMemo(() => {
    return [...meetings].sort((a, b) => b.id.localeCompare(a.id));
  }, [meetings]);

  const selected = meetingDocs.find(d => d.id === selectedId) ?? null;

  const createMeeting = () => {
    const name = title.trim() || `Meeting ${new Date().toLocaleDateString()}`;
    const docId = meetingsService.createMeeting(name);
    setTitle('');
    setSelectedId(docId);
    workbenchService.workbench.openDoc(docId);
  };

  const saveTranscript = async () => {
    if (!selected) return;
    setBusy('transcript');
    try {
      const segments = parseTranscriptLines(transcript);
      if (segments.length === 0) {
        setMessage('No transcript lines found to import.');
        return;
      }
      await meetingsService.writeTranscript(selected.id, segments);
      setMessage(
        `Imported ${segments.length} transcript lines into the meeting.`
      );
    } finally {
      setBusy(null);
    }
  };

  const generateNotes = async () => {
    if (!selected) return;
    setBusy('notes');
    setMessage('');
    try {
      const segments =
        (await meetingsService.readSegments(selected.id)).length > 0
          ? await meetingsService.readSegments(selected.id)
          : parseTranscriptLines(transcript);
      if (segments.length === 0) {
        setMessage('Import a transcript first, then generate notes.');
        return;
      }
      const result = await aiService.generateMeetingNotes({
        title: selected.meta$.value.title ?? 'Untitled meeting',
        rawNotesMarkdown: roughNotes,
        segments,
        templateId,
      });
      await meetingsService.writeSummary(selected.id, result.markdown);
      meetingsService.rememberTemplate(selected.id, templateId ?? 'general');
      setMessage(
        `Notes generated (${result.engine}) — written into the meeting.`
      );
    } catch (err) {
      setMessage(
        `Generate failed: ${err instanceof Error ? err.message : String(err)}`
      );
    } finally {
      setBusy(null);
    }
  };

  const saveSettings = () => {
    if (apiKey.trim()) aiService.updateSetting('apiKey', apiKey.trim());
    if (model.trim()) aiService.updateSetting('model', model.trim());
    setShowSettings(false);
    setMessage('AI provider settings saved.');
  };

  const onRecordedSegments = (segments: MergeSegment[]) => {
    if (segments.length === 0) return;
    const lines = formatTranscript(segments);
    setTranscript(prev => (prev.trim() ? `${prev}\n${lines}` : lines));
  };

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <span>Meetings</span>
        <IconButton
          icon={<PlusIcon />}
          aria-label="New meeting"
          onClick={createMeeting}
          disabled={busy !== null}
        />
      </div>

      <div className={styles.createRow}>
        <input
          className={styles.input}
          placeholder="Meeting title…"
          value={title}
          onChange={e => setTitle(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') createMeeting();
          }}
        />
      </div>

      <Scrollable.Root className={styles.list}>
        <Scrollable.Viewport>
          {meetingDocs.length === 0 ? (
            <div className={styles.empty}>
              No meetings yet — create one above.
            </div>
          ) : (
            meetingDocs.map(doc => (
              <button
                key={doc.id}
                className={
                  selectedId === doc.id ? styles.itemActive : styles.item
                }
                onClick={() => {
                  setSelectedId(doc.id);
                  workbenchService.workbench.openDoc(doc.id);
                }}
              >
                <MeetingIcon />
                <span className={styles.itemTitle}>
                  {doc.meta$.value.title ?? 'Untitled meeting'}
                </span>
              </button>
            ))
          )}
        </Scrollable.Viewport>
        <Scrollable.Scrollbar />
      </Scrollable.Root>

      {selected ? (
        <div className={styles.detail}>
          <div className={styles.fieldLabel}>
            Meeting: {selected.meta$.value.title ?? 'Untitled meeting'}
          </div>

          <RecordingBar
            onSegments={onRecordedSegments}
            disabled={busy !== null}
          />

          <label className={styles.fieldLabel}>Template</label>
          <select
            className={styles.input}
            value={templateId}
            onChange={e => setTemplateId(e.target.value)}
          >
            {NOTE_TEMPLATES.map(t => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>

          <label className={styles.fieldLabel}>Rough notes (markdown)</label>
          <textarea
            className={styles.textarea}
            rows={4}
            placeholder="Your rough notes from the meeting…"
            value={roughNotes}
            onChange={e => setRoughNotes(e.target.value)}
          />

          <label className={styles.fieldLabel}>
            Transcript (paste lines like “12:34 Dan: let&apos;s ship it”)
          </label>
          <textarea
            className={styles.textarea}
            rows={8}
            placeholder={
              '12:34 You: hello\n12:35 Them: hi there\nYou: closing thought'
            }
            value={transcript}
            onChange={e => setTranscript(e.target.value)}
          />

          <div className={styles.actions}>
            <Button
              variant="primary"
              onClick={() => {
                saveTranscript().catch(err =>
                  setMessage(
                    `Import failed: ${err instanceof Error ? err.message : String(err)}`
                  )
                );
              }}
              loading={busy === 'transcript'}
              disabled={busy !== null}
            >
              Save transcript
            </Button>
            <Button
              onClick={() => {
                generateNotes().catch(err =>
                  setMessage(
                    `Generate failed: ${err instanceof Error ? err.message : String(err)}`
                  )
                );
              }}
              loading={busy === 'notes'}
              disabled={busy !== null}
            >
              Generate notes
            </Button>
          </div>

          {message ? <div className={styles.message}>{message}</div> : null}
        </div>
      ) : null}

      <div className={styles.settings}>
        <button
          className={styles.settingsToggle}
          onClick={() => setShowSettings(v => !v)}
        >
          AI provider {showSettings ? '▾' : '▸'}
        </button>
        {showSettings ? (
          <div className={styles.settingsBody}>
            <div className={styles.fieldLabel}>
              Endpoint: {setting?.baseUrl} · model: {setting?.model}
            </div>
            <input
              className={styles.input}
              placeholder="DeepSeek API key (stored locally in this workspace)"
              type="password"
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
            />
            <input
              className={styles.input}
              placeholder={`Model (current: ${setting?.model ?? ''})`}
              value={model}
              onChange={e => setModel(e.target.value)}
            />
            <Button onClick={saveSettings}>Save settings</Button>
          </div>
        ) : null}
      </div>
    </div>
  );
};
