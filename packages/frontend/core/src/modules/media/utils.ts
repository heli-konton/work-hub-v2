import type { AttachmentBlockModel } from '@blocksuite/affine/model';

const imageExts = new Set([
  'jpg',
  'jpeg',
  'png',
  'gif',
  'webp',
  'svg',
  'avif',
  'tiff',
  'bmp',
]);

const audioExts = new Set(['mp3', 'wav', 'ogg', 'flac', 'm4a', 'aac', 'opus']);

const videoExts = new Set([
  'mp4',
  'webm',
  'avi',
  'mov',
  'mkv',
  'mpeg',
  'ogv',
  '3gp',
]);

export function getAttachmentType(model: AttachmentBlockModel) {
  const type = model.props.type;

  // Check MIME type first
  if (type.startsWith('image/')) {
    return 'image';
  }

  if (type.startsWith('audio/')) {
    return 'audio';
  }

  if (type.startsWith('video/')) {
    return 'video';
  }

  if (type === 'application/pdf') {
    return 'pdf';
  }

  // Text-family MIME types — preview instead of download.
  if (type === 'text/markdown' || type === 'text/x-markdown') {
    return 'markdown';
  }

  if (type === 'text/html' || type === 'application/xhtml+xml') {
    return 'html';
  }

  if (type.startsWith('text/')) {
    return 'text';
  }

  // If MIME type doesn't match, check file extension
  const ext = model.props.name.split('.').pop()?.toLowerCase() ?? '';

  if (imageExts.has(ext)) {
    return 'image';
  }

  if (audioExts.has(ext)) {
    return 'audio';
  }

  if (videoExts.has(ext)) {
    return 'video';
  }

  if (ext === 'pdf') {
    return 'pdf';
  }

  if (ext === 'md' || ext === 'markdown') {
    return 'markdown';
  }

  if (ext === 'html' || ext === 'htm') {
    return 'html';
  }

  if (ext === 'txt' || ext === 'text' || ext === 'log') {
    return 'text';
  }

  return 'unknown';
}

export async function downloadBlobToBuffer(model: AttachmentBlockModel) {
  const sourceId = model.props.sourceId$.peek();
  if (!sourceId) {
    throw new Error('Attachment not found');
  }

  const blob = await model.store.blobSync.get(sourceId);
  if (!blob) {
    throw new Error('Attachment not found');
  }

  return await blob.arrayBuffer();
}
