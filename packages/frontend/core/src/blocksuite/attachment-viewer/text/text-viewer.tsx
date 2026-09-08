import { LiveData, useLiveData } from '@toeverything/infra';
import { useMemo } from 'react';

import type { AttachmentViewerBaseProps } from '../types';
import * as styles from './text-viewer.css';

/**
 * Text/markdown/html attachment viewer — click-to-preview instead of
 * download. Markdown and HTML render as source text for now (safe by
 * default: rendered HTML previews and markdown rendering land once the
 * renderer dependency is approved — see docs/workhub/DESIGN.md §Canvas).
 */
interface TextContent {
  text: string;
}

function loadText(
  model: AttachmentViewerBaseProps['model'],
  blobId: string
): LiveData<TextContent | null> {
  const data = new LiveData<TextContent | null>(null);
  model.store.blobSync
    .get(blobId)
    .then(blob => (blob ? blob.text() : null))
    .then(text => {
      if (text != null) data.next({ text });
    })
    .catch(err => console.error('[text-viewer] failed to read blob:', err));
  return data;
}

export const TextViewer = ({ model, ext }: AttachmentViewerBaseProps) => {
  const blobId = useLiveData(
    useMemo(() => LiveData.fromSignal(model.props.sourceId$), [model])
  );
  const content = useLiveData(
    useMemo(
      () => (blobId != null ? loadText(model, blobId) : null),
      [model, blobId]
    )
  );

  return (
    <div className={styles.container}>
      {content ? (
        <pre className={styles.code}>{content.text}</pre>
      ) : (
        <div className={styles.loading}>Loading .{ext}…</div>
      )}
    </div>
  );
};
