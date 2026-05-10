# Colony v0.8 Scope Lock: Output Review Approval

## Status

Locked for implementation after this document lands.

## Context

Colony v0.5 established WorkItem-anchored recipe creation.

Colony v0.6 established output contracts and readiness:

- Recipe `finalArtifact` becomes the Colony-level output contract.
- Readiness is derived, not persisted.
- Outputs tab surfaces contract completeness.
- Closing an incomplete Colony shows an advisory warning.

Colony v0.7 expanded validated recipe coverage:

- Repo Review
- Release Readiness
- Documentation Audit

v0.8 makes `reviewerRequired` actionable without introducing external validation, automatic approval, or new governance semantics.

---

## I-1. Intent

v0.8 gives users a clear way to mark a Colony output as reviewed.

The goal is to answer:

> If a recipe requires reviewer approval, how does a user satisfy that requirement inside Colony?

This must remain human-driven and advisory.

---

## I-2. Inform

The current readiness helper treats reviewer satisfaction as true when:

```ts
colony.handoffs.some((handoff) => handoff.reviewStatus === "approved")
```

That was a useful v0.6 bridge because handoff review already existed.

But it is not the right long-term model.

A handoff approval means:

```text
This context transfer was reviewed.
```

A Colony output review means:

```text
The final output artifact for this Colony was reviewed.
```

These are related, but not the same.

---

## I-3. Interpret

## Locked Decisions

### Decision 1: Add a Colony-level output review signal

v0.8 uses a new Colony-level review record.

Recommended type:

```ts
export type ColonyOutputReviewStatus = "approved" | "changes_requested";

export type ColonyOutputReview = {
  status: ColonyOutputReviewStatus;
  reviewedAt: string;
  note?: string;
};
```

Add optional field:

```ts
outputReview?: ColonyOutputReview;
```

### Decision 2: Colony-level output review is canonical

For `reviewerRequired`, the canonical readiness signal becomes:

```text
colony.outputReview?.status === "approved"
```

### Decision 3: Existing handoff approval remains valid but secondary

For v0.8 compatibility, existing approved handoffs may still satisfy reviewer readiness.

The readiness helper should treat reviewer approval as satisfied when either condition is true:

```text
Colony-level output review is approved
OR
at least one handoff review is approved
```

This prevents breaking existing v0.6/v0.7 flows while making the new Colony-level path the intended product model.

### Decision 4: Review remains advisory

Output review does not prove correctness.

It only records that a human marked the visible output as reviewed.

No automatic approval.

No LLM approval.

No external system approval.

### Decision 5: Closed Colonies preserve review state

A closed Colony should preserve its output review record.

Do not allow casual mutation of output review after close.

v0.8 does not add reopen, archive, or post-close edit flows.

### Decision 6: No reviewer identity model in v0.8

Do not add user identity, reviewer assignment, role-based permissions, or access control.

A future version may add:

```text
reviewedBy
reviewerSeatId
reviewerUserId
approval policy
```

v0.8 only records status, timestamp, and optional note.

---

## I-4. Initiate

## Scope

v0.8 includes:

```text
1. Add Colony-level output review type and optional session field.
2. Add store action to mark output reviewed.
3. Add store action to request output changes.
4. Update readiness helper to check Colony-level output review.
5. Preserve existing handoff approval as secondary compatibility signal.
6. Surface review requirement and review action in the Outputs tab.
7. Keep review advisory.
```

---

## Data Model

Add to Colony types:

```ts
export type ColonyOutputReviewStatus = "approved" | "changes_requested";

export type ColonyOutputReview = {
  status: ColonyOutputReviewStatus;
  reviewedAt: string;
  note?: string;
};
```

Add to `ColonySession`:

```ts
outputReview?: ColonyOutputReview;
```

---

## Store Actions

Add:

```ts
markOutputReviewed(colonyId: string, note?: string): void;
requestOutputChanges(colonyId: string, note?: string): void;
```

Behavior:

### `markOutputReviewed`

```text
- no-op or throw if Colony is closed
- set outputReview.status = "approved"
- set reviewedAt
- set optional note
- append output_reviewed audit event
- persist state
```

### `requestOutputChanges`

```text
- no-op or throw if Colony is closed
- set outputReview.status = "changes_requested"
- set reviewedAt
- set optional note
- append output_changes_requested audit event
- persist state
```

