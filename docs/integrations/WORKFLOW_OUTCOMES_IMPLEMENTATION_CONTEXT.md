# Workflow Outcomes — Implementation Context Pack

## What this document is

This is a **context pack** for an implementer (you, or an automated coding agent like Codex) who has no prior knowledge of this repository or the planning conversation that produced the scope. It exists so the implementer can land the v0.1 outcomes layer without needing the operator to re-explain the project on every step.

If you are about to write code for the outcomes layer, read this document **first**, then the two scope locks it points to, then start.

## Binding documents (read in this order)

1. **`docs/integrations/rook-dax-project-manifesto.md`** — what Rook and DAX are and why they are not the same product.
2. **`docs/integrations/OPERATING_MODEL_V0_1.md`** — the twelve-step flow, risk tiers, surface contracts. This is the spine.
3. **`docs/integrations/WORKFLOW_OUTCOMES_V0_1.md`** — the schemas, file layout, and 8-step implementation sequence you are implementing. **This is the contract.**

If anything in this context pack conflicts with those three documents, the documents win. This pack is orientation, not authority.

## Project context (one screen)

**Rook** is an adaptive agent workstation: it makes AI-assisted work visible, governable, and approachable to non-developers while remaining useful to technical operators. It owns the UI, the desktop shell, agent setup, Colony (multi-role work sessions), and Sentinel (visible governance).

**DAX** is the governed execution authority: it owns runtime governance, policy, approval semantics, evidence receipts, audit posture, and the trust model. Rook coordinates the colony; DAX governs the run; the user remains the operator.

The two repositories are **siblings**, not nested. They communicate through explicit, versioned bridge contracts — never a shared package. The current bridge points are:

- ACP (Agent Communication Protocol) — Rook starts DAX via the `dax-acp` launcher.
- Sentinel bridge — Rook converts ACP permission requests into `ProposedAction` and asks DAX for a `GovernanceDecision` via `dax governance evaluate`.

**Rook ships on two tracks**: a mature Electron app at `ui/desktop/`, and a newer Tauri v2 app at `ui/rook/`. **All new work in this scope targets `ui/rook/`.**

## The bigger picture (operating model in one paragraph)

Every run is anchored to a **Work Item** (the subject) and executed by a **Workflow Module** (the method). Modules are immutable; improvement creates a new version. Risk tiers (`low` / `medium` / `high`) decide which gates fire — Sentinel, human plan review, per-action approval, evidence receipts, blocking trust posture. The user always sees governance happen; the AI never silently auto-approves anything. After a run completes, telemetry is recorded against `moduleId@version` so modules become measurably better over time. **The outcomes layer is that telemetry layer.** Without it, "modules improve over time" is anecdotal.

## The job at hand (outcomes layer in one paragraph)

Build the per-run telemetry substrate: a `WorkflowRunTelemetry` JSON file written to `~/.rook/runs/<runId>/telemetry.json` at every Colony terminal transition, plus a single new event type `workflow_outcome_recorded` pointing to that file. Classify exceptions (6 classes) and human interventions (6 reasons) at existing capture points — do not invent new detection paths. Add a read-time `getModuleBaseline()` function that aggregates telemetry across runs. **No UI in this scope.** Definition of done is "five real runs of `repo-review` are inspectable from the JSON files alone, and the baseline function prints correct stats." Full scope and acceptance in `WORKFLOW_OUTCOMES_V0_1.md`.

## Non-negotiables (these will fail review if violated)

1. **Telemetry stores facts only.** Counts, booleans, classifications, timestamps. No 0–100 scores. No `recommended` booleans. No AI-generated improvement suggestions. Judgment-laden derivatives are out of v0.1.
2. **Baselines are derived, not stored.** `getModuleBaseline()` scans telemetry files at call time. Do not persist aggregates.
3. **Modules are immutable.** Any change to a module forks a new version. Telemetry pins `moduleId@version`.
4. **Classification at existing capture points only.** Tag the events Rook already emits (Sentinel decisions, review gates, ACP errors). Do not add new detection middleware.
5. **No visual workflow builder.** Authoring is "save successful run as module" + manual JSON edit. A drag-and-drop canvas is explicitly deferred to v0.3 reassessment.
6. **"Rook points, user acts."** Right-panel actions are user-clicked. AI-triggered file writes, opens, or runs go through an explicit approval gate. The outcomes layer must not normalize automation that bypasses this.
7. **No co-author trailers, no PRs.** This is a solo-maintained project. Commit to a feature branch and stop. Do not run `gh pr create`. Do not add `Co-Authored-By` lines.
8. **Dual-track aware.** `ui/desktop/` is the stable Electron app and is **not** in scope. All new code goes in `ui/rook/`. Do not touch the Electron tree.

