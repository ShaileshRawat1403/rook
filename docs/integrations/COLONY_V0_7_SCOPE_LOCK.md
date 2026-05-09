# Colony v0.7 Scope Lock: Additional Recipes

## Status

Locked for implementation after this document lands.

## Context

Colony v0.5 established WorkItem-anchored recipe creation.

Colony v0.6 established output contracts and readiness:

- Recipe `finalArtifact` becomes the Colony-level output contract.
- Readiness is derived, not persisted.
- Outputs tab surfaces the contract and readiness state.
- Closing an incomplete Colony shows an advisory warning, not a hard block.

Colony v0.7 expands recipe coverage, but only after validating that the new recipes fit the v0.6 contract and readiness model.

---

## I-1. Intent

v0.7 adds two additional recipe-backed Colony flows:

1. Release Readiness Colony
2. Docs Audit Colony

The goal is to prove that Colony can support more than Repo Review while preserving the same architecture:

```text
WorkItem
  → Recipe
  → Seats
  → AC-derived tasks
  → Output contract
  → Artifacts
  → Readiness
  → Close warning
```

v0.7 does not introduce a new workflow engine, new governance system, or new output validation model.

---

## I-2. Inform

The existing v0.6 readiness model was first validated through Repo Review.

Repo Review primarily exercises the `report` artifact path.

Release Readiness and Docs Audit may use different `finalArtifact.artifactType` values, such as:

```text
checklist
audit
report
doc-like outputs
```

Before exposing these recipes in the UI, v0.7 must validate that their `finalArtifact` values map cleanly into:

```text
ColonyOutputContract
getColonyOutputReadiness(...)
ColonyOutputReadinessPanel
Close warning behavior
```

---

## I-3. Interpret

## Locked Decisions

### Decision 1: v0.7 is additive only

v0.7 does not change the v0.5/v0.6 architecture.

It only adds validated recipes to the existing path.

### Decision 2: Release Readiness and Docs Audit are the only new recipes

v0.7 exposes only:

```text
RELEASE_READINESS_RECIPE
DOCS_AUDIT_RECIPE
```

Do not expose:

```text
PRD Builder
SEO Strategy
AI Adoption
Incident Response
Client Proposal
Compliance Review
```

### Decision 3: Output contract validation comes before UI exposure

Each recipe must pass a contract validation test before it appears in the UI.

Validation means:

```text
recipe.finalArtifact can be copied into ColonyOutputContract
artifactType is supported by readiness mapping
requiredSections render correctly
evidenceRequired behaves as advisory readiness
reviewerRequired behaves through existing review signal
```

### Decision 4: No new artifact model in v0.7

Do not add new artifact kinds unless a recipe cannot be represented by the current model.

If a recipe needs better artifact matching, extend the readiness artifact-type mapping first.

### Decision 5: No new completion semantics

Readiness remains soft-advisory.

No hard block.

No automatic validation.

No automatic artifact generation.

No external-system checks.

### Decision 6: WorkItem acceptance criteria remain task truth

For all v0.7 recipes:

```text
WorkItem acceptance criteria → Colony tasks
recipe.finalArtifact → Colony output contract
artifacts → evidence of completion
```

Recipes do not replace WorkItem acceptance criteria.

---

## I-4. Initiate

## Scope

v0.7 includes:

```text
1. Validate Release Readiness recipe output contract.
2. Validate Docs Audit recipe output contract.
3. Extend recipe entry UI to show the two new validated recipes.
4. Keep Repo Review available.
5. Ensure each selected recipe creates a WorkItem-anchored Colony.
6. Ensure Outputs tab renders the correct contract for each recipe.
7. Ensure readiness helper handles each recipe's artifact type.
8. Ensure close warning still works for incomplete output contracts.
```

---

## Recipe Exposure Model

The UI should expose a small validated recipe list.

Recommended label:

```text
Create Colony from Work Item
```

Recipe options:

```text
Repo Review
Release Readiness
Docs Audit
```

Do not call this a generic marketplace, wizard, or agent selector.

Recommended copy:

```text
Choose the workflow shape for this Work Item.
Rook will create role seats, tasks from acceptance criteria, and an output contract.
```

---

## Validation Requirements

Before UI exposure, add tests that verify each recipe can become a Colony output contract.

For each recipe:

