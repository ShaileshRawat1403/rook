# Branch Handoff - 2026-05-01

## Stable root

Local `main` is the current integration branch.

It includes:

- Intent integrity routing
- Workspace readiness/open actions/summary slices
- Rook branding refresh
- Sole-maintainer governance update
- Shell-output hardening
- Work Item Core

`main` is ahead of `origin/main`; push it after final checks pass.

## Merged

### `feat/work-item-core`

Status: merged into `main`.

Merge commit:

```text
f0f9a478 Merge feat/work-item-core: add Work Item Core
```

What landed:

- Local Work Item storage commands
- Work Item frontend API/store/types
- Work Item system-prompt injection
- Session metadata support for `workItemId`
- Focused backend/frontend tests

Validation run before merge:

```text
cargo test --manifest-path ui/rook/src-tauri/Cargo.toml work_items
pnpm --dir ui/rook test src/features/work-items src/features/chat/stores/__tests__/chatSessionStore.test.ts
pnpm --dir ui/rook exec biome check src/features/work-items src/features/chat/stores/chatSessionStore.ts src/features/chat/stores/__tests__/chatSessionStore.test.ts src/features/chat/ui/ChatView.tsx
pnpm --dir ui/rook run typecheck
git diff --check
```

## Ready but not merged

### `feat/rook-event-runtime`

Status: rebased onto current `main`; focused checks pass.

Current head:

```text
cb14641a feat(ui): add rook event store
```

What it adds:

- SQLite-backed Rook event store
- `RookEvent` schema
- Tauri commands for appending and listing events
- Frontend event API/types

Validation run:

```text
cargo test --manifest-path ui/rook/src-tauri/Cargo.toml events
pnpm --dir ui/rook exec biome check src/features/events
git diff --check
```

Recommendation:

Merge this only when you are ready to introduce SQLite/SQLx into the app runtime. The slice is intentionally infrastructure-only and still has no product consumer. That is acceptable, but it should be merged deliberately because it expands dependencies through `sqlx` and `libsqlite3-sys`.

## Parked WIP

### `wip/provider-model-selection-handoff`

Status: preserved from the old stash; not merge-ready.

Current head:

```text
f45c8e38 wip(ui): preserve provider model selection handoff
```

What it contains:

- Provider/model picker changes
- Chat input/toolbar changes
- Chat session store changes
- Home screen/provider catalog/settings changes
- `docs/integrations/rook-dax-project-manifesto.md`

Why it is parked:

- It came from a stash, not a current slice branch.
- Its merge base is old relative to current `main`.
- It overlaps heavily with chat session/model-selection code.
- It needs a fresh review, rebase, and focused validation before merge.

Recommended next step:

Rebase this branch onto current `main`, split the documentation file if it should land independently, then review the UI/session-store behavior as its own slice.

## Safety refs

Temporary safety branches were created before cleanup:

```text
backup-main-before-cleanup
backup-work-item-core-before-merge
backup-event-runtime-before-refresh
```

They can be deleted after `main` is pushed and the two remaining branches are confirmed safe.

## Cleanup rule going forward

- Keep `main` clean and pushed.
- Keep only one active feature branch per slice.
- Convert stashes into named WIP branches immediately.
- Merge/delete completed branches after validation.
- Leave infrastructure branches unmerged until they have either a clear consumer or an explicit dependency decision.
