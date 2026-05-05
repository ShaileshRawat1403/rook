# Colony Adoption Bridge Plan

## Product Frame

Colony is an SDLC control panel for AI-assisted project work.

It does not replace chat. It wraps complex work with scope, project notes, work items, role sessions, context packets, saved outputs, audit trail, and safety posture.

The operating rule is:

```txt
When one chat gets too large, Colony gives the work structure without taking control away.
```

## v0.4 Information Architecture Lock

Keep the v0.4 tab model:

```txt
Overview
Work
Context
Notes
Outputs
Audit
```

Panel meanings:

| Tab | Meaning |
| --- | --- |
| Overview | Workspace brief, next step, readiness signal, role summary |
| Work | Work items, role sessions, assignment, Plan with Swarm shortcut |
| Context | Create context packets, Stage in Session, Copy Prompt fallback |
| Notes | Project summary, repo notes, decisions, constraints, risks, open questions |
| Outputs | Manual saved outputs, Fill from Seat Output |
| Audit | Trust receipts: scope changed, session linked, context copied, context staged, output saved |

Copy rule:

```txt
Tab label: Context
Panel title: Send Context
Primary action: Stage in Session
Fallback action: Copy Prompt
```

Stop renaming for v0.4. The goal is product clarity, not a new vocabulary pass.

## v0.4 Merge Boundary

Must have:

- Stage in Session works.
- Target role session is created and linked when missing.
- Prompt is staged into chat draft input.
- User manually presses Send.
- No automatic model execution.
- No automatic artifact creation.
- No automatic memory update.
- UI is decluttered around the six-tab IA.
- Task Board crash path from stale persisted data is hardened.

Do not add before v0.4 merge:

- Sidebar architecture changes.
- Create Colony from Project.
- Session import.
- Transcript summarization.
- Repo indexing.
- Directory reading.
- Autonomous agents.
- Agent-to-agent invocation.

## Feasibility: Colony Role Sessions In Sidebar

This is feasible with the current architecture.

Current primitives already exist:

- Chat sessions have `projectId`.
- Colony sessions have `projectId`.
- Colony seats have `role`, `label`, `sessionId`, `projectId`, and `binding`.
- Sidebar already groups normal sessions by project.
- Clicking a sidebar chat already opens a session.

Product rule:

```txt
Project = normal workspace grouping
Colony = governed SDLC session container
Role session = scoped chat inside the Colony
```

Desired sidebar shape:

```txt
PROJECTS
  Rook
    Normal project chats

COLONY
  Colony 5/5/2026
    Planner
    Worker
    Reviewer
```

This should be a v0.4.1 polish branch, not a v0.4 merge blocker.

Recommended branch:

```txt
feat(colony): show role sessions under active colony in sidebar
```

Acceptance criteria:

- Sidebar shows a Colony section when a Colony exists.
- Active Colony appears as a collapsible parent.
- Linked role sessions appear under it.
- Clicking Planner, Worker, or Reviewer opens the linked chat session.
- Unlinked roles appear muted as not linked.
- Normal project chats remain unchanged.
- Colony role sessions may still appear in Recents, but Colony grouping is the primary path.
- Do not show tasks, notes, outputs, audit, or context packets as sidebar children yet.

Non-goals:

- No new sidebar architecture.
- No multi-colony sidebar tree yet.
- No task tree in sidebar.
- No artifact tree in sidebar.

## Feasibility: Create Colony From Project

This is feasible, but it is larger than v0.4. It should be v0.5 because it introduces a new project-to-colony onboarding flow and new metadata.

Current primitives already exist:

- Projects own normal chat grouping through `projectId`.
- Sessions can be filtered by `projectId`.
- Colony can store a project boundary through `projectId` and `scope.kind = "project"`.
- Seats can link existing sessions via `bindSeatToSession`.
- Notes and outputs are already explicit and user-controlled.

Key product rule:

```txt
Projects collect sessions.
Colony coordinates selected sessions.
Notes and outputs become durable only after user review.
```

Colony should not silently ingest every project chat. That would recreate the context overload Colony is meant to solve.

## v0.5 Project Import Model

Recommended branch:

```txt
colony-v0.5-project-import
```

Desired workflow:

```txt
Project: Rook
Sessions: 6

User clicks:
Create Colony from Project

Rook shows:
Select sessions to include

For each session:
[ ] Ignore
[ ] Link as Reference
[ ] Use as Planner
[ ] Use as Worker
[ ] Use as Reviewer
```

Result:

```txt
Colony: Rook Project Colony
Project: Rook
Scope: project / Rook

Role sessions:
  Planner -> linked planning session
  Worker -> linked implementation session
  Reviewer -> linked review session

Reference sessions:
  Repo architecture discussion
  Docs notes
```

Suggested metadata:

```ts
type ColonyLinkedSession = {
  sessionId: string;
  relation: "role_session" | "reference";
  role?: "planner" | "worker" | "reviewer";
  title: string;
  linkedAt: string;
};
```

The role mapping can continue to live on `ColonySeat` for active role sessions. `ColonyLinkedSession` is mainly for reference sessions and import provenance.

## Safe Context Acquisition Layers

Colony gains project context in layers:

```txt
Layer 1: Project binding
Colony knows which project it belongs to.

Layer 2: Selected session links
User chooses which sessions are relevant.

Layer 3: Role mapping
Some selected sessions become Planner, Worker, or Reviewer sessions.

Layer 4: Reference linking
Other selected sessions become reference sources, not active roles.

Layer 5: Context brief proposal
Rook proposes notes, decisions, risks, open questions, and outputs from selected sessions.

Layer 6: User approval
Only approved summaries become Colony Notes or Outputs.
```

Important boundaries:

- No hidden transcript absorption.
- No automatic memory mutation.
- No automatic saved output creation.
- No automatic model execution from Colony.
- No repo indexing as part of project import.

## v0.5 Acceptance Criteria

- User can start Create Colony from Project.
- User can select project sessions.
- User can map selected sessions to Ignore, Reference, Planner, Worker, or Reviewer.
- Existing selected role sessions bind to Colony seats.
- Reference sessions are stored as linked metadata.
- Colony scope becomes `project / <project name>`.
- Context brief generation is explicit and user-triggered.
- Proposed notes are shown for review before save.
- Proposed outputs are shown for review before save.
- Audit records project binding, session linking, role mapping, and accepted notes or outputs.
- No automatic Send happens.
- No model runs unless the user explicitly asks for a context brief or manually sends a staged prompt.

## Merge Recommendation

Merge v0.4 after the current adoption bridge is stable.

Do not block v0.4 on sidebar grouping or project import.

Next order:

```txt
v0.4      Adoption Bridge
v0.4.1    Sidebar role-session grouping
v0.5      Create Colony from Project with curated session linking
```
