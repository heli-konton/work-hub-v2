import { style } from '@vanilla-extract/css';

export const root = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
  padding: '8px 12px',
  height: '100%',
  boxSizing: 'border-box',
});

export const header = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  fontWeight: 600,
  fontSize: 'var(--affine-font-sm)',
  color: 'var(--affine-text-primary-color)',
});

export const createRow = style({
  display: 'flex',
  gap: '8px',
});

export const input = style({
  width: '100%',
  boxSizing: 'border-box',
  padding: '6px 8px',
  borderRadius: '6px',
  border: '1px solid var(--affine-border-color)',
  background: 'var(--affine-white)',
  color: 'var(--affine-text-primary-color)',
  fontSize: 'var(--affine-font-sm)',
  outline: 'none',
  selectors: {
    '&:focus': {
      borderColor: 'var(--affine-primary-color)',
    },
  },
});

export const textarea = style({
  width: '100%',
  boxSizing: 'border-box',
  padding: '8px',
  borderRadius: '6px',
  border: '1px solid var(--affine-border-color)',
  background: 'var(--affine-white)',
  color: 'var(--affine-text-primary-color)',
  fontSize: 'var(--affine-font-sm)',
  fontFamily: 'var(--affine-font-mono, monospace)',
  resize: 'vertical',
  outline: 'none',
});

export const list = style({
  flex: '0 1 30%',
  minHeight: '80px',
  maxHeight: '180px',
});

export const empty = style({
  color: 'var(--affine-text-secondary-color)',
  fontSize: 'var(--affine-font-xs)',
  padding: '8px 4px',
});

export const item = style({
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  width: '100%',
  padding: '6px 8px',
  borderRadius: '6px',
  border: 'none',
  background: 'transparent',
  color: 'var(--affine-text-primary-color)',
  fontSize: 'var(--affine-font-sm)',
  cursor: 'pointer',
  textAlign: 'left',
  selectors: {
    '&:hover': {
      background: 'var(--affine-hover-color)',
    },
  },
});

export const itemActive = style([
  item,
  {
    background: 'var(--affine-hover-color)',
  },
]);

export const itemTitle = style({
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
});

export const detail = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
});

export const fieldLabel = style({
  fontSize: 'var(--affine-font-xs)',
  color: 'var(--affine-text-secondary-color)',
});

export const actions = style({
  display: 'flex',
  gap: '8px',
});

export const message = style({
  fontSize: 'var(--affine-font-xs)',
  color: 'var(--affine-text-secondary-color)',
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
});

export const settings = style({
  marginTop: 'auto',
  borderTop: '1px solid var(--affine-border-color)',
  paddingTop: '8px',
});

export const settingsToggle = style({
  border: 'none',
  background: 'transparent',
  color: 'var(--affine-text-secondary-color)',
  fontSize: 'var(--affine-font-xs)',
  cursor: 'pointer',
  padding: 0,
});

export const settingsBody = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
  marginTop: '8px',
});
