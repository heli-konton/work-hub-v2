import { style } from '@vanilla-extract/css';

export const bar = style({
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  flexWrap: 'wrap',
});

export const live = style({
  fontSize: 'var(--affine-font-sm)',
  color: 'var(--affine-error-color, var(--affine-text-secondary-color))',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  maxWidth: '420px',
});

export const error = style({
  fontSize: 'var(--affine-font-xs)',
  color: 'var(--affine-error-color, var(--affine-text-secondary-color))',
});

export const unsupported = style({
  fontSize: 'var(--affine-font-sm)',
  color: 'var(--affine-text-secondary-color)',
  padding: '8px',
  borderRadius: '6px',
  background: 'var(--affine-hover-color)',
});
