# Rook Colony Mode

## Purpose

This document defines the first implementation scope for Rook Colony Mode.

It exists to prevent scope creep while exploring agent swarm behavior inside Rook.

The goal is not to build an unbounded autonomous swarm. The goal is to make coordinated agent work visible, understandable, and governable.

## Core Thesis

Rook Colony Mode follows the existing Rook and DAX relationship model:

```
Rook coordinates the colony.
DAX governs the run.
The user remains the operator.
```

Colony Mode belongs in Rook first because Rook owns the workstation, agent picker, desktop shell, session surface, provider setup, and visual coordination of agent work.

DAX remains the governance authority. It evaluates risky actions, approval needs, trust posture, and evidence requirements through the existing Sentinel seam.

## Product Boundary

### Rook Owns

```
colony UX
agent seats
role assignment
provider selection
session grouping
shared transcript
operator controls
DAX Sentinel visibility
colony report export
```

### DAX Owns

```
policy decisions
approval semantics
risk posture
evidence requirements
audit posture
trust reasoning
allow / deny / needs_approval decisions
```

### Boundary Rule

Rook should not redefine DAX governance.

DAX should not own Rook colony UX.

The integration must stay explicit, optional, reversible, and process-boundary based.

## v0.1 Scope

Rook Colony Mode v0.1 is a desktop UI and coordination layer.

It should include:

```
1. Design document
2. Local colony feature types
3. Colony feature folder
4. AppView route for "colony"
5. Sidebar navigation entry
6. Static Colony UI
7. Three role cards: Planner, Worker, Reviewer
8. Visible DAX Sentinel state
```

It should not include execution yet.

## Key Design Decision

A colony seat is a role wrapper around an existing Rook session.

```
ColonySeat = role + provider + optional session reference + status
```

A colony is not a new runtime in v0.1.

This lets Rook explore coordinated agent work without adding tmux, recursive spawning, or a new execution substrate too early.

## Initial Roles

Start with three fixed roles.

### Planner

Responsible for breaking the user intent into a clear task direction.

### Worker

Responsible for performing the assigned work using the selected provider or agent.

### Reviewer

Responsible for inspecting outputs, surfacing risks, and helping the user decide what to accept.

No additional roles should be added in v0.1.

## Initial Files

### Design Doc

```
docs/integrations/rook-colony-mode.md
```

This file is the source of truth for the initial Colony Mode scope.

### Feature Folder

```
ui/rook/src/features/colony/
```

Suggested files:

```
types.ts
colonyStore.ts
ColonyView.tsx
ColonySeatCard.tsx
ColonyTranscript.tsx
colonyRecipes.ts
```

### Types Location

Keep types local for v0.1:

```
ui/rook/src/features/colony/types.ts
```

Do not place initial Colony Mode types in:

```
ui/rook/src/shared/types/
```

Reason: Colony Mode starts as a self-contained feature. Promote stable types to shared only when another feature needs them.

## Initial Type Shape

```ts
export type ColonyRole = "planner" | "worker" | "reviewer";

export type ColonySeatStatus =
  | "idle"
  | "thinking"
  | "running"
  | "waitingPermission"
  | "blocked"
  | "done"
  | "failed";

export type ColonySeat = {
  id: string;
  role: ColonyRole;
  label: string;
  providerId?: string;
  sessionId?: string;
  acpSessionId?: string;
  projectId?: string;
  status: ColonySeatStatus;
  currentTask?: string;
  lastUpdate?: string;
};

export type ColonySession = {
  id: string;
  title: string;
  intent: string;
  projectId?: string;
  seats: ColonySeat[];
  activeSeatId?: string;
  sentinelMode: "off" | "dax_open";
  createdAt: string;
  updatedAt: string;
};
```

These are UI-level types for v0.1. They are not shared protocol types.

## App Integration Points

### AppView

Add `"colony"` to the AppView union in:

```
ui/rook/src/app/AppShell.tsx
```

Example:

