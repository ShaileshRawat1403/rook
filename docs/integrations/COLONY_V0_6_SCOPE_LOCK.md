# Colony v0.6 Scope Lock: Output Contracts

## Status

Locked for implementation.

## Context

Colony v0.5 established the first governed workcell boundary:

- Colony anchors on a WorkItem.
- Repo Review recipe can create a Colony.
- WorkItem acceptance criteria become Colony tasks.
- Recipe specialists become seats.
- Handoffs remain staged and manual.
- Artifacts remain user-created or user-approved.
- Closing a Colony preserves audit history.

Colony v0.6 defines what "done" means for a recipe-driven Colony.

This slice does not add new recipes, new governance modes, autonomous validation, automatic artifact creation, or external-system writes.

---

## I-1. Intent

Colony v0.6 introduces a visible output contract for recipe-driven Colonies.

The goal is to answer:

> What should this Colony produce, and how does the user know whether the output is complete enough to review?

The output contract must make Colony feel like an organizational workflow, not a generic task board.

---

## I-2. Inform

Recipes already contain two contract layers:

1. `recipe.finalArtifact`
   - Colony-level deliverable.
   - Defines the final output expected from the workflow.

2. `specialist.outputContract`
   - Seat-level contribution contract.
   - Defines what each specialist should produce or preserve when working.

v0.6 must decide how these are represented in Colony.

---

## I-3. Interpret

### Decision 1: Colony has one canonical completion contract

The Colony-level output contract is derived from:

```ts
recipe.finalArtifact
```

This is the canonical "done" contract for the Colony.

It answers:

```text
What final artifact should this Colony produce?
What format should it use?
Which sections are required?
Is evidence required?
Is reviewer approval required?
```

### Decision 2: Specialist output contracts are contribution guidance

`specialist.outputContract` is not the Colony completion contract.

It remains role-level guidance.

It may later be surfaced per seat or per task, but v0.6 does not need to make it part of the main completion model.

### Decision 3: WorkItem acceptance criteria remain task truth

WorkItem acceptance criteria still define the work to be completed.

The Colony output contract does not replace AC.

The relationship is:

```text
WorkItem acceptance criteria define the task checklist.
Recipe finalArtifact defines the final deliverable shape.
Artifacts provide evidence that the work was completed.
```

### Decision 4: Done is a soft readiness signal, not a hard gate

v0.6 does not block users from closing a Colony.

Instead, it shows readiness indicators:

```text
Tasks complete
Required artifact present
Required sections present
Evidence present if required
Reviewer approval present if required
```

The system may warn, but it must not hard-block closure.

Reason:

Colony is still staging and governance infrastructure. It should guide user judgment, not pretend to automatically certify work.

---

## I-4. Initiate

## Scope

v0.6 implements output contract modeling and surfacing for existing recipe-driven Colonies.

Initial recipe target:

```text
Repo Review only
```

No additional recipes are exposed in this slice.

---

## Contract Model

Add a Colony-level output contract type.

Recommended type:

```ts
export type ColonyOutputContract = {
  source: "recipe";
  recipeId: string;
  recipeVersion: string;
  artifactType: "report" | "prd" | "strategy" | "checklist" | "audit";
  format: "markdown" | "json" | "checklist";
  requiredSections: string[];
  evidenceRequired: boolean;
  reviewerRequired: boolean;
};
```

Add optional field to `ColonySession`:

```ts
outputContract?: ColonyOutputContract;
```

When `createColonyFromRecipe(...)` creates a Colony, it copies:

```ts
recipe.finalArtifact
```

into:

```ts
colony.outputContract
```

with `source`, `recipeId`, and `recipeVersion`.

Legacy Colonies remain valid without `outputContract`.

---

## Outputs Tab Behavior

The Outputs tab should surface the Colony output contract as a visible checklist.

Recommended UI section:

```text
Output Contract
```

Fields to show:

```text
Artifact type
Format
Required sections
Evidence required
Reviewer required
```

For each required section, show a simple completion signal:

```text
Missing
Present
```

v0.6 may use text matching against artifact content for a basic soft signal.

Example:

```text
Required Sections
- Summary: Present
- Scope: Present
- Risks: Missing
- Recommended next steps: Present
```

