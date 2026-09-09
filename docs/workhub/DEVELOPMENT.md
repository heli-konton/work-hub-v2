# Work Hub v2 — Development

Work Hub v2 is a fork of [AFFiNE](https://github.com/toeverything/AFFiNE)
(canary). Upstream sync: `git fetch upstream && git merge upstream/canary`.

## Working on the lab (nova-core)

- Repo lives on the NAS: `/mnt/ai-sanctuary/portfolio/projects/in-development/work-hub-v2`
- The NAS SMB share must be mounted with `mfsymlinks` (already set in
  `/etc/fstab`) or yarn's workspace symlinks fail with EIO.
- Toolchain: node >= 22.12, yarn 4.18 (via corepack: `corepack enable
--install-directory ~/.local/bin && corepack prepare yarn@4.18.0 --activate`).

```bash
cd /mnt/ai-sanctuary/portfolio/projects/in-development/work-hub-v2
yarn install          # slow over SMB (~10-20 min); it completes
yarn affine init      # postinstall does not run (enableScripts: false)
yarn affine dev -p @affine/web   # web app dev server

# targeted checks
yarn vitest run packages/frontend/core/src/modules/meetings/__tests__/meetings-ai.spec.ts
yarn typecheck        # tsc -b over the whole project
yarn lint:ox          # oxlint --deny-warnings
```

### Dev server notes

- Serves on **8080 normally**; rspack auto-increments (8081, …) if the port
  is busy — always read the `Local:` line from the process output.
- The Tailscale URL for the preview pane is `http://100.95.247.38:<port>`.
- If the page won't load: check `ss -tlnp | grep 808` and the process list —
  the server has been observed dying to SIGTERM on its own; restart it.
- First compile over SMB takes ~10-15 min; warm restarts are a few minutes.

## Branches

- `workhub` — Work Hub changes (current default for Work Hub work)
- upstream `canary` — AFFiNE upstream, untouched
- The native SwiftUI baseline (pre-fork iteration) lives in
  `heli-konton/work-hub-v2-native`; it is the behavior spec for module parity.

## Where things live

- Meetings module: `packages/frontend/core/src/modules/meetings/`
  (AI pipeline ported from doodle-note, MIT — see THIRD_PARTY.md)
- Attachment previews: `packages/frontend/core/src/blocksuite/attachment-viewer/`
- Module design: `docs/workhub/DESIGN.md`
