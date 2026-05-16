# Rook + DAX Operating Model v0.1

## Purpose

This document is the north star for how a user actually moves through Rook + DAX to get work done. It exists so that future architecture, UI/UX, and integration decisions can be checked against a single operating model instead of being reinvented per slice.

It is **not** a UI specification. UI/UX work is deferred. This document fixes the **surface contracts** — what a user must see, decide, and own at each step — so that any future UI can implement them without changing the spine.

Companion docs:
- `docs/integrations/rook-dax-project-manifesto.md` — product roles and identity.
- `docs/integrations/dax-agent-and-sentinel.md` — current integration seams.
- `docs/integrations/rook-colony-mode.md` — Colony as the human cockpit.

## Core Thesis

```text
Human defines intent.
Rook captures it as a Work Item.
A Workflow Module is selected to do the work.
Agents execute bounded parts of the module.
DAX governs risky actions.
Humans approve judgment-heavy steps.
Evidence is captured.
Outcomes are recorded against the module version.
The successful workflow becomes reusable knowledge.
```

The one-line summary:

```text
Rook coordinates the colony.
DAX governs the run.
The user remains the operator.
Modules accumulate as reusable, versioned knowledge.
```

## The Twelve-Step Flow

This is the canonical flow. Every Rook + DAX user journey is a subset of these steps. Lower-risk modules skip optional steps; higher-risk modules walk every gate.

```text
1.  Intent capture
2.  Work Item creation
3.  Workflow Module selection
4.  Module compilation
5.  Colony setup (bound to the Work Item)
6.  Agent seat execution
7.  DAX governance
8.  Human review
9.  Artifact + evidence capture
10. Trust posture
11. Outcome record
12. Reusable module promotion
```

The Work Item, not the Module, is the **subject** of the run. The Module is the **method**. This separation is load-bearing: it lets the same Work Item be re-run with a different module (improvement loop) and it lets the same Module produce comparable outcomes across many Work Items (telemetry loop).

## Operating Principles

The following principles are binding. Any UI/UX work later must honor them.

### 1. Rook points, the user acts

AI surfaces actions; the user performs them. Open, run, write, and apply are user-initiated unless the action has passed through an explicit approval gate. This is the Rook trust philosophy and must not be eroded by automation convenience.

### 2. Work-item-first

Every run is anchored to a Work Item with structured acceptance criteria. Free-form "just do this thing" prompts are converted into a Work Item before execution. The Work Item carries scope, AC, source (Jira / GitHub / local / chat), and risk tier.

### 3. Modules are immutable; improvement creates a new version

A published `WorkflowModule@v1` cannot be edited in place. Improvements produce `@v2`. Runs always pin the module version they used. This is what makes outcome telemetry meaningful and reuse safe.

### 4. Gates are tiered, not universal

Not every run needs Sentinel, human review, and evidence. The module declares its risk tier; the tier determines which gates fire. Treating gates as universal turns trust into noise and pushes users toward bypass habits.

### 5. No visual builder in v0.1

Authoring path is "save a successful run as a module" plus direct JSON edit. A drag-and-drop canvas is explicitly out of scope — it captures shape without trust signal and competes with the governance work that is the actual differentiator. Reassess at v0.3 only if module-authoring volume justifies it.

### 6. Sentinel is a visible seat, not a hidden callback

When Sentinel is active, the user can see it in the Colony, see its decisions, and see when it failed open. Hidden governance is not governance.

### 7. Surface contracts before screens

When in doubt, define what the user must see and decide. Visual design follows. This document specifies surface contracts; UI screens come later.

## Risk Tiers and Gate Selection

The module declares its risk tier. Gates fire based on the tier.

