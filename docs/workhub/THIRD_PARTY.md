# Third-party attributions

## Onyx-Dev-Labs/doodle-note (MIT)

Files under `packages/frontend/core/src/modules/meetings/` port or adapt
material from https://github.com/Onyx-Dev-Labs/doodle-note:

> MIT License
>
> Copyright (c) 2026 Onyx Dev Labs
>
> Permission is hereby granted, free of charge, to any person obtaining a copy
> of this software and associated documentation files (the "Software"), to deal
> in the Software without restriction, including without limitation the rights
> to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
> copies of the Software, and to permit persons to whom the Software is
> furnished to do so, subject to the following conditions:
>
> The above copyright notice and this permission notice shall be included in all
> copies or substantial portions of the Software.
>
> THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
> IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
> FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
> AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
> LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
> OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
> SOFTWARE.

Ported/adapted:

- `ai/templates.ts` — meeting note templates (ported, formatting only)
- `ai/prompt.ts` — merge prompts (adapted: persona name)
- `ai/ask-prompt.ts` — ask-anything prompts (adapted: persona name)
- `ai/map-reduce.ts` — long-meeting condensation orchestration (ported)
- `ai/types.ts` — engine/input types (adapted: engine set changed)
- `engine/events.ts` — NDJSON sidecar protocol (mirrored, original design)

The doodle-note Swift capture engine itself is reused as an external
sidecar binary on macOS builds; it is not vendored into this repository.
