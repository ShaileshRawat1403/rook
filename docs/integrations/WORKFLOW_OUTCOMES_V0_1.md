# Workflow Outcomes Layer v0.1

## Purpose

This document is the **implementation scope lock** for the workflow outcomes layer — the telemetry, exception, and intervention substrate that lets Rook + DAX measure runs and improve modules over time.

It is the next non-UI priority after `OPERATING_MODEL_V0_1.md`. UI consumers (module-selection stats, baseline displays) are deferred until this layer is producing real data.

This doc supersedes the `OutcomeRecord` sketch in the operating model. Where they conflict, this doc wins.

## Why this layer exists

Rook + DAX can already execute governed workflows. They cannot yet answer:

- Which modules succeed?
- Which modules fail, and how?
- Where do humans intervene most?
- Which modules deserve a forked, improved version?

Without that, "every workflow becomes reusable knowledge" stays anecdotal. The outcomes layer is what makes it measurable.

## Operating rules (binding for v0.1)

1. **Telemetry stores facts.** Counts, booleans, classifications, timestamps. No scores, no recommendations, no AI-suggested improvements.
2. **Baselines are derived, not stored.** Aggregates are computed at read time from telemetry records. Lets the math evolve without rewriting history.
3. **Telemetry is a per-run artifact.** Stored as `~/.rook/runs/<runId>/telemetry.json`. Not in the SQLite event store. The event store gets a pointer event (`workflow_outcome_recorded`) referencing the file.
4. **Classification at existing capture points.** Don't invent new exception-detection or intervention-detection code paths. Tag the events Rook already emits (Sentinel decisions, review gates, ACP errors).
5. **Modules are immutable; improvement forks.** Any change to a module — copy fix, new gate, new specialist — produces a new version. Telemetry pins `moduleId@version` so historic runs stay comparable.
6. **No outcome UI in v0.1.** The first consumer is a CLI/test that prints baselines from telemetry files. UI work begins only after step 6 (below) is green.

## Schema (MVP)

### `WorkflowRunTelemetry`

```ts
export type WorkflowRunTelemetry = {
  schemaVersion: "0.1.0";

  // Identity
  runId: string;
  moduleId: string;
  moduleVersion: string;        // semver label; module record is still immutable
  workItemId?: string;
  colonyId?: string;
  daxRunId?: string;

  // Timing
  startedAt: string;            // ISO 8601
  completedAt?: string;
  durationMs?: number;

  // Outcome
  endState:
    | "succeeded"
    | "partially_succeeded"
    | "changes_requested"
    | "blocked"
    | "aborted"
    | "failed";

  // Counts (MVP set — flat, easy to aggregate)
  counts: {
    tasksTotal: number;
    tasksCompleted: number;
    approvalRequests: number;
    humanInterventions: number;
    exceptionsRaised: number;
    artifactsCreated: number;
  };

  // Quality booleans (no scores)
  quality: {
    outputContractSatisfied: boolean;
    evidenceSatisfied: boolean;
    reviewerApproved: boolean;
  };

  // Trust (from DAX; mirrored here for self-contained telemetry)
  trust: {
    posture: "open" | "guarded" | "blocked" | "verified" | "failed";
    reasons: string[];
  };

  // Classified events
  exceptions: WorkflowException[];
  interventions: WorkflowIntervention[];

  // Free-form operator note (optional)
  operatorNote?: string;
};
```

### `WorkflowException` — six classes for v0.1

```ts
export type WorkflowExceptionClass =
  | "intent_exception"      // ambiguous or shifted intent
  | "scope_exception"       // scope missing or violated
  | "tool_exception"        // ACP/tool call failed
  | "policy_exception"      // DAX denied or needs_approval blocked
  | "evidence_exception"    // required evidence missing
  | "review_exception";     // human requested changes / denied

export type WorkflowException = {
  id: string;
  class: WorkflowExceptionClass;
  severity: "low" | "medium" | "high" | "critical";
  source: "rook" | "dax" | "agent" | "human" | "tool" | "system";
  message: string;
  raisedAt: string;
  recoverable: boolean;
};
```