| Step              | `low` (read-only) | `medium` (advisory) | `high` (write / exec) |
| ----------------- | ----------------- | ------------------- | --------------------- |
| Work Item         | required          | required            | required              |
| Scope lock        | optional          | required            | required              |
| Sentinel          | off               | on (fail-open ok)   | on (fail-closed)      |
| Human plan review | skipped           | optional            | required              |
| Human approval    | skipped           | per-artifact        | per-action            |
| Evidence required | no                | yes (light)         | yes (full receipts)   |
| Trust posture     | computed          | computed + shown    | computed + blocking   |
| Outcome record    | required          | required            | required              |

A module that wants to skip a gate appropriate to its tier must declare an `escapeReason` in its definition. Future audits can grep for these.

## Surface Contracts (per step)

These are the user-facing contracts. Each names **what must be visible**, **what the user must decide**, and **what is logged**. Visual design is open.

### Step 1 — Intent capture

- **Visible:** the user's raw intent text, the inferred scope, the inferred risk tier, the inferred module candidate.
- **User decides:** confirm or revise scope, confirm or revise risk tier, confirm or revise module candidate.
- **Logged:** `intent_captured` event with raw text, inferences, and confirmations.

### Step 2 — Work Item creation

- **Visible:** title, structured acceptance criteria (editable), source (Jira / GitHub / local / chat), scope, risk tier.
- **User decides:** approve the AC, attach to existing Work Item, or create new.
- **Logged:** `work_item_created` or `work_item_attached`.

### Step 3 — Workflow Module selection

- **Visible:** the candidate module, its purpose, its risk tier, its gate profile, prior outcome stats for this module version (success rate, avg time-to-verified, common exception classes).
- **User decides:** accept the candidate, pick a different module, or decline and stay in chat-only mode.
- **Logged:** `module_selected` with `moduleId@version` pinned.
- **Authoring note:** new modules originate from "save successful run" (Step 12) or from manual JSON edit. No canvas.

### Step 4 — Module compilation

- **Visible:** the compiled plan — seats, tasks, handoffs, output contract, gate profile.
- **User decides:** nothing yet; this is the preview before Colony creation.
- **Logged:** `module_compiled` with compiled plan hash.

### Step 5 — Colony setup

- **Visible:** the Colony with seats (including Sentinel as a seat when active), tasks, handoffs, attached Work Item, lifecycle state.
- **User decides:** scope lock (if tier requires), plan approval (if tier requires).
- **Logged:** `colony_created`, `scope_locked`, `plan_approved`.

### Step 6 — Agent seat execution

- **Visible:** which seat is active, what task it is on, what context it has access to, what context is denied to it, live progress.
- **User decides:** intervene, pause, or let it continue.
- **Logged:** per-seat task start/end, per-tool invocation, per-context-fetch.

### Step 7 — DAX governance

- **Visible:** every governance decision as it happens — `allow`, `deny`, `needs_approval`, `modify`, `persist_rule`. Fail-open events are surfaced explicitly with a banner.
- **User decides:** approve, deny, or modify when `needs_approval` is returned. `needs_approval` **must pause execution** and must not auto-pick.
- **Logged:** `sentinel_decision_requested`, `sentinel_decision_received`, `sentinel_fail_open`, `sentinel_denied_action`, `sentinel_needs_approval`, `human_approval_resolved`.

### Step 8 — Human review

- **Visible:** the draft artifact, the evidence attached to it, the reviewer checklist from the output contract, the seats that contributed.
- **User decides:** approve, request changes, deny, or modify.
- **Logged:** `review_started`, `review_resolved` with decision and operator note.

### Step 9 — Artifact + evidence capture

- **Visible:** the final artifact, its required sections (from output contract), the evidence receipts backing each claim, files inspected, commands run, decisions made.
- **User decides:** nothing — this is a capture step. The decision happened at review.
- **Logged:** `artifact_produced`, `evidence_receipt_attached`.

### Step 10 — Trust posture

- **Visible:** the trust posture (`open` / `guarded` / `blocked` / `verified` / `failed`), the reasons backing it, and what would change it.
- **User decides:** nothing. Trust is computed by DAX from evidence and gates. Users cannot manually mark a run `verified`.
- **Logged:** `trust_computed` with posture and reasons.

