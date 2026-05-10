# SDLC Verification v0.1 Scope Lock

## Purpose

SDLC Verification v0.1 introduces a local, explicit verification harness for Rook. It detects known repository checks, runs only allowlisted commands when invoked, and returns structured evidence for the run.

This is a trust-boundary feature. It may execute local commands, so v0.1 is intentionally narrow.

## Goals

- Detect known local checks from repository structure.
- Run checks only when explicitly invoked by Rook code.
- Produce a `VerificationReport`.
- Produce an `EvidenceReceipt` for each check result.
- Keep commands fixed and allowlisted by detection logic.
- Capture command status, exit code, duration, and bounded output previews.

## Non-Goals

- No background verification.
- No automatic execution from Colony readiness, output review, or close.
- No GitHub, Jira, CI, or external status writes.
- No automatic repair.
- No command generation or command editing by an LLM.
- No arbitrary user-provided command execution.
- No Colony gating or automatic approval.
- No security or secrets scanning beyond fixed, declared checks.

## Execution Policy

Verification is explicit only. v0.1 exposes library functionality, but does not wire it into the CLI, UI, Colony, scheduler, or any background process.

All executable checks must come from built-in detection. The runner must reject any check whose command and arguments do not match the v0.1 allowlist.

## Expected Checks

- Rust workspace format check when `Cargo.toml` is present.
- Rust clippy check when `Cargo.toml` is present.
- Rust test check when `Cargo.toml` is present.
- UI test check when a known UI package manifest is present.

Known failing project baselines are reported as evidence. Baseline suppression and policy-aware waivers are out of scope for v0.1.

## Evidence Boundaries

Evidence receipts should include enough local proof to audit what was run:

- schema version
- receipt ID
- run ID
- check ID
- claim
- status
- command
- cwd
- duration
- digest

Receipts do not write to external systems in v0.1.
