# SDLC Verification v0.2 Scope Lock

## Purpose

SDLC Verification v0.2 exposes the v0.1 verification harness through an explicit developer-triggered command surface.

The harness remains local, allowlisted, explicit, and non-autonomous.

## Status

Scope lock for the next SDLC Verification slice.

## Context

SDLC Verification v0.1 introduced the library-level evidence kernel:

- check detection
- allowlisted command execution
- `VerificationReport`
- `EvidenceReceipt`
- verification posture derivation

v0.1 deliberately avoided CLI, UI, Colony, scheduler, and background wiring.

v0.2 may add a command surface, but it must not change that trust boundary.

## Goal

Expose `verify_repo` through an explicit command or developer-facing entry point.

The command should:

- accept a repository path
- call `verify_repo`
- return a `VerificationReport`
- preserve the existing allowlisted runner model
- keep `run_check` crate-private
- remain user-triggered

## Non-Goals

- No automatic Colony verification.
- No Colony readiness integration.
- No Colony close integration.
- No UI automation.
- No background execution.
- No scheduled checks.
- No file modification.
- No external writes.
- No GitHub, Jira, Linear, or CI status updates.
- No arbitrary LLM-generated commands.
- No command customization by prompt.
- No baseline suppression or waiver system.

## Execution Boundary

v0.2 must only expose an explicit command surface for the existing harness.

It must not introduce hidden execution paths.

Calling the command is consent to run the allowlisted local checks detected for the target repository.

## Expected Implementation Shape

Likely implementation sequence:

1. Add an explicit command wrapper around `verify_repo`.
2. Accept a repo path.
3. Return or print the structured `VerificationReport`.
4. Add command tests.
5. Keep `run_check` crate-private.
6. Do not wire UI or Colony.

## Output Contract

The command output should preserve the `VerificationReport` shape from v0.1.

Any human-readable formatting must be secondary to the structured report.

## Safety Requirements

The command surface must:

- reject nonexistent repository paths clearly
- avoid modifying the target repository
- avoid writing result files by default
- avoid shell evaluation
- avoid invoking commands outside the allowlist
- avoid running checks unless explicitly invoked

## Future Work Not Included

Potential later slices:

- SDLC v0.3 evidence viewer
- attach verification reports to Colony artifacts
- display evidence presence in Colony readiness
- policy-defined verification requirements
- external status publication with explicit consent

None of those are part of v0.2.
