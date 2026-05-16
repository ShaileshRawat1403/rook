# Workflow Outcomes v0.1 Closeout

## Thesis

The workflow outcomes layer turns governed workflow runs into comparable evidence. Rook records one factual `WorkflowRunTelemetry` artifact per completed module-backed run, derives baselines at read time for each immutable `moduleId@version`, and surfaces the smallest useful summary when the operator chooses a module. This closes the loop between execution and reusable knowledge without letting telemetry become judgment: facts are stored, humans decide what to improve, and any improved module becomes a new version.

## Final state

The v0.1 outcomes plan is complete through v0.1.3.

| Slice | Final state |
| --- | --- |
| Steps 1–5 | Schema, recorder, terminal wiring, exception classification, and intervention classification shipped. |
| Step 6 | Five-run schema-readability gate passed against live `repo-review` runs; field notes F1/F2/F3 were folded back into the spec. |
| Step 7 | Derived baseline aggregation shipped and tested against the five-run corpus. |
| Step 8 | First UI consumer shipped at module selection; the scope lock now matches the hardened implementation. |
| v0.1.1 hardening | Recorder visibility, cache invalidation, schema guard, retention policy, CI repair, and cross-boundary round-trip test shipped. |
| v0.1.2 review fixes | Runtime telemetry shape guard plus prevalence-vs-instance correction shipped. |
| v0.1.3 review-gap pass | Eager telemetry on `requestOutputChanges` (G1), trust posture derived from facts (G3), `updateColony` persistence (G4), source-event flush before terminal recording (G5). G2 was already addressed; G5 the only one where reviewer flagged it as defer-worthy. |

## What landed on `origin/main`

| Commit | What it does |
| --- | --- |
| `d74a1fdc` | Scope-locks the operating model and the outcomes layer. |
| `348d1aa2` | Captures Step 6 field notes and opens the dedicated Step 8 UI scope lock. |
| `0d4a1cc2` | Adds the v0.1 telemetry schema and `workflow_outcome_recorded` event type. |
| `9eb7bb59` | Adds the telemetry recorder and atomic per-run JSON writer. |
| `75bdf6d1` | Wires terminal recording plus exception and intervention classification. |
| `504fe8c3` | Clarifies source-event handling after the combined recorder/classification slice. |
| `374f85d3` | Adds derived baseline aggregation from stored telemetry files. |
| `0f8b936d` | Surfaces baseline stats in the module selector. |
| `10e934c6` | Scope-locks the v0.1.1 hardening pass. |
| `0681fa6f` | Repairs the stale `agents.test.ts` Tauri mock seam so CI signal is clean again. |
| `99678dea` | Makes recorder failures visible in the console without breaking the close path. |
| `9b6cfbf8` | Skips unsupported telemetry schema versions during aggregation. |
| `d05738a0` | Invalidates cached module baselines after a successful recorder write. |
| `f4dd8e08` | Adds a Rust cross-boundary round-trip test for the TS → Tauri → disk → read seam. |
| `143ad5bf` | Documents telemetry retention policy and the v0.2 retention candidate. |
| `dde03337` | Filters malformed-but-valid JSON telemetry records instead of crashing the baseline path. |
| `9c8d91cf` | Splits raw instance counts from per-run prevalence and moves the UI to prevalence wording. |
| `2924f421` | Aligns round-trip fixture actors with live emission behavior. |
| `0c2f36b7` | Syncs the baseline-display scope lock to the hardened implementation. |

## Operating rules that survived implementation

The build did not weaken the original shape of the system:

1. **Telemetry stores facts only.** Counts, booleans, classifications, and timestamps are persisted. No stored scores, recommendations, or AI-authored improvement advice were added.
2. **Baselines are derived, not stored.** Aggregation still scans telemetry artifacts at read time; changing the math does not rewrite history.
3. **Modules remain immutable.** Every run pins `moduleId@version`; improvement is still a fork, never an edit in place.
4. **Classification stays at existing capture points.** The recorder tags facts already emitted by Colony, review, ACP, and Sentinel seams rather than inventing speculative middleware.
5. **Rook points; the user acts.** The outcomes layer records and summarizes. It does not auto-retry, auto-approve, auto-modify, or silently promote modules.
6. **No visual builder leaked into v0.1.** The first UI surface is a compact reader at module selection, not an authoring canvas or analytics product.

## Field notes from real data

These are the details that only became obvious once telemetry met live runs and review pressure:

