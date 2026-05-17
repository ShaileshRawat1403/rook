# Workflow State Model v0.1

## Purpose

This document defines Rook's current and target state model for workflow execution.

It exists to make a truth already visible in the codebase explicit:

```text
Rook is already stateful.
Rook is not yet state-explicit.
```

The goal of this slice is architectural clarity, not refactoring. It records what state exists today, what remains implicit, and the grammar future workflow work should converge toward.

Companion docs:

1. `docs/product/ROOK_POSITIONING_V0_1.md`
2. `docs/integrations/rook-dax-project-manifesto.md`
3. `docs/integrations/OPERATING_MODEL_V0_1.md`
4. `docs/integrations/COLONY_V1.md`
5. `docs/integrations/WORKFLOW_OUTCOMES_V0_1.md`

## Product thesis

```text
Workflow execution is the product.
Business execution is one market.
Coding is one workflow type.
```

Operationally:

```text
If work can be modeled through states, transitions, roles, rules, artifacts, evidence, and outcomes, Rook should be able to execute it.
```

Rook is not only a module selector or agent runner. A workflow becomes executable when Rook can answer:

```text
What entity is moving?
What state is it in?
What transition is allowed next?
Who or what can perform that transition?
What guard must be satisfied first?
What artifact or evidence changes because of it?
What event proves it happened?
What outcome or next state follows?
```

## Current truth

Rook already implements several concrete state layers.

### Colony lifecycle

Current code: `ui/rook/src/features/colony/types.ts`

```text
draft
active
blocked
reviewing
closed
archived
```

Question answered:

```text
Where is this execution workspace right now?
```

### Task state

Current code: `ui/rook/src/features/colony/types.ts`

```text
todo
assigned
inProgress
blocked
done
```

Question answered:

```text
What step is being executed?
```

### Review state

Current code: `ui/rook/src/features/colony/types.ts`

```text
approved
changes_requested
```

Question answered:

```text
What did the human reviewer decide about the output?
```

### Output readiness

Current code: `ui/rook/src/features/colony/outputReadiness.ts`

```text
not_ready
partially_ready
ready
```

This is a derived state computed from:

- task completion;
- required artifact presence;
- required section coverage;
- evidence satisfaction;
- reviewer satisfaction.

Question answered:

```text
Is the current output complete enough for the declared contract?
```

### Run outcome

Current code: `ui/rook/src/features/workflow-outcomes/types.ts`

```text
succeeded
partially_succeeded
changes_requested
blocked
aborted
failed
```

Question answered:

```text
How did this module-backed run end?
```

## Stateful but not state-explicit

The current system has state, but the workflow grammar is distributed across types, store methods, UI behavior, and derived helpers.

The main missing layers are:

1. **Work Item lifecycle state**
   - `WorkItem` currently has identity, source, acceptance criteria, and timestamps, but no lifecycle field.
2. **Workflow Module lifecycle state**
   - modules are immutable recipes by convention, but not yet entities with `draft / validated / released / deprecated / superseded / archived`.
3. **Artifact lifecycle state**
   - output readiness is derived, but artifacts themselves do not yet carry `drafted / evidence_pending / ready_for_review / finalized`.
4. **Declared transition grammar**
   - allowed transitions are enforced implicitly by store methods and UI guards rather than modeled once.
5. **Run attempt state**
   - v0.1 telemetry records one terminal outcome per Colony run; iterative review cycles are lossy until `runAttemptId` exists.
6. **Transition events as a shared model**
   - events exist, but each slice currently defines its own event names rather than flowing from one entity-transition grammar.

This distinction matters:

```text
Without state, Rook is orchestration.
With explicit state and controlled transitions, Rook becomes a workflow execution workbench.
```

## Core entities

### Work Item

The subject of the work.

Current:

- identity;
- source;
- title;
- description;
- acceptance criteria;
- timestamps.

Target lifecycle candidate:

```text
captured
scoped
ready_for_module
module_selected
in_execution
in_review
completed
reopened
archived
```

### Workflow Module

The reusable method.

Current:

- versioned recipe definition;
- risk level;
- specialist seats;
- output contract;
- review checklist;
- non-goals.

Target lifecycle candidate:

```text
draft
validated
released
deprecated
superseded
archived
```

### Colony

The visible execution cockpit.

Current implemented lifecycle:

```text
draft
active
blocked
reviewing
closed
archived
```

Target refinement candidate:

```text
created
planned
running
waiting_for_human
reviewing
changes_requested
blocked
closed
```

### Task

A bounded specialist step.

Current implemented state:

```text
todo
assigned
inProgress
blocked
done
```

Target refinement candidate:

```text
todo
assigned
in_progress
waiting
done
blocked
skipped
```

### Review

A human decision point.

Current implemented state:

```text
approved
changes_requested
```

Target refinement candidate:

```text
not_started
pending_review
approved
changes_requested
rejected
waived_with_reason
```

### Artifact

The concrete output delivered by the workflow.

Current:

- artifact kinds;
- content;
- optional provenance links;
- readiness inferred externally.

Target lifecycle candidate:

```text
not_started
drafted
evidence_pending
ready_for_review
approved
changes_requested
finalized
```

### Run

The module-backed execution record.

Current implemented terminal state:

```text
succeeded
partially_succeeded
changes_requested
blocked
aborted
failed
```

### Run Attempt