```ts
export type AppView =
  | "home"
  | "chat"
  | "skills"
  | "agents"
  | "projects"
  | "session-history"
  | "colony";
```

### Routing

Route the colony view through:

```
ui/rook/src/app/ui/AppShellContent.tsx
```

### Sidebar

Add a Colony navigation item in:

```
ui/rook/src/features/sidebar/ui/Sidebar.tsx
```

The label should be:

```
Colony
```

Avoid calling it Swarm in the UI for v0.1.

## Static UI Requirements

The first UI should show only static state.

Minimum display:

```
Colony Mode
Shared intent placeholder
DAX Sentinel status
Planner card
Worker card
Reviewer card
```

Each role card should show:

```
role
label
status
provider placeholder
current task placeholder
```

No execution buttons are required in the first PR.

## DAX Sentinel Relationship

Colony Mode should reuse the existing DAX Sentinel path.

Current flow:

```
ACP permission request
↓
Rook maps request to ProposedAction
↓
DAX evaluates through dax governance evaluate
↓
DAX returns GovernanceDecision
↓
Rook maps decision back to ACP permission response
```

For v0.1, Colony Mode should only display Sentinel state.

Do not change the DAX schema.

Do not add colony metadata to ProposedAction yet.

A later version may add optional colony context after the UI proves useful.

## Event Model

Rook already has a local event store. Colony Mode may later use it for timeline events.

Potential future event types:

```
colony.created
colony.seat.added
colony.seat.updated
colony.permission.evaluated
colony.report.exported
```

Do not add event persistence in the static UI PR unless needed for a simple smoke path.

## Future Runtime Path

Do not introduce tmux in v0.1.

The preferred evolution is:

```
v0.1: logical colony UI
v0.2: seats linked to existing Rook sessions
v0.3: shared colony transcript
v0.4: DAX Sentinel decisions shown per seat
v0.5: optional worktree isolation
v0.6: optional process or tmux runner
```

When runtime backends are needed, use an adapter shape:

```
AgentSeatRunner
├── AcpSessionRunner
├── ProcessRunner
└── TmuxRunner
```

tmux should be a backend, not the product architecture.

## Non-Goals for v0.1

Do not build:

```
recursive agent spawning
autonomous sub-agent hierarchy
tmux runtime
process runner
Git worktree per seat
NATS transport
Soothsayer integration
shared DAX/Rook database
DAX schema changes
mobile approvals
Slack bridge
computer-use bridge
persistent swarm memory
```

## First PR Scope

Recommended first PR title:

```
Add Rook Colony Mode design and static UI shell
```

Allowed changes:

```
docs/integrations/rook-colony-mode.md
ui/rook/src/features/colony/types.ts
ui/rook/src/features/colony/colonyStore.ts
ui/rook/src/features/colony/ColonyView.tsx
ui/rook/src/features/colony/ColonySeatCard.tsx
ui/rook/src/app/AppShell.tsx
ui/rook/src/app/ui/AppShellContent.tsx
ui/rook/src/features/sidebar/ui/Sidebar.tsx
```

Avoid changes to:

```
crates/rook
crates/rook-cli
crates/rook-acp
crates/rook-mcp
DAX bridge schemas
generated ACP types
```

## Success Criteria

The first implementation is successful when:

```
1. The Colony view appears in the sidebar.
2. The Colony view opens without starting agent execution.
3. Planner, Worker, and Reviewer cards render clearly.
4. DAX Sentinel state is visible.
5. No runtime behavior changes.
6. No DAX dependency is introduced.
7. No tmux dependency is introduced.
```

## Check Commands

For the static UI PR, use focused checks:

```bash
cd ui/rook
pnpm typecheck
pnpm lint
pnpm test
```

If Tauri wiring is touched, also run:

```bash
cargo check
```

Do not require unrelated full-stack green checks for this first scoped change.

## Final Rule

Colony Mode should grow only after each layer proves useful.

Do not add autonomy before visibility.

Do not add parallelism before role clarity.

Do not add tmux before session grouping works.

Do not add DAX schema changes before the UI proves what context is actually needed.