### Step 11 — Outcome record

- **Visible:** outcome record — success / partial / aborted / changes-requested / failed; duration; exception class if any; gate events count.
- **User decides:** optionally annotate the outcome with a note.
- **Logged:** `outcome_recorded` keyed by `moduleId@version`. **This is what feeds module improvement.**

### Step 12 — Reusable module promotion

- **Visible:** the proposal to save this run as a module (or as a new version of an existing module), with the diff if it's a new version.
- **User decides:** save, save as new version, or skip. Saved modules omit raw transcript by default; they save **pattern + evidence requirements + reviewer checklist**, not the run's evidence itself.
- **Logged:** `module_published` with `moduleId@version`.

## Practical Use Cases

Three grounded use cases to validate that the model serves real work. Each names the steps fired, the tier, and the user-visible surface.

### Use case A — Low-risk read-only

> *"Summarize my open work items across Jira and GitHub."*

- **Tier:** `low`.
- **Steps fired:** 1, 2, 3, 4, 5 (no scope lock), 6, 9 (light), 11.
- **Gates skipped:** Sentinel, plan review, human approval, evidence receipts, trust blocking.
- **What the user sees:** intent confirm → Work Item with AC ("a list grouped by project, sorted by priority") → module candidate `work-item-summary` → Colony with one seat (Reader) → draft summary → outcome.
- **Time budget:** seconds to a minute. Friction must match the stakes.

### Use case B — Medium-risk advisory

> *"Review this repo and tell me if it is ready for release."*

- **Tier:** `medium`.
- **Steps fired:** all 12.
- **Gates active:** Sentinel for any file-write or command-exec attempt (fail-open allowed with banner), human review of the final artifact, evidence receipts for each claim.
- **What the user sees:** intent confirm → Work Item with AC ("blockers, risks, evidence, recommendation") → module candidate `repo-review` → Colony with seats Planner, Repo Explorer, CI/Test Inspector, Security Reviewer, Reviewer, Sentinel → live progress per seat → Sentinel decisions visible → draft report with evidence → review prompt → trust posture `guarded` with reasons → outcome.
- **Time budget:** minutes. User reviews at the end, not per action.

### Use case C — High-risk write-action

> *"Apply the suggested dependency fix to `package.json` and run tests."*

- **Tier:** `high`.
- **Steps fired:** all 12, with per-action approval.
- **Gates active:** scope lock required, Sentinel fail-closed, per-action human approval (every file write, every command exec), full evidence receipts, trust posture blocks completion until verified.
- **What the user sees:** intent confirm → Work Item with explicit AC ("change X, tests pass, no other files modified") → module candidate `apply-fix` → scope lock dialog → Colony with seats Planner, Applier, Verifier, Sentinel → before each write, an explicit approval prompt showing the diff → command outputs and test results as evidence → review prompt → trust posture `verified` only if AC and evidence agree → outcome.
- **Time budget:** the user is in the loop. The model trades speed for accountability — that is the point.

## Outcome Telemetry and the Improvement Loop

This is the part of the model that turns runs into knowledge.

Every run emits a `WorkflowRunTelemetry` record keyed by `moduleId@version`. The detailed schema, exception taxonomy, intervention taxonomy, storage layout, and implementation plan live in `docs/integrations/WORKFLOW_OUTCOMES_V0_1.md` — that document is the source of truth for the outcomes layer.

**Two rules from the outcomes layer apply here:**

1. **Telemetry is stored; baselines are derived.** Per-run telemetry is persisted as JSON. Aggregates (success rate, top exception, etc.) are computed at read time from telemetry, not stored. This lets the aggregation math change without rewriting history.
2. **No stored scores, no stored recommendations, no AI-suggested improvements in v0.1.** Telemetry reports facts (counts, booleans, classifications). Judgment-laden derivatives are out of scope for v0.1.