```text
RELEASE_READINESS_RECIPE
DOCS_AUDIT_RECIPE
```

Validate:

```text
recipe.id is stable
recipe.version is present
recipe.finalArtifact.artifactType maps into ColonyOutputContract
recipe.finalArtifact.format maps into ColonyOutputContract
recipe.finalArtifact.requiredSections is non-empty
recipe.finalArtifact.evidenceRequired is copied
recipe.finalArtifact.reviewerRequired is copied
```

---

## Readiness Mapping Requirements

The existing readiness helper must support the artifact types used by the new recipes.

If Release Readiness uses `checklist`, the helper must map it to compatible Colony artifact kinds.

Recommended mapping:

```text
checklist → review | doc | note
```

If Docs Audit uses `audit`, the helper must map it to compatible Colony artifact kinds.

Recommended mapping:

```text
audit → review | repo_summary | doc
```

If a recipe uses `report`, the existing mapping remains valid:

```text
report → repo_summary | review | doc | note
```

Do not introduce semantic or LLM-based validation.

Section matching remains simple and case-insensitive.

---

## UI Requirements

The existing recipe entry point should evolve from a hardcoded Repo Review entry to a small validated recipe selector.

Required behavior:

```text
No WorkItem:
  Show the existing WorkItem-required empty state.

WorkItem present:
  Show the validated recipe options.
  Show selected recipe preview.
  Show work item title/key.
  Show seat count.
  Show acceptance criteria count.
  Show expected output artifact type.
  Show required section count.
  Create Colony button creates the selected recipe-backed Colony.
```

The preview should stay lightweight.

No multi-step wizard.

No advanced configuration.

---

## Explicit Non-Goals

v0.7 does not include:

```text
PRD Builder recipe
SEO Strategy recipe
AI Adoption Colony
Incident Response Colony
Client Proposal Colony
Compliance Review Colony
new governance modes
Safe Lane changes
Sentinel changes
specialist output contract surfacing
automatic handoff creation
automatic artifact creation
automatic artifact validation
external system reads
external system writes
CI/Jira/GitHub polling
multi-Colony redesign
reopen flow
archive flow
```

---

## I-5. Inspect

## Acceptance Criteria

v0.7 is complete when:

1. Release Readiness recipe passes output-contract validation.
2. Docs Audit recipe passes output-contract validation.
3. Readiness helper supports the artifact types used by both recipes.
4. Recipe entry UI exposes exactly three recipes: Repo Review, Release Readiness, Docs Audit.
5. No other recipes are exposed.
6. Each recipe creates a WorkItem-anchored Colony.
7. Each created Colony stores `recipeId`, `recipeVersion`, and `outputContract`.
8. WorkItem acceptance criteria still become Colony tasks.
9. Recipe specialists still become Colony seats.
10. Outputs tab renders the correct output contract for each recipe.
11. Required sections render for each recipe.
12. Close warning still appears for incomplete readiness.
13. No automatic handoffs, artifacts, sessions, or external checks are introduced.
14. Colony tests pass.
15. Typecheck remains clean.
16. Existing unrelated test failures remain untouched and documented.

---

## Implementation Order

### Step 1: Scope lock

```text
docs(colony): lock v0.7 recipe expansion scope
```

Adds this document.

### Step 2: Recipe contract validation

```text
test(colony): validate additional recipe output contracts
```

Adds tests for Release Readiness and Docs Audit recipe contracts.

No UI changes yet.

### Step 3: Readiness mapping support

```text
feat(colony): support readiness mapping for additional recipes
```

Only if validation reveals gaps in `artifactType` mapping.

If no readiness mapping changes are needed, skip this commit.

### Step 4: Recipe selector UI

```text
feat(colony): expose validated recipe choices
```

Replaces the hardcoded Repo Review entry point with a three-option validated selector.

### Step 5: Integration tests

```text
test(colony): cover release and docs recipe creation
```

Tests WorkItem → selected recipe → Colony creation for the two new recipes.

---

## Locked Design Summary

v0.7 expands Colony recipes without expanding Colony authority.

Release Readiness and Docs Audit become first-class recipe options only after their output contracts pass through the v0.6 model.

The WorkItem remains the source of task truth.

The recipe remains the workflow shape.

The output contract remains the definition of expected deliverable shape.

Readiness remains advisory.

No autonomous execution is introduced.