1. **Initial scope selection is setup, not intervention.** `adjust_scope` fires when an already-set scope changes; it does not fire when scope is selected for the first time. A sixth calibration run confirmed the distinction.
2. **`outputContractSatisfied` is intentionally coarse.** It can be `false` even when `evidenceSatisfied` and `reviewerApproved` are both `true`; readers must triangulate with task completion until v0.2 decomposes the readiness conditions.
3. **`approvalRequests: 0` is expected in no-model runs.** Manual exploratory sessions produce no ACP permission requests. Zeroes are not evidence of a broken seam until a model-backed run should have exercised it.
4. **Prevalence and incidence are not the same metric.** Raw `exceptionsByClass` counts every occurrence; `exceptionRunsByClass` counts distinct affected runs. Any UI sentence of the form `"X of N runs"` must use prevalence, or one noisy run can make the operator see impossible math.

## v0.2 backlog, ranked by pressure

### Will hurt soon under real usage

1. **Decompose `outputContractSatisfied`.** The current boolean is readable only by triangulation. The moment operators compare many runs, named subconditions (`tasksComplete`, `requiredSectionsPresent`, `evidenceSatisfied`, `reviewerSatisfied`) will save diagnosis time.
2. **Validate live policy/tool seams from real agent runs.** Unit coverage exists for `policy_exception` and `tool_exception`, but the first naturally model-backed run that emits `permission.requested`, `governance.evaluated`, or failed `tool.executed` events should be inspected as a runtime hardening pass.
3. **Introduce `runAttemptId` for multi-attempt runs.** v0.1.3 made `requestOutputChanges` write telemetry so review-then-abandon is visible, but a close-after-fix still overwrites the intermediate `changes_requested` record. Once operators routinely iterate (request changes → fix → review → close), per-attempt history needs to be its own telemetry record keyed by `runAttemptId`, with `colonyId` as the parent. Schema change; defer until a real iteration pattern exists.
4. **DAX trust contribution.** v0.1.3 derives trust posture from local facts. When DAX trust audit is real, the derivation either becomes a fallback when DAX is silent, or gets replaced entirely.

### Will hurt eventually

1. **Implement retention.** The policy is documented; cleanup is not. File growth is acceptable now, but it becomes operational debt once module usage becomes routine.
2. **Refine module-selection semantics.** Sample size, confidence, and richer explanation may matter once operators compare several real module versions rather than reading a handful of early runs.

### Speculative until pressure appears

1. **Module forking / promotion UI.** The operating model needs it eventually, but there is not yet enough evidence about how operators want to revise modules.
2. **Cross-module rollups.** Useful only after several modules have meaningful production traffic.
3. **DAX-side telemetry mirror.** Likely right long-term for independent trust audit, but Rook telemetry is sufficient as the v0.1 canonical record.

## Known stale items outside this loop

- `agents.test.ts` was stale during the hardening pass and is now fixed by `0681fa6f`.
- `acpNotificationHandler.test.ts` remains red on `origin/main` because of a TDZ/import-time cycle involving `acpSessionTracker.ts`. It is not an outcomes-layer defect. When convenient, cut a small `fix(acp): break tracker initialization cycle` slice rather than letting that unrelated red test keep aging.

## Where to re-enter

Read these in order:

1. `docs/integrations/rook-dax-project-manifesto.md` — product boundary: Rook coordinates, DAX governs.
2. `docs/integrations/OPERATING_MODEL_V0_1.md` — the twelve-step operating spine and surface contracts.
3. `docs/integrations/WORKFLOW_OUTCOMES_V0_1.md` — canonical outcomes-layer contract, field notes, retention policy, and v0.2 questions.
4. `docs/integrations/OUTCOMES_BASELINE_DISPLAY_V0_1.md` — the first UI consumer and the resolved post-ship decisions.
5. `docs/integrations/HARDENING_V0_1_1.md` — the production-readiness hardening pass.
6. `docs/integrations/WORKFLOW_OUTCOMES_IMPLEMENTATION_CONTEXT.md` — implementation geography and the original non-negotiables.

## Reopen criteria

Do not reopen the outcomes layer merely because a next idea is available. Reopen it when one of these becomes true:

- real model-backed runs expose policy/tool telemetry seams that need correction;
- operators cannot explain false `outputContractSatisfied` runs quickly from the current fields;
- telemetry volume makes manual retention untenable;
- enough module versions exist that selection needs richer semantics than the current compact card;
- a real operator workflow demands promotion/forking rather than making it attractive in the abstract.

Until then, the correct next move is usage.
