import { EdgelessLegacySlotIdentifier } from '@blocksuite/affine-block-surface';
import {
  AttachmentBlockModel,
  AttachmentBlockSchema,
  AttachmentBlockStyles,
} from '@blocksuite/affine-model';
import {
  EMBED_CARD_HEIGHT,
  EMBED_CARD_WIDTH,
} from '@blocksuite/affine-shared/consts';
import { toGfxBlockComponent } from '@blocksuite/std';
import { GfxViewInteractionExtension } from '@blocksuite/std/gfx';
import { styleMap } from 'lit/directives/style-map.js';

import { AttachmentBlockComponent } from './attachment-block.js';
import {
  HTML_EMBED_EDGELESS_MIN_HEIGHT,
  HTML_EMBED_EDGELESS_MIN_WIDTH,
  isHtmlAttachment,
} from './html-embed.js';

export class AttachmentEdgelessBlockComponent extends toGfxBlockComponent(
  AttachmentBlockComponent
) {
  override blockDraggable = false;

  protected override readonly isGfxView = true;

  get slots() {
    return this.std.get(EdgelessLegacySlotIdentifier);
  }

  override connectedCallback() {
    super.connectedCallback();
    this.disposables.add(
      this.slots.elementResizeStart.subscribe(() => {
        this.htmlResizing$.value = true;
      })
    );
    this.disposables.add(
      this.slots.elementResizeEnd.subscribe(() => {
        this.htmlResizing$.value = false;
      })
    );
  }

  override onClick(_: MouseEvent) {
    return;
  }

  override renderGfxBlock() {
    if (this.isHtmlEmbed) {
      // Render HTML at its real size (no card scaling) so the page inside
      // lays out for the frame the user drew.
      const { w, h } = this.model.elementBound;
      this.containerStyleMap = styleMap({
        width: `${w}px`,
        height: `${h}px`,
        overflow: 'hidden',
      });
      return this.renderPageContent();
    }

    const { style$ } = this.model.props;
    const cardStyle = style$.value ?? AttachmentBlockStyles[1];
    const width = EMBED_CARD_WIDTH[cardStyle];
    const height = EMBED_CARD_HEIGHT[cardStyle];
    const bound = this.model.elementBound;
    const scaleX = bound.w / width;
    const scaleY = bound.h / height;

    this.containerStyleMap = styleMap({
      width: `${width}px`,
      height: `${height}px`,
      transform: `scale(${scaleX}, ${scaleY})`,
      transformOrigin: '0 0',
      overflow: 'hidden',
    });

    return this.renderPageContent();
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'affine-edgeless-attachment': AttachmentEdgelessBlockComponent;
  }
}

export const AttachmentBlockInteraction = GfxViewInteractionExtension(
  AttachmentBlockSchema.model.flavour,
  {
    resizeConstraint: {
      lockRatio: true,
    },
    handleResize: ({ model }) => ({
      beforeResize: context => {
        // HTML embeds are frames, not cards: let them change shape freely.
        if (
          model instanceof AttachmentBlockModel &&
          model.props.embed &&
          isHtmlAttachment(model.props)
        ) {
          context.set({
            lockRatio: false,
            minWidth: HTML_EMBED_EDGELESS_MIN_WIDTH,
            minHeight: HTML_EMBED_EDGELESS_MIN_HEIGHT,
          });
        }
      },
    }),
    handleRotate: () => {
      return {
        beforeRotate: context => {
          context.set({
            rotatable: false,
          });
        },
      };
    },
  }
);