## Repo geography

```text
ui/rook/                                  # Tauri v2 app — all new work here
├── src/
│   ├── features/
│   │   ├── colony/                      # Colony: seats, tasks, handoffs, artifacts
│   │   │   ├── types.ts                 # ColonySession, ColonyLifecycleStatus, etc.
│   │   │   ├── colonyStore.ts           # Zustand store
│   │   │   ├── colonyPersistence.ts     # disk persistence
│   │   │   ├── outputReadiness.ts       # output contract checks
│   │   │   └── swarm/                   # Swarm recipes (workflow modules today)
│   │   │       ├── recipes.ts           # built-ins: repo-review, prd-builder
│   │   │       ├── plan.ts              # createSwarmPlan()
│   │   │       └── types.ts
│   │   ├── events/                      # event store API
│   │   │   ├── api/events.ts            # emit/read events
│   │   │   └── types.ts                 # event type union — extend here
│   │   ├── sentinel/                    # Sentinel UI
│   │   ├── work-items/                  # Work Item store (subject of every run)
│   │   │   ├── api/workItems.ts
│   │   │   └── types.ts
│   │   └── workflow-outcomes/           # NEW — your work lands here
│   └── shared/api/
│       ├── acpConnection.ts             # ACP bridge — permission requests flow through here
│       └── sentinel/
│           ├── daxSentinel.ts           # calls Tauri `sentinel_evaluate`
│           ├── permissionMapper.ts      # ProposedAction ↔ GovernanceDecision
│           ├── noopSentinel.ts          # fallback when Sentinel is off
│           └── types.ts
├── src-tauri/src/commands/
│   ├── events.rs                        # event store (SQLite)
│   ├── work_items.rs                    # work item commands
│   └── sentinel.rs                      # sentinel_evaluate command — calls DAX
└── ...

docs/integrations/                        # all scope-lock and architecture docs
├── rook-dax-project-manifesto.md
├── OPERATING_MODEL_V0_1.md
├── WORKFLOW_OUTCOMES_V0_1.md            # the contract
└── WORKFLOW_OUTCOMES_IMPLEMENTATION_CONTEXT.md   # this file

~/.rook/                                  # runtime state on the user's machine
├── runs/<runId>/                        # per-run artifacts; telemetry.json will live here
└── work-items/                          # work item store
```

## Where things already are (so you don't reinvent)

| What you need                | Where it already exists                                             |
| ---------------------------- | ------------------------------------------------------------------- |
| Colony state + lifecycle     | `ui/rook/src/features/colony/colonyStore.ts`, `types.ts`            |
| Output contract satisfaction | `ui/rook/src/features/colony/outputReadiness.ts`                    |
| Swarm recipes (modules today)| `ui/rook/src/features/colony/swarm/recipes.ts`, `plan.ts`           |
| Event emission and read      | `ui/rook/src/features/events/api/events.ts`                         |
| Event type union             | `ui/rook/src/features/events/types.ts` (add `workflow_outcome_recorded` here) |
| Work Item store              | `ui/rook/src/features/work-items/api/workItems.ts`                  |
| Sentinel calls into DAX      | `ui/rook/src/shared/api/sentinel/daxSentinel.ts`                    |
| Permission decision mapping  | `ui/rook/src/shared/api/sentinel/permissionMapper.ts`               |
| SQLite event store backend   | `ui/rook/src-tauri/src/commands/events.rs`                          |

Use these. Do not create parallel stores.

## Conventions and patterns to match

- **TypeScript types live in `types.ts` next to the feature.** Match the existing pattern in `colony/types.ts` and `events/types.ts`.
- **API functions live in `api/<feature>.ts`.** They are the only callers of Tauri commands; UI consumes the API, not the Tauri layer directly.
- **State stores use Zustand.** See `colonyStore.ts` for the pattern. Persistence goes through a sibling `*Persistence.ts` file.
- **Tests live next to source.** `Foo.test.ts` next to `Foo.ts`. Use the existing test style (Vitest).
- **Tauri command names are snake_case** (`sentinel_evaluate`, `record_workflow_outcome` if you add one). The TS-side wrapper is camelCase.
- **No new dependencies** unless absolutely required. Check `package.json` first; the project already has the libs needed for JSON IO, atomic file writes, and event emission.

