import { AttachmentBlockComponent } from './attachment-block';
import { AttachmentEdgelessBlockComponent } from './attachment-edgeless-block';
import { AttachmentHtmlEmbed } from './html-embed';

export function effects() {
  customElements.define(
    'affine-edgeless-attachment',
    AttachmentEdgelessBlockComponent
  );
  customElements.define('affine-attachment', AttachmentBlockComponent);
  customElements.define('affine-attachment-html-embed', AttachmentHtmlEmbed);
}