Add event types:

```ts
"output_reviewed"
"output_changes_requested"
```

---

## Readiness Behavior

Update `getColonyOutputReadiness(...)`.

For `reviewerRequired === true`:

```text
reviewerSatisfied = true when:
- colony.outputReview?.status === "approved"
OR
- colony.handoffs.some(handoff => handoff.reviewStatus === "approved")
```

For `reviewerRequired === false`:

```text
reviewerSatisfied = true
```

If `outputReview.status === "changes_requested"`:

```text
reviewerSatisfied = false
```

Do not change status semantics.

A Colony is still `ready` only when:

```text
contract exists
all tasks are done
required artifact exists
required sections are present
evidence is satisfied
reviewer is satisfied
```

---

## Outputs Tab Behavior

In the existing output readiness panel, surface reviewer requirement clearly.

When `reviewerRequired === true` and not approved, show:

```text
Reviewer approval required.
```

Show actions:

```text
Mark Output Reviewed
Request Changes
```

When approved, show:

```text
Output reviewed.
```

When changes are requested, show:

```text
Changes requested.
```

Keep the language careful.

Do not say:

```text
Approved as correct
```

Use:

```text
Marked reviewed
```

---

## Review Notes

v0.8 may use a simple optional note.

Acceptable UI:

```text
native prompt
small inline text input
no note at all for first slice
```

Preferred first implementation:

```text
No note UI unless low-friction.
```

The data model supports notes, but the MVP can mark reviewed without requiring one.

---

## Closed Colony Behavior

Closed Colonies should not allow review changes.

If the Colony is closed:

```text
Hide or disable Mark Output Reviewed
Hide or disable Request Changes
Show preserved review status
```

No reopen flow in v0.8.

---

## Explicit Non-Goals

v0.8 does not include:

```text
new recipes
PRD Builder
SEO Strategy
AI Adoption Colony
reviewer assignment
reviewer identity
RBAC
approval policy engine
external approvals
GitHub PR review sync
Jira status sync
CI checks
automatic reviewer approval
LLM-based review approval
semantic artifact validation
reopen flow
archive flow
post-close review edits
Safe Lane changes
Sentinel changes
new governance taxonomy
```

---

## I-5. Inspect

## Acceptance Criteria

v0.8 is complete when:

1. `ColonyOutputReview` type exists.
2. `ColonySession.outputReview?` exists and is legacy-safe.
3. `markOutputReviewed(...)` records approved review state.
4. `requestOutputChanges(...)` records changes-requested state.
5. Both actions persist state.
6. Both actions append audit events.
7. Closed Colonies cannot change output review.
8. Readiness helper treats `outputReview.status === "approved"` as reviewer satisfied.
9. Readiness helper preserves existing approved handoff compatibility.
10. `changes_requested` does not satisfy reviewer readiness.
11. Outputs tab shows reviewer requirement.
12. Outputs tab exposes Mark Output Reviewed.
13. Outputs tab exposes Request Changes.
14. Approved review updates readiness to ready when all other requirements are satisfied.
15. Changes requested keeps readiness below ready.
16. No automatic approval is introduced.
17. No external checks are introduced.
18. Colony tests pass.
19. Typecheck remains clean.
20. Existing unrelated test failures remain untouched and documented.

---

## Implementation Order

### Step 1: Scope lock

```text
docs(colony): lock v0.8 output review scope
```

Adds this document.

### Step 2: Store and type model

```text
feat(colony): add output review state
```

Adds:

```text
ColonyOutputReview type
ColonySession.outputReview?
markOutputReviewed
requestOutputChanges
audit events
store tests
```

### Step 3: Readiness integration

```text
feat(colony): use output review in readiness
```

Updates:

```text
getColonyOutputReadiness
readiness tests
compatibility test for approved handoff
changes_requested test
```

### Step 4: Outputs tab actions

```text
feat(colony): surface output review actions
```

Adds:

```text
Mark Output Reviewed
Request Changes
review state display
closed Colony disabled state
UI tests
```

---

## Locked Design Summary

v0.8 makes reviewer-required output contracts actionable by adding a Colony-level output review record.

The final output review is now conceptually separate from handoff review.

Handoff approval remains a compatibility signal, but Colony-level output review is the canonical path.

Review remains human-driven and advisory.

No external authority, automatic validation, or new governance system is introduced.