## What "done" looks like for v0.1

Cross-reference with `WORKFLOW_OUTCOMES_V0_1.md` § Acceptance Criteria. In summary:

1. New types compile in `ui/rook/src/features/workflow-outcomes/types.ts`.
2. New event type `workflow_outcome_recorded` is in the event type union.
3. A recorder writes valid `~/.rook/runs/<runId>/telemetry.json` files on every Colony terminal transition.
4. Sentinel deny and review rejection both surface in telemetry with the correct exception class.
5. Every human decision in a run carries a classified intervention reason.
6. **Five `repo-review` runs can be fully described by reading the JSON files alone.** This is the hardest gate. If you can't answer "which run had the most interventions and why" by reading the JSON, the schema is wrong and needs fixing before baselines.
7. `getModuleBaseline('repo-review', '1.0.0')` returns correct aggregates from those five files.

No UI work. No analytics dashboard. No scoring algorithm. No suggestions engine.

## How to sequence the work

Follow the 8 steps in `WORKFLOW_OUTCOMES_V0_1.md` in order. Each step has a single stop condition. **Do not start step N+1 until step N's stop condition is green.** The schema lock (Step 1) and the recorder (Step 2) are pure foundation; Step 6 (the five-runs gate) is the real correctness check; Step 7 (derived baseline) is the payoff.

Resist the urge to:
- Build the baseline before the recorder works.
- Build UI before the baseline works.
- Add scoring or suggestions before someone asks for them.
- Generalize the recorder to handle modules that don't exist yet.

## Trust philosophy (do not violate)

The product's trust posture is `"Rook points, user acts, OS opens."` AI surfaces actions; the user performs them. This applies to the outcomes layer in two ways:

1. **Telemetry must not be a back door for silent automation.** The recorder records what happened; it does not initiate actions, retry failures, or notify channels unless explicitly designed to.
2. **`needs_approval` is a pause-for-human, not an auto-pick.** If you touch the Sentinel/ACP path while wiring intervention classification, do not introduce an "auto-resolve" shortcut. The operating model explicitly forbids it.

## Operator preferences

- Solo maintainer. No co-author trailers in commits. No pull requests via `gh pr create`. Commit to a feature branch and stop.
- Branch convention: `feat/sdlc-*` or `feat/workflow-outcomes-*` — match the existing branch style visible in `git log`.
- Commit messages: short, conventional-commit style (`feat(outcomes): add telemetry recorder`). One commit per coherent step is fine.

## Quick sanity checklist before you start

- [ ] You have read `OPERATING_MODEL_V0_1.md` and `WORKFLOW_OUTCOMES_V0_1.md` end-to-end.
- [ ] You can locate `colonyStore.ts`, `events/types.ts`, `daxSentinel.ts`, and the `~/.rook/runs/` directory.
- [ ] You understand that all work happens in `ui/rook/`, not `ui/desktop/`.
- [ ] You understand the five-runs gate before baselines.
- [ ] You will not add scores, suggestions, or a UI in v0.1.

If any of the above is unclear, re-read the binding documents before writing code.

## Reference: the 8 implementation steps (one-line each)

1. **Schema lock** — create `types.ts` and add `workflow_outcome_recorded` to the event type union.
2. **Recorder** — `recordWorkflowOutcome(runId)` builds and atomically writes telemetry.json.
3. **Recorder wiring** — invoke at every Colony terminal lifecycle transition.
4. **Exception classification** — tag Sentinel denies, ACP errors, review rejections, missing evidence.
5. **Intervention classification** — tag every human decision with one of six reasons.
6. **Five-runs gate** — five real `repo-review` runs must be fully readable from JSON.
7. **Derived baseline** — `getModuleBaseline()` reads telemetry files and computes aggregates.
8. **UI gate** — out of scope; opens a new scope-lock doc.

Full detail and stop conditions: `WORKFLOW_OUTCOMES_V0_1.md` § Implementation sequence.

## When in doubt

The order of authority is:

1. `OPERATING_MODEL_V0_1.md` (the spine).
2. `WORKFLOW_OUTCOMES_V0_1.md` (the contract you are implementing).
3. This context pack (orientation).
4. The existing code (patterns to match).

If the four conflict, ask the operator. Do not silently resolve disagreement by writing code that compromises any of the binding rules in the non-negotiables section above.
