# Rook + DAX Project Manifesto

## Purpose

This manifesto gives future agents, contributors, and maintainers a stable understanding of the relationship between Rook and DAX.

It exists to prevent context drift.

Any future agent working on either repository should read this before making architectural, product, UX, governance, or integration changes.

## The Core Thesis

Rook and DAX are companion execution systems.

They are not the same product.
They should not be merged.
They should not secretly depend on each other.
They should be able to benefit from each other through explicit, reversible integration seams.

The guiding model is simple:

```text
Rook coordinates the colony.
DAX governs the run.
The user remains the operator.
```

## Product Roles

### Rook

Rook is the adaptive agent workstation.

Rook owns:

```text
UI
TUI
desktop shell
agent picker
provider setup
agent setup
colony UX
sentinel UX
non-dev friendly execution surface
visual coordination of agent work
```

Rook is the place where work feels visible, approachable, and interactive.

Rook should make AI-assisted work understandable to people who do not think like developers, while still remaining useful to technical operators.

### DAX

DAX is the governed execution authority.

DAX owns:

```text
RAO
runtime governance
approval semantics
policy decisions
evidence receipts
audit posture
trust model
execution lifecycle
replayable execution records
```

DAX is the place where work becomes accountable.

DAX should decide whether actions are allowed, blocked, require approval, need evidence, or should be modified.

## The Bird Identity of Rook

Rook is named after the bird.

The identity is not cosmetic. It should shape product behavior.

### Sophisticated tool-user

Rooks select and improvise tools for the task.

In product terms:

```text
Rook should explain tool choice.
Rook should surface alternatives.
Rook should make tool use visible.
```

### Coordinated colony

Rooks operate as a coordinated colony.

In product terms:

```text
Rook can host multiple agents.
Rook can show roles.
Rook can coordinate different execution seats.
Rook can let DAX join as a governance seat.
```

### Sentinel behavior

Rooks watch while others work.

In product terms:

```text
Rook should show what is being watched.
Rook should surface risk.
Rook should route risky actions through approvals.
Rook can use DAX as Sentinel.
```

### Non-predatory wisdom

Rooks forage and uncover what is hidden.

In product terms:

```text
Rook should inspect, discover, and explain.
Rook should help users understand folders, repos, docs, tasks, risks, and hidden context.
```

### Collective power

The power is in the collective.

In product terms:

```text
Rook should not be one monolithic agent.
Rook should become a workstation where agents, models, tools, policies, and humans cooperate.
```

## The DAX Identity

DAX is not the colony.

DAX is the governed execution system.

It should remain disciplined, auditable, and precise.

DAX should not become overly playful or metaphor-heavy. Its language can be clear and humane, but its role is trust, proof, and control.

DAX exists to answer:

```text
Was this work allowed?
Was it reviewed?
Was it verified?
Can it be trusted?
What evidence supports it?
Who approved it?
What changed?
```

## Relationship Model

Rook and DAX can meet in two primary modes.

## Mode 1: DAX Agent

```text
DAX Agent
Run the session through DAX.
```

In this mode, DAX owns the run lifecycle.

Rook provides the UI surface.
DAX provides the governed execution engine.

Expected flow:

```text
User prompt in Rook
↓
Rook sends the session to DAX through ACP
↓
DAX creates a governed run
↓
DAX emits plan, approval, execution, evidence, and trust updates
↓
Rook renders the session
```

Use DAX Agent for:

```text
release readiness
repo audits
risky edits
policy-sensitive automation
documentation cleanup
security-sensitive tasks
work requiring evidence
```

## Mode 2: DAX Sentinel

```text
DAX Sentinel
Use DAX only for governance and approvals.
```

In this mode, another agent can do the work, but DAX evaluates proposed actions.

Expected flow:

```text
User prompt in Rook
↓
Selected agent proposes action
↓
Rook maps the permission request to ProposedAction
↓
DAX evaluates it through governance policy
↓
DAX returns GovernanceDecision
↓
Rook maps the decision back to ACP permission response
↓
Agent continues, blocks, or falls back safely
```

Use DAX Sentinel for:

```text
Claude with DAX governance
Codex with DAX governance
Rook native agent with DAX governance
multi-agent sessions
non-dev safe execution
approval-aware automation
```

## Current Integration Status

The integration has been implemented in phases.

### Phase 1: Design document

Rook contains a DAX Agent and Sentinel design document.

The document records:

```text
DAX Agent mode
DAX Sentinel mode
shared boundary types
risks
open questions
prototype phases
```

### Phase 2: DAX Agent provider registration

Rook now recognizes DAX Agent as an agent provider.

Primary Rook registration lives in the TypeScript provider catalog.

The Tauri agent setup mirror also recognizes DAX.

DAX appears in the Rook Providers UI as:

```text
DAX Agent
Governed execution agent with planning, approvals, evidence, and trust posture.
```

### Phase 3: DAX ACP shim

DAX ships a `dax-acp` executable.

