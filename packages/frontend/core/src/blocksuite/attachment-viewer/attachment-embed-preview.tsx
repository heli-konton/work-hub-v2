import { useMemo } from 'react';

import { AudioBlockEmbedded } from './audio/audio-block';
import { AttachmentPreviewErrorBoundary } from './error';
import { PDFViewerEmbedded } from './pdf/pdf-viewer-embedded';
import { TextViewer } from './text/text-viewer';
import type { AttachmentViewerProps } from './types';
import { buildAttachmentProps, getAttachmentType } from './utils';

// Embed view
export const AttachmentEmbedPreview = ({ model }: AttachmentViewerProps) => {
  const attachmentType = getAttachmentType(model);
  const props = buildAttachmentProps(model);
  const element = useMemo(() => {
    switch (attachmentType) {
      case 'pdf':
        return <PDFViewerEmbedded model={model} />;
      case 'audio':
        return <AudioBlockEmbedded model={model} />;
      case 'text':
      case 'markdown':
      case 'html':
        return <TextViewer {...props} />;
      default:
        return null;
    }
  }, [attachmentType, model, props]);
  return (
    <AttachmentPreviewErrorBoundary>{element}</AttachmentPreviewErrorBoundary>
  );
};