Aggregations per `moduleId@version`:

- success rate
- median time-to-verified
- top exception classes
- ratio of sentinel-denies and human-denies
- changes-requested ratio

These aggregates appear in Step 3 (module selection) so the user picks modules with eyes open. They also drive the decision to fork a new version: a module trending toward high `changes_requested` is a candidate for revision.

Module improvement is a **fork**, never an edit:

```text
repo-review@v1  →  fork  →  repo-review@v2
                            (new module, prior runs still pinned to v1)
```

## What This Model Replaces

This model supersedes implicit assumptions in prior planning docs:

- The earlier "core flow" placed a drag-and-drop builder at Step 3. That step is now "Workflow Module selection" with no canvas; authoring is via save-from-run.
- The earlier flow jumped Intent → Module. The Work Item is now mandatory between them.
- The earlier `needs_approval` behavior (auto-pick) is now an explicit pause for human decision. Auto-pick is forbidden.
- The earlier flow had no outcome layer. Step 11 (Outcome Record) is now first-class.
- Module evolution was undefined. Modules are now immutable; improvement is a new version.

## Out of Scope for v0.1

The following are explicitly **not** in scope for this operating model. Each may be reconsidered for a later version.

- **Visual workflow builder (drag-and-drop canvas).** Authoring path is save-from-run + JSON edit. Reassess at v0.3.
- **Cross-module composition / sub-workflows.** A module is atomic in v0.1. DAX workflow graphs may compose, but Rook surfaces them as a single module to the user.
- **Multi-user Colony.** Single operator per Colony. Multi-user collaboration is a v0.x concern.
- **Module marketplace / sharing.** Modules are local to `.rook/modules/`. Sharing format is a later concern.
- **Auto-improvement of modules.** Outcome data is shown to the user; the user forks. No automated module mutation.
- **UI specification.** Screens, layouts, themes, copy — all later. This doc fixes surface contracts only.

## Open Questions (deferred decisions)

These need resolution before v0.2, not v0.1:

1. **Sentinel-as-seat type extension.** Should `Seat` gain a `kind: "governance"` variant, or should Sentinel be a parallel object referenced by the Colony? Lean toward the latter; revisit when implementing Step 7 visibility.
2. **Scope lock semantics for `low` tier.** Currently optional. Some read-only operations still benefit from a declared scope (which Jira project, which repo). Consider promoting to `recommended` once we see real low-tier usage.
3. **Where outcome records live.** Rook event store, DAX evidence store, or a third location keyed by `moduleId@version`. Lean toward Rook event store with a DAX-side mirror for trust-relevant fields.
4. **Module version migration.** When a run is in-flight and `@v1` is forked to `@v2`, the in-flight run stays on `@v1`. No mid-run upgrade. Confirm this rule when implementing Step 12.
5. **Risk tier override.** Can the user upgrade a module's tier for a single run (e.g., run `repo-review` at `high` because the repo is sensitive)? Recommended: yes, but downgrade is forbidden.

## Acceptance Criteria for "v0.1 Adopted"

This document is considered adopted when:

- [ ] Rook docs reference this file from `rook-dax-project-manifesto.md` and `rook-colony-mode.md`.
- [ ] The twelve-step flow is the named flow in any new Rook scope-lock doc.
- [ ] No new scope-lock doc proposes a visual builder without explicitly reopening the v0.3 question.
- [ ] `WorkItem` is the subject in any new Colony-touching slice.
- [ ] `OutcomeRecord` schema is implemented before module-improvement features ship.
- [ ] `needs_approval` auto-pick fallback is replaced with a real pause-for-human gate.

## Changelog

- **v0.1 (2026-05-16):** Initial operating model. Established twelve-step flow, risk tiers, surface contracts, three use cases, outcome telemetry, immutable module versioning. Visual builder explicitly deferred. Work Item established as the subject of every run.