The shim delegates to:

```bash
dax acp "$@"
```

This lets Rook register DAX through a single binary name instead of needing argument-aware provider launching.

### Phase 4: DAX governance evaluation command

DAX exposes a stateless evaluator:

```bash
dax governance evaluate
```

It reads a `ProposedAction` JSON object from stdin or a file and returns a `GovernanceDecision` JSON object.

Important manual usage note:

```bash
# Works
echo '{...}' | dax governance evaluate

# Also works
dax governance evaluate --json /path/to/action.json
```

Manual heredoc behavior may differ in the compiled binary. Rook should use the closed-stdin pipe pattern.

### Phase 5: Rook optional DAX Sentinel wiring

Rook can route ACP permission requests through DAX Sentinel when enabled.

Default mode is off.

```bash
ROOK_SENTINEL=dax
```

When unset or set to anything else, Rook preserves the legacy behavior.

The first Sentinel implementation is intentionally fail-open so agents do not hang if DAX is unavailable, malformed, or returns an unexpected result.

## Boundary Objects

Boundary objects must remain versioned.

Current version:

```text
schemaVersion: "0.1.0"
```

### ProposedAction

Created by Rook and sent to DAX.

```ts
type ProposedAction = {
  schemaVersion: "0.1.0"
  id: string
  runId: string
  source: "rook"
  sourceAgent: string
  tool: string
  target?: string
  command?: string
  reason?: string
  diffPreview?: string
  riskHint?: "low" | "medium" | "high" | "critical"
}
```

### GovernanceDecision

Created by DAX and returned to Rook.

```ts
type GovernanceDecision = {
  schemaVersion: "0.1.0"
  actionId: string
  source: "dax"
  decision:
    | "allow"
    | "deny"
    | "modify"
    | "needs_approval"
    | "persist_rule"
  risk: "low" | "medium" | "high" | "critical"
  reason: string
  requiredEvidence?: string[]
  modifiedAction?: ProposedAction
  reversible: boolean
}
```

### EvidenceReceipt

Future object for verified claims.

```ts
type EvidenceReceipt = {
  schemaVersion: "0.1.0"
  receiptId: string
  runId: string
  claim: string
  proof: string
  source: string
  verifiedAt: string
}
```

### RunReport

Future object for cross-system summaries.

```ts
type RunReport = {
  schemaVersion: "0.1.0"
  runId: string
  source: "rook" | "dax"
  mode: "agent" | "sentinel" | "native"
  intent: string
  actions: ProposedAction[]
  decisions: GovernanceDecision[]
  evidence: EvidenceReceipt[]
  artifacts: string[]
  summary: string
  trustPosture?: "open" | "guarded" | "blocked" | "verified" | "failed"
}
```

## Decision Mapping

DAX policy decisions map to ACP permission responses as follows.

```text
DAX allow
→ first allow_once / allow_always option

DAX deny
→ first reject_once / reject_always option
→ otherwise cancelled

DAX needs_approval
→ legacy auto-pick for now
→ UI approval comes later

DAX modify
→ treated as needs_approval
→ never auto-applied in this phase

DAX persist_rule
→ treated as needs_approval
→ rules are not persisted yet
```

## Failure Policy

The current Sentinel implementation is fail-open.

This is intentional for early integration.

Fail-open means:

```text
If DAX is unavailable, malformed, slow, or errors, Rook does not hang the agent.
Rook falls back to legacy behavior.
```

This is safer during development because a broken Sentinel should not break all agent execution.

Later phases may introduce stricter modes:

```text
Open mode: fail-open
Guarded mode: manual approval fallback
Locked mode: fail-closed
```

Do not change failure behavior without making it explicit in UI and docs.

## Smoke Test Gates

Before merging changes that affect Rook permission handling, run both gates.

### Gate 1: default-off legacy preservation

```bash
cd /Users/Shailesh/MYAIAGENTS/rook/ui/rook
unset ROOK_SENTINEL
pnpm tauri dev
```

Trigger a permission-producing action.

Expected:

```text
same behavior as main
no hang
no crash
no DAX dependency
```

### Gate 2: DAX Sentinel path

```bash
cd /Users/Shailesh/MYAIAGENTS/rook/ui/rook
ROOK_SENTINEL=dax pnpm tauri dev
```

Trigger a permission-producing action.

Expected:

```text
permission resolves
no hang
no crash
clean DAX decision if possible
safe fail-open if DAX path fails
```

Cleanest merge signal:

```text
No fail-open warning + permission resolves.
```

Acceptable early signal:

```text
Fail-open warning + permission resolves.
```

This validates safety, but not full governance.

## Development Startup Note

Rook Desktop must spawn the real Rook CLI for `rook serve`.

If Rook Desktop logs a path like:

```text
ui/rook/src-tauri/target/debug/rook
```

then it is likely spawning the Tauri app binary, not the root CLI binary.

Use `ROOK_BIN` during local development:

