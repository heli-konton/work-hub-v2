import type { ElementOrFactory } from '@affine/component';
import { AttachmentEmbedPreview } from '@affine/core/blocksuite/attachment-viewer/attachment-embed-preview';
import { getAttachmentType } from '@affine/core/modules/media/utils';
import { AttachmentEmbedConfigIdentifier } from '@blocksuite/affine/blocks/attachment';
import {
  type ViewExtensionContext,
  ViewExtensionProvider,
} from '@blocksuite/affine/ext-loader';
import type { AttachmentBlockModel } from '@blocksuite/affine/model';
import type { ExtensionType } from '@blocksuite/affine/store';
import type { TemplateResult } from 'lit';
import { z } from 'zod';

/**
 * Work Hub: text/markdown/html attachments render inline on the canvas
 * (click-to-preview instead of a download-only card). Follows the audio
 * embed pattern: when the type check passes, the attachment block renders
 * via AttachmentEmbedPreview, which routes text-family files to TextViewer.
 */
export function patchForTextFileEmbedView(
  reactToLit: (element: ElementOrFactory, context?: boolean) => TemplateResult
): ExtensionType {
  return {
    setup: di => {
      const check = (model: AttachmentBlockModel, maxFileSize: number) =>
        ['text', 'markdown', 'html'].includes(getAttachmentType(model)) &&
        model.props.size <= maxFileSize;

      for (const name of ['text', 'markdown', 'html'] as const) {
        di.override(AttachmentEmbedConfigIdentifier(name), () => ({
          name,
          check,
          render: (model: AttachmentBlockModel) =>
            reactToLit(<AttachmentEmbedPreview model={model} />, true),
        }));
      }
    },
  };
}

const optionsSchema = z.object({
  reactToLit: z.optional(
    z
      .function()
      .args(z.custom<ElementOrFactory>(), z.boolean().optional())
      .returns(z.custom<TemplateResult>())
  ),
});

type TextFileViewOptions = z.infer<typeof optionsSchema>;

export class TextFileViewExtension extends ViewExtensionProvider<TextFileViewOptions> {
  override name = 'affine-view-text-file';

  override schema = optionsSchema;

  override setup(context: ViewExtensionContext, options?: TextFileViewOptions) {
    super.setup(context, options);
    const reactToLit = options?.reactToLit;
    if (!reactToLit) {
      return;
    }
    context.register(patchForTextFileEmbedView(reactToLit));
  }
}
