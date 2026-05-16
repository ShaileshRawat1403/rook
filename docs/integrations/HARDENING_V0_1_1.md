# Outcomes Layer Hardening v0.1.1

## Purpose

Production-readiness hardening for the v0.1 outcomes layer shipped at `0f8b936d`. Closes five real risks identified in post-merge review and adds one cross-boundary integration test to lock the TS↔Rust seam.

Not a feature release. No new schemas, no new UI surfaces, no new exception classes. v0.2 candidates remain in `WORKFLOW_OUTCOMES_V0_1.md` § Open questions.

## In scope (binding)

### H1 — Repair `agents.test.ts` failures

Three pre-existing test failures in `src/shared/api/__tests__/agents.test.ts` are red on `origin/main`. They fail because mocked Tauri invokes are not being asserted correctly — the tests are out of sync with current source.

**Why now:** A red CI baseline means future failures hide in noise. Fixing now restores CI signal before more code lands.

**Acceptance:** `pnpm test src/shared/api/__tests__/agents.test.ts` is 100% green.

### H2 — Visible recorder errors

`recordTerminalWorkflowOutcome` in `colonyStore.ts:171-173` catches recorder errors and discards. If the recorder ever fails in production, telemetry stops silently. No console signal, no event log entry, no operator visibility.

**Fix:** Replace `.catch(() => {})` with `.catch((error) => console.warn("[workflow-outcomes] recorder failed:", error))`. Matches the same pattern already in `sourceEvents.ts:7-9`.

**Acceptance:** Forcing the recorder to throw (e.g., by mocking `recordWorkflowOutcome` to reject) prints the warn to the dev console without aborting `closeColony`.

### H3 — Baseline cache invalidation on run completion

`useModuleBaseline` caches per `moduleId@version` in a module-level Map. The cache never invalidates. After a Colony closes, the baseline card in `SwarmRecipeSelector` shows stale stats until full page reload — a real UX bug.

**Fix:** Subscribe to `workflow_outcome_recorded` events. When one fires, invalidate the cache key for that `moduleId@version` so the next mount re-fetches. Use the existing event store subscription pattern (or a Zustand selector if cleaner).

**Acceptance:**
- Closing a Colony invalidates the matching cache key.
- Re-mounting the card triggers a fresh `getModuleBaseline` fetch.
- A test exercises invalidation by emitting a synthetic `workflow_outcome_recorded` event.

### H4 — Schema-version guard in aggregator

`aggregateModuleBaseline` accepts any `WorkflowRunTelemetry`-shaped value without checking `schemaVersion`. When v0.2 ships a different shape, old files will silently misbehave or worse — produce wrong stats.

**Fix:** Add a guard at the start of `aggregateModuleBaseline`: filter out runs whose `schemaVersion` is not `"0.1.0"`. Emit a single `console.warn` listing the skipped count. Do not throw — partial baselines are better than no baselines.

**Acceptance:**
- Runs with `schemaVersion: "0.1.0"` are included.
- Runs with a different `schemaVersion` are skipped.
- Test covers both cases plus a mixed-version corpus.

### H5 — `~/.rook/runs/` retention policy (docs only)

Telemetry files accumulate without bound. At 5KB per run × 10k runs = 50MB. Not a v0.1.1 code change; document the intended policy now so v0.2 can implement.

**Fix:** Add a "Retention" section to `WORKFLOW_OUTCOMES_V0_1.md` documenting:
- Default policy: no automatic cleanup in v0.1.
- v0.2 candidate: rolling window of the last N=200 runs per module, or last 90 days, whichever is greater. The window is sized to keep baselines statistically meaningful while bounding disk.
- Operator override: a future setting to disable retention.

**Acceptance:** New "Retention" section exists in the spec with the stated policy.

### H6 — Cross-boundary integration test

The TS recorder produces a `WorkflowRunTelemetry` object, sends it to Rust via Tauri, Rust serializes it to disk, lists it back, and TS aggregates. Each side has unit tests; the **seam** between them is currently untested.

**Fix:** Add a Rust integration test in `commands/workflow_outcomes.rs` that:
1. Constructs a full `WorkflowRunTelemetry` JSON value with every MVP field populated (matching what the TS recorder produces today — verified against the live Step 6 fixtures).
2. Writes via `write_workflow_telemetry_in`.
3. Reads back via `list_workflow_telemetry_in`.
4. Asserts the round-tripped value structurally equals the input — no field loss, no key reordering breakage.
5. Repeats for a corpus of 5 runs (matching the Step 6 shape) and asserts list ordering tolerance (test should not assume directory traversal order).

This test catches:
- JSON serialization drift between `serde_json::to_string_pretty` and TS expectations.
- File-encoding issues (UTF-8 BOM, line endings).
- List ordering changes that would break consumer assumptions.
- Any future refactor of the writer that breaks the read path.

**Acceptance:** `cargo test workflow_outcomes::tests::end_to_end_round_trip` passes.

## Out of scope (do not add in v0.1.1)

- New exception classes, intervention reasons, or telemetry fields.
- Activity panel for governance events.
- Live policy/tool exception coverage (needs model-backed runs).
- `outputContractSatisfied` decomposition into named subconditions.
- Per-task telemetry.
- Cross-module rollups.
- DAX-side telemetry mirror.
- Module forking / version-bump UI.
- Automatic retention cleanup (v0.2).
- Tauri app-e2e test (heavier than the value it adds at this stage).
- Refactoring or "cleanup" outside the named items.

## Implementation sequence

Each item lands as a separate commit. Order:

1. **H1** — Repair `agents.test.ts`. Lowest-risk, restores CI signal.
2. **H2** — Recorder error visibility. Two-line change.
3. **H4** — Schema-version guard. Pure aggregator update, no UI touch.
4. **H3** — Baseline cache invalidation. Touches the hook + needs a subscription seam.
5. **H6** — Cross-boundary integration test. Confirms H4 didn't break the seam.
6. **H5** — Retention doc update. Last; pure documentation.

Stop conditions follow the acceptance criteria per item.

## Acceptance criteria for v0.1.1 adopted

- [ ] All 6 items land as separate commits on `feat/outcomes-v0-1-1-hardening`.
- [ ] `pnpm typecheck` passes.
- [ ] `pnpm test` passes including the H1 repair and H3/H4 new tests.
- [ ] `cargo test workflow_outcomes` passes including H6 round-trip test.
- [ ] No new dependencies added.
- [ ] Branch fast-forwards into `main` with linear history.

## Changelog

- **v0.1.1 (2026-05-16):** Initial hardening scope lock. Six items: agents test repair, recorder error visibility, baseline cache invalidation, schema-version guard, retention policy doc, cross-boundary integration test. No feature work.