```bash
cd /Users/Shailesh/MYAIAGENTS/rook
cargo build -p rook-cli

cd /Users/Shailesh/MYAIAGENTS/rook/ui/rook
ROOK_BIN=/Users/Shailesh/MYAIAGENTS/rook/target/debug/rook pnpm tauri dev
```

With Sentinel:

```bash
ROOK_SENTINEL=dax \
ROOK_BIN=/Users/Shailesh/MYAIAGENTS/rook/target/debug/rook \
pnpm tauri dev
```

If chat fails with:

```text
Rook serve exited before becoming ready: exit status: 0
```

suspect that the desktop binary was spawned instead of the CLI binary.

Future agents should not treat this as a DAX Sentinel failure.

## Branch and Merge Policy

The maintainer is a single maintainer.

Do not assume a PR-heavy workflow.

Preferred workflow:

```text
small branch
small commits
local checks
manual smoke if runtime behavior changes
fast-forward merge to main
```

Before merge:

```bash
git checkout main
git pull origin main
git merge --ff-only <branch>
git push origin main
```

If `--ff-only` fails:

```bash
git checkout <branch>
git rebase main
```

Avoid merge commits unless deliberately chosen.

## Checks

Use focused checks. Do not demand a full green CI if known unrelated debt exists.

For Rook UI and Tauri changes:

```bash
cd ui/rook
pnpm typecheck
pnpm lint
pnpm vitest providerCatalog.test.ts
cargo check
```

For Rook CLI changes:

```bash
cargo check -p rook-cli
cargo test -p rook-cli
```

For DAX governance changes:

```bash
bun run typecheck
bun test packages/dax/src/governance/evaluate.test.ts
```

Manual DAX evaluator smoke:

```bash
echo '{"schemaVersion":"0.1.0","id":"smoke","runId":"r","source":"rook","sourceAgent":"manual","tool":"edit","target":"README.md","diffPreview":"."}' | dax governance evaluate
```

Expected:

```text
schemaVersion: "0.1.0"
source: "dax"
actionId: "smoke"
decision: allow | deny | needs_approval
```

## Do Not Do Yet

Do not merge the repos.

Do not create a shared package too early.

Do not make Rook hard-dependent on DAX.

Do not make DAX hard-dependent on Rook.

Do not add a shared database yet.

Do not persist DAX Sentinel approvals yet.

Do not auto-apply `modify` decisions.

Do not persist `persist_rule` decisions without explicit UI.

Do not change fail-open to fail-closed without a visible mode switch.

Do not hide DAX behind generic wording. DAX should have a visible seat when UI work begins.

## Near-Term Roadmap

### Immediate fix

Rook Desktop dev mode should avoid accidentally spawning the Tauri app binary as `rook serve`.

Recommended fix:

```text
Prefer ROOK_BIN when provided.
Prefer the root workspace CLI binary when it exists.
If only the Tauri app binary is found, fail with a clear error.
Forward rook serve stdout and stderr during startup.
```

There is already a helper for forwarding child output. It should be wired so future failures are visible.

### Next Rook phase

Add UI affordances for Sentinel.

Potential features:

```text
Sentinel mode indicator
DAX Sentinel badge
DAX seat panel
approval inbox
trust posture display
policy decision explanation
```

### Next DAX phase

Improve the evaluator into a richer governance surface.

Potential features:

```text
requiredEvidence
modifiedAction
policy reason codes
configurable fail behavior
structured audit event
optional approval persistence
```

### Future interop

Add import/export reports.

```bash
rook report --json
dax audit --from rook-report.json
```

This gives both systems value without live coupling.

## UX Principles

### Rook should show work as a living system

Users should see:

```text
what agent is working
what tool is being used
what DAX thinks
what risk exists
what needs approval
what changed
what evidence exists
```

### DAX should keep proof and discipline

DAX should not dilute its role.

It should keep answering:

```text
was this allowed?
was this approved?
was this verified?
what evidence exists?
what policy applied?
what posture should the operator trust?
```

### The user remains the operator

No architecture should remove the human decision gate from risky work.

The system can recommend, route, explain, and verify.

The operator decides.

## Instructions for Future Agents

Before changing Rook or DAX integration, answer these questions:

```text
1. Is this Rook UI/coordination work, DAX governance work, or shared boundary work?
2. Does this preserve both products as independently useful?
3. Is the change reversible?
4. Is it behind a feature flag or explicit mode if risky?
5. Does it preserve schemaVersion?
6. Does it avoid hidden hard dependencies?
7. Does it keep fail behavior explicit?
8. Does it improve visibility for the user?
9. Does it keep the user as operator?
10. Has the relevant smoke gate been run?
```

If the answer is unclear, write a design note first.

## Final Statement

Rook is the adaptive workstation for coordinated agent work.

DAX is the governed execution authority for accountable work.

Together they should create a system where agents can act, tools can be used, risks can be watched, evidence can be produced, and humans remain in control.

The goal is not autonomy for its own sake.

The goal is accountable agency.
