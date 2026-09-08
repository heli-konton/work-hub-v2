import { globalStyle, style } from '@vanilla-extract/css';

export const container = style({
  width: '100%',
  height: '100%',
  minHeight: '253px',
  overflow: 'auto',
  padding: '16px',
  display: 'flex',
  flexDirection: 'column',
  boxSizing: 'border-box',
});

export const code = style({
  margin: 0,
  flex: 1,
  fontFamily: 'var(--affine-font-mono, ui-monospace, monospace)',
  fontSize: 'var(--affine-font-sm)',
  lineHeight: '1.6',
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
  color: 'var(--affine-text-primary-color)',
  background: 'transparent',
});

export const loading = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  height: '100%',
  color: 'var(--affine-text-secondary-color)',
  fontSize: 'var(--affine-font-sm)',
});

globalStyle(`${container}::-webkit-scrollbar`, {
  width: '6px',
  height: '6px',
});
