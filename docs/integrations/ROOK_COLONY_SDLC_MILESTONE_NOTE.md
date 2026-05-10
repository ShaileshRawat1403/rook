# Rook Milestone Note: Colony and SDLC Verification Boundaries

## Status

Published milestone note.

## Context

Rook now has two clean foundations:

1. Colony
2. SDLC Verification

These systems are related, but they do not own the same responsibility.

This note records the boundary so future work does not collapse workflow governance, artifact readiness, and verification execution into one unclear system.

---

## Milestones

### Colony v0.5

Tag:

```text
colony-v0.5
```

Colony became a WorkItem-anchored workcell.

Implemented:

- WorkItem anchor on ColonySession
- Recipe-driven Colony creation
- Repo Review recipe path
- Acceptance criteria converted into Colony tasks
- Recipe specialists converted into seats
- Lifecycle close state
- Closed Colony audit preservation

Boundary:

Colony organizes work. It does not execute verification.

---

### Colony v0.6

Tag:

```text
colony-v0.6
```

Colony gained output contracts and readiness.

Implemented:

- ColonyOutputContract copied from recipe.finalArtifact
- Derived output readiness helper
- Outputs tab readiness display
- Advisory close warning for incomplete contracts

Boundary:

Readiness is advisory. It is not proof of correctness.

---

### Colony v0.7

Tag:

```text
colony-v0.7
```

Colony expanded validated recipes.

Implemented recipes:

- Repo Review
- Release Readiness
- Documentation Audit

Implemented:

- Validated recipe selector
- Contract validation for added recipes
- WorkItem -> Recipe -> Colony path for all exposed recipes

Boundary:

Recipe expansion remains additive. It does not change execution authority.

---

### Colony v0.8

Tag:

```text
colony-v0.8
```

Colony gained output review approval.

Implemented:

- Colony-level outputReview state
- Mark Output Reviewed
- Request Changes
- Review state used in readiness
- Approved handoff retained as secondary compatibility signal
- changes_requested overrides stale handoff approval
- Outputs tab review actions

Boundary:

Review is human-driven and advisory. It is not automatic approval or external validation.

---

### SDLC Verification v0.1

Tag:

```text
sdlc-v0.1
```

Rook gained a library-level verification harness.

Implemented:

- Check detection
- Allowlisted command runner
- VerificationReport
- EvidenceReceipt
- Verification posture derivation

Boundary:

SDLC Verification is explicit only.

It does not run in the background.

It does not run automatically from Colony.

It does not write to external systems.

It does not modify files.

It does not accept arbitrary LLM-generated commands.

---

## System Boundary

### Colony owns workflow governance

Colony answers:

```text
What work are we coordinating?
Which WorkItem is this about?
Which recipe shapes the work?
Which seats are responsible?
Which tasks came from acceptance criteria?
What output is expected?
What artifacts were captured?
Was the output reviewed?
Can the Colony be closed with unresolved readiness?
```

Colony concepts:

```text
WorkItem
Recipe
Seat
Task
Handoff
Artifact
OutputContract
OutputReadiness
OutputReview
AuditEvent
LifecycleStatus
```

Colony does not own command execution.

---

### SDLC Verification owns explicit evidence generation

SDLC Verification answers:

```text
Which checks are available?
Which allowlisted checks ran?
What passed, failed, timed out, or errored?
What evidence receipt proves the result?
What verification posture was derived?
```

SDLC Verification concepts:

```text
CheckDefinition
CheckResult
CheckStatus
EvidenceReceipt
VerificationReport
VerificationPosture
```

SDLC Verification does not own workflow orchestration.

---

## Relationship Between Colony and SDLC Verification

The systems are complementary.

```text
Colony:
Organizes and reviews the work.

SDLC Verification:
Produces evidence from explicit verification runs.
```

Future integration may allow a Colony artifact or output contract to reference an SDLC VerificationReport.

That integration must remain explicit.

No automatic bridge is assumed.

---

## Non-Negotiable Boundaries

### No automatic verification from Colony close

Closing a Colony must not automatically run SDLC checks.

### No background verification

Verification must not run on timers, watchers, or hidden lifecycle events.

### No LLM-generated command execution

The harness must only run allowlisted checks.

### No external writes

Verification v0.1 does not write to GitHub, Jira, CI, Linear, or any external system.

### No proof inflation

A passing verification report proves that checks ran and produced results.

It does not prove the product is correct.

### No governance collapse

Colony readiness, output review, and SDLC verification posture are separate signals.

They may be displayed together later, but they should not be merged into one opaque score.

---

## Future Integration Path

A safe future sequence would be:

### SDLC v0.2: Explicit Command Surface

Expose `verify_repo` through an explicit developer-facing command.

Still no Colony integration.

### SDLC v0.3: Evidence Viewer

Display VerificationReport and EvidenceReceipt in the UI.

Still no automatic execution.

### Colony v0.9 or later: Attach Verification Evidence

Allow users to attach an SDLC VerificationReport to a Colony artifact.

This should be user-triggered.

### Colony + SDLC Future Slice: Readiness With Evidence

Allow output readiness to display whether verification evidence exists.

This remains advisory.

It should not hard-block closing unless a separate policy slice explicitly defines that behavior.

---

## Current Known Baselines

### Colony

Colony feature tests are green as of v0.8.

Known unrelated frontend baseline:

```text
3 src/shared/api/__tests__/agents.test.ts failures
1 src/shared/api/acpNotificationHandler.test.ts failure
```

### SDLC Verification

Verified at `sdlc-v0.1`:

```text
cargo test -p rook --test sdlc_verification: 3/3 passed
cargo test -p rook preview_truncates_on_character_boundaries: passed
cargo check -p rook: passed
```

Known unrelated Rust clippy baseline:

```text
crates/rook/src/agents/agent.rs:1686
crates/rook/src/permission/permission_inspector.rs:165
```

---

## Design Summary

Rook now has a separation of concerns:

```text
Colony = governed workflow cell
SDLC Verification = explicit evidence kernel
```

Colony should not become a command runner.

SDLC Verification should not become a workflow board.

The durable architecture is the connection between them:

```text
Work coordination
-> artifact readiness
-> human review
-> explicit verification evidence
-> audit trail
```

Each layer must remain visible, bounded, and accountable.