One reviewable attempt inside a longer-running Colony.

Current:

```text
implicit only
```

Target lifecycle candidate:

```text
started
changes_requested
retried
succeeded
failed
superseded
```

`runAttemptId` is already a real pressure point from outcomes v0.1.3 because a `changes_requested` telemetry record can be overwritten by a later close-after-fix outcome.

### Outcome

The factual result of a run or attempt.

Current:

- terminal end state;
- exception classes;
- interventions;
- quality facts;
- trust posture;
- baseline aggregation.

Target:

- remain factual;
- become attempt-aware once attempts are modeled;
- stay separate from human-approved module improvement.

## Target state grammar

The canonical workflow equation:

```text
Workflow = State + Steps + Roles + Rules + Artifacts + Evidence + Transitions
```

The canonical transition grammar:

```text
Entity:
What object is moving?

State:
Where is it now?

Action:
What happened?

Executor:
Who or what performed the action?

Guard:
What must be true before the action is allowed?

Transition:
What state does it move to?

Event:
What gets recorded?

Outcome:
What did the transition produce?

Next:
What can happen after this?
```

## Transition model

### Example A — selecting the SOW module

```text
Entity:
Work Item

State:
scoped

Action:
select module

Executor:
human_operator

Guard:
Work Item has acceptance criteria

Transition:
module_selected

Event:
module_selected with sow-builder@1.0.0

Outcome:
Colony can be created

Next:
BA / Developer / PM seats execute the module
```

### Example B — requesting changes on a SOW artifact

```text
Entity:
SOW artifact

State:
ready_for_review

Action:
request changes

Executor:
reviewer

Guard:
artifact exists and review is allowed

Transition:
changes_requested

Event:
output_changes_requested
operator.intervened
workflow outcome recorded

Outcome:
current attempt ends as changes_requested

Next:
new attempt or revised artifact
```

### Example C — closing a Colony

```text
Entity:
Colony

State:
reviewing

Action:
close

Executor:
human_operator

Guard:
output readiness is ready, or operator explicitly closes with an incomplete reason

Transition:
closed

Event:
colony_closed
workflow_outcome_recorded

Outcome:
terminal run telemetry exists

Next:
baseline aggregation or module improvement review
```

## Event model

Today, Rook already records:

- Colony audit events such as `colony_closed`, `output_reviewed`, and `output_changes_requested`;
- workflow source events such as operator interventions and governance/tool facts;
- workflow outcome events such as `workflow_outcome_recorded`.

The target direction is not "one event type for everything." It is:

1. each transition should produce an inspectable event;
2. event names should make entity, action, and lifecycle significance clear;
3. future cross-entity reconstruction should be possible without reading chat transcripts.

Candidate future pattern:

```text
<entity>.<action>
```

Examples:

```text
work_item.module_selected
artifact.review_requested
artifact.changes_requested
run_attempt.started
run_attempt.superseded
```

This is a candidate, not a v0.1 migration requirement. Existing event names remain valid until a deliberate event-taxonomy scope lock says otherwise.

## What remains implicit today

| Concern | Current reality | Why it matters |
| --- | --- | --- |
| Work Item progress | inferred from linked Colony behavior | hard to answer "what stage is this work in?" before or after execution |
| Module maturity | conveyed by immutable versioning convention | hard to distinguish draft recipes from released methods |
| Artifact lifecycle | inferred from readiness and review | output status cannot be reasoned about independently |
| Attempt history | overwritten within one Colony run | iterative review loses history |
| Transition guards | distributed in stores and UI | hard to inspect or reuse module-safe rules |
| Cross-entity next step | mostly human interpretation | weakens chaining between modules |

## v0.2 candidates

Ranked by existing pressure:

### Will hurt soon

1. **`runAttemptId`**
   - preserves iterative review history inside one Colony.
2. **Artifact lifecycle decomposition**
   - clarifies why an output is not ready without triangulation.
3. **Work Item lifecycle**
   - gives the user a subject-level answer to "where is this work now?"

### Will hurt eventually

1. **Workflow Module lifecycle**
   - becomes important once draft, validated, released, and deprecated modules coexist.
2. **Declared transition guards**
   - becomes important once modules need consistent, reusable gate logic.
3. **Cross-module next-state semantics**
   - becomes important when workflows naturally chain: Discovery Brief → SOW Builder → Proposal Builder → Delivery Plan.

### Speculative until pressure appears

1. a visual state-machine builder;
2. broad event-taxonomy migration;
3. generalized workflow graph runtime in DAX;
4. module-independent role abstraction.

## Non-goals

This document does **not**:

- change current Colony, Work Item, recipe, or outcomes code;
- rename current lifecycle states;
- introduce a workflow graph runtime;
- require a visual builder;
- promote BA / Developer / PM into reusable global roles;
- implement `runAttemptId`;
- make DAX depend on Rook workflow state.

It only fixes the conceptual map that future slices should build against.

## Reopen criteria

Reopen this model when one of these becomes true:

1. a real SOW Builder run exposes a missing state or invalid transition;
2. `runAttemptId` becomes necessary under repeated review cycles;
3. a second non-coding module exposes the same Work Item or Artifact lifecycle need;
4. users cannot answer "what state is this work in?" from the product surface;
5. DAX trust integration requires a clearer transition or guard boundary.

Until then:

```text
Name the product.
Name the state machine.
Then add the next module.
```
