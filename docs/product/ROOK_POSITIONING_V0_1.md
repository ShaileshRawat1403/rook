# Rook Positioning v0.1

## Purpose

This document fixes the product identity Rook is now growing into so future modules, docs, and UI decisions do not keep describing a narrower product than the one being built.

It is a positioning document, not a replacement for the operating model or manifesto.

Read alongside:

1. `docs/integrations/rook-dax-project-manifesto.md`
2. `docs/integrations/OPERATING_MODEL_V0_1.md`
3. `docs/integrations/COLONY_V1.md`
4. `docs/integrations/WORKFLOW_OUTCOMES_V0_1_CLOSEOUT.md`

## Core position

```text
Rook is a governed agentic workspace for modular business workflows.
```

Long form:

```text
Rook turns repeatable work into reusable workflow modules, assigns bounded steps to specialist agents, keeps humans in review and approval loops, and records outcomes as evidence-backed operational knowledge.
```

Rook is not primarily a coding assistant.

Coding is one workflow category inside Rook. The product center is broader:

```text
Work Item
  → Workflow Module
  → Colony
  → Specialist seats
  → Human review
  → Artifact
  → Evidence
  → Outcome telemetry
  → Reusable knowledge
```

## What Rook is

Rook is:

- a **workflow-first workspace** for repeatable business execution;
- a **human-governed coordination layer** where agents do bounded work rather than act as an unbounded swarm;
- a **module system** where successful work patterns become reusable, versioned methods;
- a **visible execution surface** where artifacts, evidence, review, and trust posture remain inspectable;
- the user-facing half of a broader Rook + DAX system in which **Rook coordinates** and **DAX governs**.

Rook should help users answer:

```text
What workflow are we running?
What input is needed?
Which specialists are contributing?
Where does the human review?
What artifact will be produced?
What evidence supports it?
What happened the last time this module ran?
```

## What Rook is not

Rook is not:

- a generic chatbot;
- a terminal-only coding assistant;
- an autonomous agent swarm that hides execution from the operator;
- a visual workflow-canvas product in search of a trust model;
- a replacement for DAX governance.

These exclusions are product-shaping, not rhetorical. They keep Rook focused on visible, governable work rather than drifting toward convenience features that weaken trust.

## Product model

The operating spine is:

```text
Intent
  → Work Item
  → Workflow Module
  → Colony execution
  → Review + evidence
  → Outcome
  → Improvement
```

The product grammar is:

| Concept | Product meaning |
| --- | --- |
| **Work Item** | the subject of the run |
| **Workflow Module** | the reusable method |
| **Colony** | the visible execution cockpit |
| **Seat** | a bounded specialist role inside a module |
| **Artifact** | the concrete output delivered by the run |
| **Evidence** | what supports the artifact and review |
| **Outcome telemetry** | the factual memory of what happened |

This model is intentionally domain-general. Repo review is one module. A Statement of Work is another. The system should not need a new architecture every time the artifact stops being code.

## Why the SOW Builder matters

`sow-builder@1.0.0` is the first explicit proof that Rook is already broader than coding-agent software.

It uses business delivery roles:

```text
Business Analyst
Developer
Project Manager
```

It produces a governed business artifact:

```text
Statement of Work
```

It requires:

- scoped intent;
- evidence;
- uncertainty disclosure;
- reviewer approval;
- change control;
- immutable module versioning.

That makes it a workflow module, not a document generator.

## Category shift

The old shorthand:

```text
AI agent for terminal and desktop
```

is technically true but strategically too small.

The newer category:

```text
governed business workflow workbench
```

better explains the system being built:

- repo workflows;
- planning workflows;
- discovery workflows;
- proposal workflows;
- client-delivery workflows;
- later, any repeatable knowledge work that benefits from specialist agents, human review, and recorded outcomes.

## Module ladder

The next useful modules should form a business workflow chain rather than a disconnected gallery.

Recommended ladder:

```text
Discovery Brief
  → SOW Builder
  → Proposal Builder
  → Delivery Plan
  → Case Study Generator
```

This ladder has a clean logic:

- **Discovery Brief** captures the upstream truth.
- **SOW Builder** converts that truth into scoped delivery.
- **Proposal Builder** packages value and approach for a buyer.
- **Delivery Plan** turns the commitment into execution slices.
- **Case Study Generator** turns completed work into reusable proof.

## Role strategy

Do not promote module-local seats into reusable first-class roles too early.

Rule:

```text
One module proves a pattern.
Three modules prove a reusable role.
```

`Business Analyst`, `Developer`, and `Project Manager` should remain local to `sow-builder@1.0.0` until at least two additional modules need the same role grammar with stable overlap in:

- responsibility;
- prompt shape;
- evidence rules;
- output expectations.

Only then should Rook consider extracting:

```text
RoleDefinition
RolePrompt
RoleOutputContract
RoleEvidenceRules
```

Premature extraction would turn one good module into an abstraction tax.

## Positioning language

Preferred one-line description:

```text
Rook is a governed agentic workspace for modular business workflows.
```

Preferred README paragraph:

```text
Rook is a workflow-first agentic workspace for business execution. It turns repeatable work into modular workflows, assigns bounded steps to specialist agents, keeps humans in review and approval loops, and records outcomes as reusable knowledge.
```

Supporting sentence:

```text
Rook can support coding and repo workflows, but its core model is broader: Work Items, Workflow Modules, Colony execution, Sentinel governance, artifacts, evidence, and outcome telemetry.
```

## Product principles

1. **Coding is a module category, not the product center.**
2. **Every repeatable workflow should be expressible as a versioned module.**
3. **Agents execute bounded steps; humans retain judgment and approval.**
4. **Artifacts matter more than chat transcripts.**
5. **Evidence and outcomes are part of the product, not afterthoughts.**
6. **Reusable knowledge should emerge from runs, not from speculative abstractions.**
7. **Rook coordinates visible work; DAX contributes governance, evidence, and trust.**

## Near-term implications

### Keep

- module-local BA / PM / Dev seats for now;
- the current Colony + module architecture;
- workflow outcomes as the factual memory layer;
- low-friction module creation by adding strong recipes before building broad authoring abstractions.

### Next

1. Run `sow-builder@1.0.0` in real use and inspect the produced SOW artifact, review loop, and telemetry.
2. Build one upstream business module next, preferably `discovery-brief@0.1.0`.
3. Reassess reusable role extraction only after multiple business modules expose the same stable role grammar.
4. Update the README once the positioning has survived at least one more business module, so public language follows demonstrated product reality rather than aspiration.

## North star

```text
Rook is not a coding assistant.

Rook is a governed business workflow workbench.

It turns repeatable work into modules.
Modules create specialist agent tasks.
Agents produce structured artifacts.
Humans review decisions.
Evidence and outcomes are recorded.
Successful patterns become reusable workflows.

Coding is one module.
Business execution is the product.
```
