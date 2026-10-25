import type { AttachmentBlockModel } from '@blocksuite/affine-model';
import { css, html, LitElement } from 'lit';
import { property, state } from 'lit/decorators.js';

/**
 * Work Hub: render `.html` attachments inline (like Obsidian's HTML embed).
 *
 * The file is shown in a sandboxed iframe. Scripts, forms and popups work,
 * but `allow-same-origin` is deliberately absent: the embedded page gets an
 * opaque origin and cannot touch the AFFiNE page, its cookies or its storage.
 */
export const HTML_EMBED_SANDBOX = [
  'allow-scripts',
  'allow-forms',
  'allow-popups',
  'allow-popups-to-escape-sandbox',
  'allow-modals',
  'allow-downloads',
  'allow-pointer-lock',
].join(' ');

// Page (doc) mode: the embed spans the column width; its height is resizable.
export const HTML_EMBED_DEFAULT_HEIGHT = 480;
export const HTML_EMBED_MIN_HEIGHT = 120;
export const HTML_EMBED_MAX_HEIGHT = 4000;

// Edgeless (canvas) mode: freely resizable frame.
export const HTML_EMBED_EDGELESS_WIDTH = 800;
export const HTML_EMBED_EDGELESS_HEIGHT = 600;
export const HTML_EMBED_EDGELESS_MIN_WIDTH = 240;
export const HTML_EMBED_EDGELESS_MIN_HEIGHT = 160;

const HTML_MIME_TYPES = ['text/html', 'application/xhtml+xml'];
const HTML_EXTENSION = /\.x?html?$/i;

/**
 * Files dropped from Finder/Explorer often arrive with an empty or generic
 * MIME type, so the extension is checked as a fallback.
 */
export function isHtmlAttachment({
  name,
  type,
}: {
  name: string;
  type: string;
}): boolean {
  const mime = type.toLowerCase();
  if (HTML_MIME_TYPES.some(htmlType => mime.startsWith(htmlType))) {
    return true;
  }
  return HTML_EXTENSION.test(name);
}

export class AttachmentHtmlEmbed extends LitElement {
  static override styles = css`
    :host {
      display: block;
      width: 100%;
      height: 100%;
    }

    iframe {
      display: block;
      width: 100%;
      height: 100%;
      border: none;
      background: #fff;
      color-scheme: light;
    }

    .status {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
      color: var(--affine-text-secondary-color);
      font-family: var(--affine-font-family);
      font-size: var(--affine-font-sm);
    }
  `;

  private _loadToken = 0;

  private _unsubscribe: (() => void) | null = null;

  override connectedCallback() {
    super.connectedCallback();
    if (!this.model) return;
    this._unsubscribe = this.model.props.sourceId$.subscribe(sourceId => {
      this._load(sourceId).catch(console.error);
    });
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this._unsubscribe?.();
    this._unsubscribe = null;
  }

  /** Re-reads the file and restarts the embedded page. */
  reload() {
    this._load(this.model.props.sourceId$.peek()).catch(console.error);
  }

  private async _load(sourceId: string | undefined) {
    const token = ++this._loadToken;
    this.failed = false;
    this.content = null;
    if (!sourceId) return;

    try {
      const blob = await this.model.store.blobSync.get(sourceId);
      const text = blob ? await blob.text() : null;
      if (token !== this._loadToken) return;
      this.content = text;
      this.failed = text === null;
    } catch (err) {
      if (token !== this._loadToken) return;
      console.error('[attachment] failed to load html embed', err);
      this.failed = true;
    }
  }

  override render() {
    if (this.failed) {
      return html`<div class="status">Unable to load this HTML file</div>`;
    }
    if (this.content === null) {
      return html`<div class="status">Loading…</div>`;
    }
    return html`<iframe
      title=${this.model.props.name}
      sandbox=${HTML_EMBED_SANDBOX}
      allow="fullscreen; clipboard-write; autoplay"
      allowfullscreen
      referrerpolicy="no-referrer"
      .srcdoc=${this.content}
    ></iframe>`;
  }

  @state()
  accessor content: string | null = null;

  @state()
  accessor failed = false;

  @property({ attribute: false })
  accessor model!: AttachmentBlockModel;
}

declare global {
  interface HTMLElementTagNameMap {
    'affine-attachment-html-embed': AttachmentHtmlEmbed;
  }
}
