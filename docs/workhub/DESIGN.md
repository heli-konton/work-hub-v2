# Work Hub v2 — Module Design on the AFFiNE Base

Status: draft v0.1 — mapping Work Hub functionality onto the AFFiNE fork.
Base: fork of `toeverything/AFFiNE` (canary), repo `heli-konton/work-hub-v2`.
Behavior reference: `heli-konton/work-hub-v2-native` (native SwiftUI build, Astra session)
and the v1 web app (`work-hub-main/` inside the native repo).

## Why AFFiNE is the base

- Edgeless canvas (blocksuite) = the requested endless canvas: file attachments,
  linked docs, connectors (mind-map edges) — already exist.
- Attachment blocks + `pdf`/`peek-view` modules = click-to-preview instead of download.
- Local-first workspace with SQLite + blob storage today, self-host server
  (`packages/backend/server`, `.docker/selfhost`) for v3/v4 sync — the exact
  self-host-DB-then-sync roadmap.
- TypeScript: buildable and testable on nova-core; the native build was
  macOS-only and could not be iterated on here.

## Module map

Each Work Hub module lands in `packages/frontend/core/src/modules/<name>`,
following AFFiNE's DI module conventions (entity/services/views via the
infra framework). Domain logic lives in plain TS classes so it stays
UI-independent and MCP-accessible.

### 1. Meetings (DoodleNote mechanism, ported from `Onyx-Dev-Labs/doodle-note`, MIT)

Source of truth: `doodle-note` packages `meetings-store`, `ai`, `engine`.

- **Capture**: two-channel topology — mic = "You", system audio = "Them"
  (speaker separation from capture topology, no diarization).
  - Desktop (Electron main): spawn the Swift `engine` sidecar (NDJSON over
    stdout) — reuse doodle-note's `engine` build; crash-safe rotating CAF
    checkpoints, merge to `audio.m4a` on clean stop.
  - Web: browser `getUserMedia` mic-only capture (system audio unavailable in
    browser; degrades gracefully).
  - Transport-agnostic NDJSON event protocol identical to doodle-note so the
    UI never talks to the sidecar directly.
- **Transcription**: on-device via engine (FluidAudio/Parakeet, Apple Silicon).
  Non-Mac fallback: whisper.cpp worker on nova-core (stub for v2; the
  mechanism wiring is the deliverable).
- **Summary**: port `templates.ts` + `map-reduce.ts` from doodle-note `ai`
  package. Local provider interface (Ollama/OpenAI-compatible shim, same
  pattern as v1's Anthropic→OpenAI shim). Outputs: summary, decisions, action
  items + owners, next meeting.
- **Staging / end-of-day**: idempotent staging by meeting ID → creates AFFiNE
  pages + action entries into a linked database. Duplicate prevention via
  `(meetingId, revision)` key. Edits after staging → new revision +
  reconciliation, matching the native design spec.
- **Ask-anything**: grounded Q&A over the meeting transcript (port
  `ask-prompt.ts`).

### 2. Projects / Tracker

- A **Project** = an AFFiNE page with structured content blocks for: setup,
  business context, confidence, phase, RAG, next action, team, stakeholders,
  governance, milestones.
- **RAID log, action log, timeline, history** = AFFiNE database blocks
  (table + kanban views) linked from the project page. Fields match the
  native `WorkspaceStore` schema.
- **Legacy import**: port `LegacyImport.swift` logic — import
  `tracker-state.json` / `kanban-state.json` / `todo-state.json` into pages +
  database rows, preserving unknown fields and keeping the original JSON as
  an attachment backup.

### 3. Kanban

- AFFiNE database blocks already have a kanban view: boards = database
  blocks; columns = kanban-view groups; cards = rows with tags, assignees,
  dates, descriptions, dependencies (link fields), activity history (AFFiNE
  change history).

### 4. Memory (quick capture / inbox)

- Quick capture → a dedicated inbox collection + global "capture" affordance.
- Folder/job/task structure via collections + database properties; Today view
  = filtered database view (due/start dates); completion → archive collection
  (preserves restore).

### 5. Daily Check-in

- v1 backend (`work-hub-main/deploy-ec2/checkin`) had no matching frontend —
  port the behavior: daily questions → local-LLM coach response via the
  provider shim; history stored as AFFiNE pages under a Check-in collection.
- Provider: local-first (Ollama) with cloud override, mirroring v1's shim.

## Canvas requirements (user-facing)

1. **Any-file-type on canvas**: attachment blocks for html/md/txt/docx/pdf
   (and images/video natively). 
2. **Click-to-preview, not download**: extend the `peek-view`/`pdf` modules
   with renderers for text/markdown/html (inline) and docx (converted
   preview). Word previews render read-only (no import required).
3. **Doc mind-mapping**: drag doc links from the sidebar onto the edgeless
   canvas; connect related docs with connector elements; each node opens its
   doc on click (double-click drill-in, single click peek).

## v3/v4 wiring (self-host DB + sync)

- All module state lives inside AFFiNE Workspace/Blob abstractions — nothing
  writes files outside the workspace.
- v3: run `packages/backend/server` (Prisma/Postgres) + `.docker/selfhost`
  compose on the lab NAS; workspaces sync via AFFiNE's existing sync path.
- v4: multi-device sync (his Mac + lab) over the self-hosted server.
- Meeting audio: blob size limit is configurable; audio stays local-first and
  is excluded from sync by default (matches doodle-note's privacy model:
  sync content, not audio).

## Verification order

1. Fork builds and `yarn dev` runs on nova-core.
2. Meetings module: store + staging + summary templates (unit-testable
   without audio hardware).
3. Legacy import: round-trip the three JSON formats.
4. Canvas: file attachment + preview renderers + connector mind-maps.
5. Self-host smoke: backend server + docker compose on the NAS (v3 gate).

## Open questions for Dan

1. Meeting transcription on non-Mac: whisper.cpp worker acceptable, or is the
   Mac the only recording surface for v2?
2. Blob limit for audio: default AFFiNE single-blob cap is ~10MB per file —
   chunking (doodle-note-style 30s checkpoints as blobs) is the plan; OK?
3. Check-in coach: local Ollama model on nova-core, or keep the Nous Portal
   shim from v1?