### `WorkflowIntervention` — six reasons for v0.1

```ts
export type WorkflowInterventionReason =
  | "clarify_intent"
  | "adjust_scope"
  | "approve_risk"
  | "request_more_evidence"
  | "request_output_changes"
  | "approve_final_output";

export type WorkflowIntervention = {
  id: string;
  reason: WorkflowInterventionReason;
  actor: "human_operator" | "reviewer" | "sentinel";
  resolvedAt: string;
  note?: string;
};
```

### Event type (single addition to event store)

```ts
// Add to existing event type union
"workflow_outcome_recorded"
```

Payload:

```ts
{
  runId: string;
  moduleId: string;
  moduleVersion: string;
  endState: WorkflowRunTelemetry["endState"];
  telemetryPath: string;   // e.g. "~/.rook/runs/<runId>/telemetry.json"
}
```

## Storage layout

```text
~/.rook/runs/<runId>/
├── telemetry.json              # WorkflowRunTelemetry
├── artifacts/                  # existing artifact storage
└── evidence/                   # existing evidence receipts
```

One file per run. Atomic write. No mutation after `completedAt` is set.

## File layout (Rook)

```text
ui/rook/src/features/workflow-outcomes/
├── types.ts                    # the schemas above
├── eventTypes.ts               # workflow_outcome_recorded event
├── recorder.ts                 # buildAndWriteTelemetry()
├── classifiers/
│   ├── exceptions.ts           # tag known capture points
│   └── interventions.ts        # tag known capture points
└── baseline.ts                 # derived read-time aggregation
```

## File layout (DAX)

DAX contributes governance/evidence/trust facts. No new package needed in v0.1 — extend the existing Sentinel bridge to return trust posture and reasons in the `GovernanceDecision` response so Rook can include them in telemetry.

```text
packages/dax/src/bridge/
└── governance.ts               # extend response shape with trustPosture + reasons
```

## Implementation sequence

Each step has a single stop condition. Do not start the next step until the prior is green.

### Step 1 — Schema lock

**Deliverable:** `ui/rook/src/features/workflow-outcomes/types.ts` exports the four types above and `eventTypes.ts` adds `workflow_outcome_recorded`.

**Stop condition:** types compile; no consumer code yet.

### Step 2 — Recorder

**Deliverable:** `recorder.ts` exports `recordWorkflowOutcome(runId): Promise<void>` that:
- Reads run state from the existing Colony / event store.
- Builds a `WorkflowRunTelemetry` with whatever fields are available (partial is OK in v0.1).
- Writes `~/.rook/runs/<runId>/telemetry.json` atomically.
- Emits `workflow_outcome_recorded` to the event store.

**Stop condition:** calling the recorder against a completed run produces a valid telemetry file.

### Step 3 — Recorder wiring

**Deliverable:** invoke `recordWorkflowOutcome(runId)` at Colony close (every terminal state, not just `closed`). Hook into the existing lifecycle transition.

**Stop condition:** a `repo-review` run produces telemetry.json automatically on completion.

### Step 4 — Exception classification at existing points

**Deliverable:** `classifiers/exceptions.ts` tags three existing capture points without inventing new ones:
- Sentinel `deny` → `policy_exception`.
- Sentinel `needs_approval` that is denied by human → `policy_exception`.
- Tool/ACP errors → `tool_exception`.
- Review "request changes" → `review_exception`.
- Output contract missing required section → `evidence_exception` (if evidence section) or general output failure logged at the recorder.

Add `intent_exception` and `scope_exception` only when a capture point exists; otherwise leave them defined but unused in v0.1.

**Stop condition:** a forced Sentinel deny and a forced review rejection both surface in telemetry with the right class.

### Step 5 — Intervention classification at existing points

