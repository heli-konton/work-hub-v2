import type { AttachmentBlockModel } from '@blocksuite/affine/model';

export type AttachmentType =
  | 'pdf'
  | 'image'
  | 'audio'
  | 'video'
  | 'text'
  | 'markdown'
  | 'html'
  | 'unknown';

export type AttachmentViewerProps = {
  model: AttachmentBlockModel;
};

export type AttachmentViewerBaseProps = {
  model: AttachmentBlockModel;
  name: string;
  ext: string;
  size: string;
};
