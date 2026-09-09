import { Button } from '@affine/component';
import { useEffect, useMemo, useRef, useState } from 'react';

import type { MergeSegment } from '../ai/types';
import * as styles from './recording-bar.css';

declare global {
  interface Window {
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  }
}

interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechResultLike) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

interface SpeechResultLike {
  results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }>;
}

interface RecordingBarProps {
  /** Called with the captured segments when recording stops. */
  onSegments: (segments: MergeSegment[]) => void;
  disabled?: boolean;
}

/**
 * Mic recording with live speech-to-text (the browser's SpeechRecognition —
 * Chromium ships it; unsupported browsers get a hint instead).
 * Audio is never persisted — only transcript segments matter, per Dan's
 * "transcribe then delete" decision.
 */
export const RecordingBar = ({ onSegments, disabled }: RecordingBarProps) => {
  const [recording, setRecording] = useState(false);
  const [liveText, setLiveText] = useState('');
  const [error, setError] = useState('');
  const segmentsRef = useRef<MergeSegment[]>([]);
  const startedAtRef = useRef(0);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const supported = useMemo(
    () =>
      typeof window !== 'undefined' &&
      !!window.webkitSpeechRecognition &&
      !!navigator.mediaDevices,
    []
  );

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []);

  const start = async () => {
    setError('');
    segmentsRef.current = [];
    startedAtRef.current = Date.now();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const Recognition = window.webkitSpeechRecognition;
      if (!Recognition) {
        stream.getTracks().forEach(t => t.stop());
        setError(
          'Speech recognition is not available in this browser. Paste a transcript below instead.'
        );
        return;
      }

      const recognition = new Recognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-GB';
      recognition.onresult = event => {
        let interim = '';
        const results = Array.from(event.results);
        for (const result of results) {
          const text = result[0]?.transcript ?? '';
          if (result.isFinal && text) {
            segmentsRef.current.push({
              speaker: 'You',
              text: text.trim(),
              startMs: Date.now() - startedAtRef.current,
            });
          } else {
            interim = text;
          }
        }
        setLiveText(interim);
      };
      recognition.onerror = event => {
        setError(`Recognition error: ${event.error}`);
      };
      recognition.onend = () => {
        setRecording(false);
        streamRef.current?.getTracks().forEach(t => t.stop());
        streamRef.current = null;
        onSegments(segmentsRef.current);
      };
      recognitionRef.current = recognition;
      recognition.start();
      setRecording(true);
    } catch (err) {
      setError(
        `Microphone unavailable: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  };

  const stop = () => {
    recognitionRef.current?.stop();
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setRecording(false);
    onSegments(segmentsRef.current);
  };

  if (!supported) {
    return (
      <div className={styles.unsupported}>
        Live recording needs Chromium (mic + speech recognition). Paste a
        transcript below instead — same result.
      </div>
    );
  }

  return (
    <div className={styles.bar}>
      {recording ? (
        <Button onClick={stop} variant="error">
          ⏹ Stop recording
        </Button>
      ) : (
        <Button
          onClick={() => {
            start().catch(err =>
              setError(
                `Microphone unavailable: ${err instanceof Error ? err.message : String(err)}`
              )
            );
          }}
          variant="primary"
          disabled={disabled}
        >
          🎙 Start meeting recording
        </Button>
      )}
      {recording ? (
        <span className={styles.live}>● {liveText || 'listening…'}</span>
      ) : null}
      {error ? <span className={styles.error}>{error}</span> : null}
    </div>
  );
};
