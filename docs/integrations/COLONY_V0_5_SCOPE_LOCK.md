# Colony v0.5 Scope Lock

This document locks the scope decisions for Colony v0.5. It supersedes any earlier informal scoping. Code that lands on this branch must conform to these eight answers; any change to them requires a new scope-lock revision, not an opportunistic edit.

The slice's single trust boundary is: **recipes drive Colony creation, anchored on a Work Item.** Everything else defers.

## F1–F8 — Locked Decisions

**F1.** `ColonyTask` links to `WorkItem` as an execution view derived from WorkItem acceptance criteria.

**F2.** Colony adopts existing Safe Lanes / `ExecutionPosture`. No new governance taxonomy in v0.5.

**F3.** Sentinel is a policy evaluation service, not a Colony seat.

**F4.** v0.5 crosses one trust boundary: recipe-driven Colony creation anchored on `WorkItem`.

**F5.** All external-system behavior remains staging-only. No auto execution, polling, writes, or validation.

**F6.** v0.5 lands in `ui/rook` (Tauri) deliberately. Electron parity is deferred.

**F7.** Colony lifecycle is `draft → active → blocked → reviewing → closed → archived`.

**F8.** Canonical vocabulary: WorkItem, Colony, Seat, Task, Recipe, Handoff, Artifact, Safe Lane, Sentinel, Audit Event.

## Build Sequence

1. Scope-lock doc (this file).
2. Add `workItemId` to `ColonySession`.
3. Add migration / default behavior for existing persisted Colonies.
4. Add tests proving WorkItem anchoring.
5. Add recipe-picker entry point.
6. Wire only Repo Review as smoke test.

Steps 5 and 6 do not begin until step 4 is green.

## Out of Scope (v0.5)

- New governance modes or labels beyond Safe Lanes.
- Sentinel-as-seat in any role template.
- AI Adoption Colony, Live Incident Response Colony, Compliance Review Colony, Client Proposal Colony.
- Auto-validation of release readiness against CI/Jira/GitHub.
- Electron parity.
- Re-architecting the Seat ↔ ACP-session binding surface.
- Hard-validating output contracts against captured artifacts.

## Companion Documents

- [COLONY_ADOPTION_BRIDGE_PLAN.md](./COLONY_ADOPTION_BRIDGE_PLAN.md) — v0.5 "Create Colony from Project" flow; reconcile the recipe-picker entry point against the existing draft.
- [COLONY_V1.md](./COLONY_V1.md) — earlier v1 scope; superseded for the v0.5 slice by this document.
