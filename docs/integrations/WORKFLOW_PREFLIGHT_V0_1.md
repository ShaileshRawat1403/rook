# Workflow Preflight v0.1

## Purpose

Implement §4 of `docs/product/ROOK_USER_JOURNEYS_V0_1.md`: the runtime-readiness gate that runs **before** a workflow starts so users see "Cannot run workflow yet — provider unavailable" instead of "Failed to spawn rook serve binary…".

This is a tight, bounded slice. One module, six checks, one banner surface. No new schemas, no telemetry changes, no model integrations.

Read alongside:

1. `docs/product/ROOK_USER_JOURNEYS_V0_1.md` — the journey contract this implements.
2. `docs/integrations/OPERATING_MODEL_V0_1.md` § Step 4 (Module compilation) and § Step 5 (Colony setup) — the operating-model beats preflight sits between.

## Binding rules (v0.1)

1. **Preflight runs before Colony creation.** No seats are spawned and no telemetry is recorded until preflight passes.
2. **Preflight reports state; it does not heal it.** No auto-fix attempts. No auto-rebuild, no auto-install, no auto-create of missing directories beyond the obvious. The user gets recovery actions; the user runs them.
3. **Every failure has a recovery action.** Per §6 of the journey doc, no preflight failure surfaces a raw error without translation.
4. **Preflight is fast.** Target: completes in under 500ms on a warm system. No network calls in v0.1 — all six checks are local-only.
5. **Preflight is idempotent.** Running it ten times produces the same result and writes nothing to the filesystem.

## The six checks

Each check has a stable identifier, a binary pass/fail outcome, and a recovery action. The order matters: earlier checks must pass before later checks are meaningful.

### C1 — Execution provider configured

**Pass condition:** at least one model provider is configured in user settings, OR the local `rook` binary exists at the expected path.

**Failure recovery:** "Choose a model provider in Settings, or rebuild the local Rook runtime."

**Implementation note:** uses the existing provider registry; does not call out to the provider.

### C2 — Provider runtime reachable

**Pass condition:** if a remote provider is selected, the configured credentials are present (not necessarily valid — just present). If the local runtime is selected, the binary path exists on disk and is executable.

**Failure recovery (remote):** "Add credentials for [provider] in Settings."
**Failure recovery (local):** "Rebuild the local Rook runtime: `cargo build --bin rook` from the project root."

**Implementation note:** filesystem check for local; presence-only check for credentials. **No network call in v0.1.**

### C3 — Artifact directory writable

**Pass condition:** `~/.rook/artifacts/` exists and the process has write permission. If it doesn't exist, attempt to create it (this is the one self-healing allowance — directory creation is unambiguous and safe).

**Failure recovery:** "Rook couldn't create its artifact directory. Check permissions on `~/.rook/`."

### C4 — Workflow module valid

**Pass condition:** the selected module's recipe loads without error, declares a non-empty `specialists` array, and has a `finalArtifact` output contract with at least one `requiredSection`.

**Failure recovery:** "This workflow module is incomplete. Pick a different module."

**Implementation note:** uses the existing `SwarmRecipe` schema check; this is the same validation `getSwarmRecipe` already runs internally.

### C5 — Required inputs present

**Pass condition:** every input the module declares as required is filled in the attached Work Item. For v0.1 this means: title, description, and the module-declared acceptance-criteria minimum (if any).

**Failure recovery:** "This workflow needs more input. Missing: [list]." Each missing field is named.

**Implementation note:** the Work Item attached to the Colony is the source. If no Work Item is attached, this check fails with a single missing reason: "no Work Item attached".

### C6 — Output contract known

**Pass condition:** the module declares an output contract (`finalArtifact` block) with at least an `artifactType` and `requiredSections`.

**Failure recovery:** "This workflow doesn't declare what it produces. Pick a different module."

**Implementation note:** redundant with C4 in v0.1 since `finalArtifact.requiredSections` is part of C4's check. Kept as a distinct check for clarity in the recovery card — users see "output contract known: yes" as a positive signal even if it's structurally part of C4.

## Schema

A single type. No persistence — preflight result is computed on demand.

```ts
export type PreflightCheckId =
  | "provider_configured"
  | "provider_runtime"
  | "artifact_directory"
  | "module_valid"
  | "required_inputs"
  | "output_contract_known";

export type PreflightCheckResult = {
  id: PreflightCheckId;
  passed: boolean;
  reason?: string;          // one-line user-facing reason when failed
  recovery?: string;        // verb-led recovery action when failed
  technical?: string;       // raw error / path / detail — collapsed by default in UI
};

export type WorkflowPreflightResult = {
  schemaVersion: "0.1.0";
  ok: boolean;              // true iff every check passed
  checks: PreflightCheckResult[];
  ranAt: string;            // ISO timestamp
};
```

## File layout

```text
ui/rook/src/features/workflow-preflight/
├── types.ts                # the schema above
├── checks.ts               # six pure functions, one per check
├── runPreflight.ts         # orchestrator: runs the checks in order, builds the result
└── ui/
    └── PreflightBanner.tsx # surfaces the result; collapses technical details
```