This should be advisory only.

---

## Artifact Readiness

Add a lightweight readiness helper.

Recommended derived model:

```ts
export type ColonyOutputReadiness = {
  hasOutputContract: boolean;
  requiredArtifactPresent: boolean;
  requiredSections: {
    section: string;
    present: boolean;
  }[];
  evidenceSatisfied: boolean;
  reviewerSatisfied: boolean;
  taskCompletion: {
    total: number;
    done: number;
  };
  status: "not_ready" | "partially_ready" | "ready";
};
```

This should be derived, not persisted.

The readiness status should be computed from:

```text
Colony tasks
Colony artifacts
Colony outputContract
Artifact content
Review metadata if available
```

---

## Done Semantics

A Colony is considered `ready` when:

```text
All tasks are done.
A matching artifact exists.
All required sections are present.
Evidence is present if required.
Reviewer approval exists if required.
```

A Colony is considered `partially_ready` when:

```text
Some tasks or required sections are incomplete,
but at least one artifact exists.
```

A Colony is considered `not_ready` when:

```text
No meaningful output artifact exists,
or no required output contract exists.
```

These states are advisory.

They do not replace human review.

---

## Close Behavior

When a user closes a Colony with incomplete readiness, show a warning.

Recommended copy:

```text
This Colony does not fully satisfy its output contract.

You can still close it, but the audit trail will record that it was closed with unresolved output items.
```

For v0.6, this can be UI-only.

Do not implement a hard block.

Do not implement automatic artifact generation.

Do not implement automatic review.

---

## Explicit Non-Goals

v0.6 does not include:

```text
Additional recipes
Release Readiness recipe
Docs Audit recipe
PRD Builder recipe
SEO Strategy recipe
Automatic artifact creation
Automatic section generation
Automatic reviewer approval
External system validation
CI, Jira, GitHub, or Linear status checks
Hard blocking Colony close
New governance taxonomy
Sentinel changes
Safe Lane changes
Multi-Colony redesign
```

---

## I-5. Inspect

## Acceptance Criteria

v0.6 is complete when:

1. `ColonySession` can store an optional Colony-level output contract.
2. `createColonyFromRecipe(...)` stores `recipe.finalArtifact` as the Colony output contract.
3. Legacy Colonies without output contracts still load.
4. The Outputs tab displays the output contract.
5. The Outputs tab displays required sections.
6. The Outputs tab can show whether required sections appear in attached artifact content.
7. The Outputs tab shows a soft readiness status.
8. Readiness reconciles task completion and artifact completion.
9. Closing a Colony with incomplete readiness shows a warning, not a hard block.
10. No new recipes are exposed.
11. No automatic artifacts are created.
12. No external validation or writes are introduced.
13. Colony tests pass.
14. Typecheck remains clean.
15. Existing unrelated test failures remain untouched and documented.

---

## Implementation Order

1. Add `ColonyOutputContract` type.
2. Add optional `outputContract` to `ColonySession`.
3. Update `createColonyFromRecipe(...)` to copy `recipe.finalArtifact`.
4. Add store tests for output contract persistence.
5. Add readiness helper as a pure function.
6. Add readiness helper tests.
7. Surface output contract in `ColonyArtifactPanel` or a small child component.
8. Add minimal UI test.
9. Add close-warning behavior if low-friction.
10. Run typecheck and tests.

---

## Commit Plan

### Commit 1

```text
docs(colony): lock v0.6 output contract scope
```

Adds this document.

### Commit 2

```text
feat(colony): persist recipe output contract
```

Adds the type, session field, recipe-copy behavior, and tests.

### Commit 3

```text
feat(colony): surface output readiness in artifacts
```

Adds readiness helper and Outputs tab display.

### Optional Commit 4

```text
feat(colony): warn when closing incomplete output contract
```

Adds close warning only if it stays small.

---

## Locked Design Summary

Colony v0.6 defines "done" as a soft, visible readiness model.

The WorkItem remains the source of task truth.

The recipe final artifact becomes the Colony completion contract.

Specialist output contracts remain role-level guidance.

The Outputs tab becomes the place where users see what the Colony is expected to produce and whether the captured artifact satisfies that shape.

No new execution authority is introduced.