**Deliverable:** `classifiers/interventions.ts` tags human-decision events with one of the six reasons. Default mapping:
- Sentinel `needs_approval` resolved by human → `approve_risk` (if allowed) or omitted (if denied → exception instead).
- Review approve → `approve_final_output`.
- Review request-changes → `request_output_changes`.
- Plan revisions before execution → `clarify_intent` or `adjust_scope` depending on what changed.
- Operator request for more evidence → `request_more_evidence`.

**Stop condition:** every human decision in a run carries an intervention reason in telemetry.

### Step 6 — Five-runs gate

**Deliverable:** run `repo-review` five times against varied repos. Inspect the five telemetry.json files by hand.

**Stop condition:** you can answer all of these by reading the files:
- Which run took longest?
- What was the most common exception class?
- How many runs had `reviewerApproved: true`?
- Which run had the most human interventions, and why?

If you can't, the schema is wrong — fix it before Step 7. Do not proceed to baselines.

### Step 7 — Derived baseline

**Deliverable:** `baseline.ts` exports `getModuleBaseline(moduleId, version): ModuleBaseline` that:
- Scans all `~/.rook/runs/*/telemetry.json` files.
- Filters by `moduleId@version`.
- Computes counts (total runs, by end state), averages (duration, interventions, exceptions), and rates (output contract pass, reviewer approval).
- Returns the aggregate. Does **not** persist it.

The `ModuleBaseline` type is whatever the function returns — it's a view object, not a stored schema. Define it inline in `baseline.ts`.

**Stop condition:** a CLI command or test prints baseline stats for `repo-review@1.0.0` from the five telemetry files.

### Step 8 (gate to UI work)

Only after Step 7 is green, the next layer of work is UI: surfacing baselines at Step 3 (module selection) of the operating model flow. That work is **out of scope for this doc** and gets its own scope lock.

## Out of scope for v0.1

- Stored baselines (derived only).
- 0–100 scoring (`completion`, `evidence`, `review`, `governance`, `overall`).
- AI-suggested module improvements.
- `reusable.recommended` field (judgment, not measurement).
- Multi-version migration tooling.
- Baseline UI / analytics dashboards.
- Per-task or per-seat telemetry (run-level only in v0.1).
- DAX-side evidence durability changes (use what exists).

## Acceptance criteria for v0.1 adopted

- [ ] `types.ts` and `eventTypes.ts` exist and compile.
- [ ] `recordWorkflowOutcome` writes a valid telemetry.json on every Colony terminal transition.
- [ ] Sentinel deny + review rejection both produce classified exceptions.
- [ ] Every human decision carries a classified intervention reason.
- [ ] Five `repo-review` runs are inspectable end-to-end from telemetry files alone.
- [ ] `getModuleBaseline` returns correct aggregates for those five runs.
- [ ] `OPERATING_MODEL_V0_1.md` references this doc as the source of truth for outcomes.

## Open questions (deferred to v0.2)

1. **Telemetry-file durability across upgrades.** If the schema changes, do we migrate old files or version them in-place? Lean toward version-in-place; baseline function handles multiple schema versions.
2. **Per-task telemetry.** Should each task in a Colony emit its own sub-telemetry, rolling up to the run? Useful for "which specialist fails most" — but premature in v0.1.
3. **Cross-module rollups.** Aggregate across all modules to find systemic issues. Defer until ≥3 modules are in production.
4. **DAX-side telemetry mirror.** Does DAX keep its own outcome record for trust audit independently? Probably yes long-term; for v0.1 the Rook telemetry is canonical.
5. **Telemetry redaction.** When a module is saved as a reusable template, does any telemetry travel with it? Default no — the template carries requirements, not facts about prior runs.

## Changelog

- **v0.1 (2026-05-16):** Initial outcomes layer scope lock. MVP schema, six exception classes, six intervention reasons, per-run JSON storage, derived baselines, no UI. Establishes the rule that telemetry stores facts only; judgment-laden derivatives are out of scope.