No new Tauri commands in v0.1. C2's local-binary check uses an existing path-resolver Tauri command; C3 uses existing artifact-dir helpers. Wire the orchestrator in TS only.

## Where preflight runs

Preflight is invoked at one place in v0.1: **immediately before `colonyStore.createColony()` when a workflow module is selected.** The selection action calls `runPreflight(moduleId, workItemId)`. If `ok: true`, Colony creation proceeds. If `ok: false`, the user sees `<PreflightBanner result={result} />` and Colony creation is blocked until they re-run preflight.

Manual re-run: the banner has a "Re-check" button that re-invokes `runPreflight` with the same arguments.

## What is NOT in v0.1

- Network calls. No provider-reachability ping. No model-listing API call.
- Auto-fix beyond `mkdir -p ~/.rook/artifacts`. No auto-rebuild, no auto-install.
- Preflight telemetry. Failures are not recorded in `workflow_outcome_recorded` events. (Future: every failed-to-start workflow could emit a `preflight_failed` event; deferred.)
- Background preflight. v0.1 runs on demand at module selection only. Not continuous.
- Persistence of preflight state. No "last known good" cache.
- Mode-aware messaging (Beginner / Operator / Developer per the journey doc's deferred questions). Single message tier for v0.1.

## Implementation sequence

Six steps, each with a single stop condition. Order matters: types → checks → orchestrator → UI → wiring → tests.

### P1 — Types

**Deliverable:** `types.ts` exports `PreflightCheckId`, `PreflightCheckResult`, `WorkflowPreflightResult`.

**Stop condition:** types compile; no consumer code yet.

### P2 — Pure check functions

**Deliverable:** `checks.ts` exports six functions matching `PreflightCheckId` ids, each returning `Promise<PreflightCheckResult>`. Functions take only the data they need (module, workItem, paths) — no global state.

**Stop condition:** each check function is independently unit-testable and returns sensible pass/fail for fixture inputs.

### P3 — Orchestrator

**Deliverable:** `runPreflight.ts` exports `runPreflight(moduleId: string, workItemId?: string): Promise<WorkflowPreflightResult>`. Runs the six checks in order, builds the aggregate result.

**Stop condition:** unit test passes a contrived case where C1 fails — the remaining checks still run (preflight reports complete state, not just first failure) but `ok: false`.

### P4 — Banner UI

**Deliverable:** `PreflightBanner.tsx` renders the result. Shows: overall status, per-check status (passed/failed), per-failure recovery action, collapsed technical details.

**Stop condition:** component test renders the four states (all passed, one failed, multiple failed, fixture loading).

### P5 — Wire into Colony creation

**Deliverable:** the action that selects a module in `SwarmRecipeSelector` (or wherever Colony creation is triggered) calls `runPreflight` first. On `ok: false`, `<PreflightBanner>` renders and `createColony` is blocked.

**Stop condition:** a real failure (delete the local binary, try to start a workflow that uses local runtime) blocks at the banner with the C2 recovery copy. No raw error reaches the user.

### P6 — Live verification

**Deliverable:** retry the live SOW Builder run that prompted this scope-lock. With the binary missing, the user sees the C2 banner. With the binary built, preflight passes and the workflow proceeds.

**Stop condition:** the original failure mode (`Failed to spawn rook serve binary…` reaching a user-facing surface) is unreachable in normal use.

## Acceptance criteria for v0.1 adopted

- [ ] Six check functions exist, are pure, and have unit tests.
- [ ] `runPreflight` returns the documented aggregate shape.
- [ ] `<PreflightBanner>` renders all four states correctly.
- [ ] Workflow selection wires preflight before Colony creation.
- [ ] Deleting the local `rook` binary and attempting a local-runtime workflow produces the C2 banner, not a stack trace.
- [ ] No network call is made during preflight.
- [ ] No regression to existing tests; full `pnpm test` and `cargo test` remain green.

## Out of scope (do not add in v0.1)

- Auto-rebuild on C2 failure.
- Auto-install of model provider SDKs on C1 failure.
- Preflight telemetry event.
- Network checks (model listing, provider ping).
- Mode-aware messaging tiers.
- Preflight history / "last known good" cache.
- Healing for missing Work Item (C5) by auto-creating a draft.
- Pre-flight for Colonies created without a module (general chat).

## Open questions (deferred to v0.2)

1. **Should preflight emit a telemetry event on failure?** Useful for measuring how often workflows get blocked. Deferred until baseline data justifies the schema addition.
2. **Should C2 attempt a real provider ping?** Catches "credentials present but invalid" cases. Requires network access and async timeout handling. Defer until C2 false-positives become a real problem.
3. **Should preflight run continuously in the background?** Would let the home surface show "ready to run" / "needs setup" without the user starting a workflow. Adds runtime cost. Defer.

## Changelog

- **v0.1 (2026-05-17):** Initial scope lock. Six local-only checks, one banner, one wire point at module selection. No network, no auto-fix beyond directory creation, no telemetry. Triggered by the live SOW Builder run that surfaced `Failed to spawn rook serve binary…` as a user-facing error.
