# SDLC Verification v0.3 Scope Lock

## Purpose

SDLC Verification v0.3 makes verification evidence visible to the user.

It displays `VerificationReport` and `EvidenceReceipt` data produced by explicit verification runs without changing the v0.1 and v0.2 trust boundary.

## Status

Scope lock for the SDLC Verification evidence viewer slice.

## Context

SDLC Verification v0.1 introduced the library-level evidence kernel:

- check detection
- allowlisted command execution
- `VerificationReport`
- `EvidenceReceipt`
- verification posture derivation

SDLC Verification v0.2 exposed that harness through an explicit backend command surface:

- `verify_sdlc_repo`
- repo path input only
- safe path validation
- no arbitrary command input
- no Colony integration
- no UI automation

v0.3 should make the resulting report understandable before any future Colony integration is considered.

## Goal

Display verification evidence returned by an explicit verification run.

The viewer should show:

- verification posture
- check results
- blocking reasons
- evidence receipts
- command metadata already present in the report
- stdout and stderr previews already present in check results

## Expected Flow

```text
User explicitly runs verification
VerificationReport is returned
UI displays posture, checks, blocking reasons, and evidence receipts
```

## Non-Goals

- No automatic Colony verification.
- No Colony artifact attachment.
- No Colony readiness integration.
- No Colony close integration.
- No background execution.
- No scheduled checks.
- No filesystem watchers.
- No file modification.
- No result file writes by default.
- No external writes.
- No GitHub, Jira, Linear, or CI status updates.
- No arbitrary LLM-generated commands.
- No command customization by prompt.
- No baseline suppression or waiver system.
- No policy engine for required verification.

## Execution Boundary

The viewer may call the explicit `verify_sdlc_repo` command only from a user-triggered action.

It must not run verification from page load, navigation, timers, watchers, background effects, or Colony lifecycle events.

Calling the verification action is consent to run the allowlisted local checks detected for the selected repository path.

## Display Boundary

The viewer displays evidence. It does not inflate evidence into proof of correctness.

A passing report means the allowlisted checks ran and produced passing results.

It does not mean the product is correct, complete, secure, or release-ready.

## Expected Implementation Shape

Likely implementation sequence:

1. Add a frontend API wrapper for `verify_sdlc_repo`.
2. Add TypeScript report types matching the existing serialized Rust structs.
3. Add a small evidence viewer surface.
4. Show loading, success, failure, and empty states.
5. Render posture, checks, blocking reasons, and evidence receipts.
6. Add focused UI or component tests.

## UI Boundary

The UI may provide an explicit run action.

The UI must not:

- auto-run verification
- hide failed checks
- collapse readiness, review, and verification into one score
- imply external CI status
- imply human approval
- imply Colony readiness

## Future Work Not Included

Potential later slices:

- attach a `VerificationReport` to a Colony artifact
- display evidence presence in Colony output readiness
- define policy-driven verification requirements
- publish verification status externally with explicit consent
- persist evidence receipts as artifacts

None of those are part of v0.3.
