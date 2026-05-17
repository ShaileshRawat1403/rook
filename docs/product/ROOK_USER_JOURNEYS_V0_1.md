# Rook User Journeys v0.1

## Purpose

This document fixes the user journeys Rook supports as a workflow execution workbench. It exists because the architecture is sound but the user-facing path still exposes too much internal machinery. Live operator runs surfaced runtime errors (`Failed to spawn rook serve binary…`) and "what do I do now?" moments that belong to the product, not the engineering tree.

It is a **north star, not an implementation spec.** No screens, no copy, no component design. Six binding contracts that any future UI must honor.

Read alongside:

1. `docs/product/ROOK_POSITIONING_V0_1.md` — the product identity these journeys serve.
2. `docs/integrations/OPERATING_MODEL_V0_1.md` — the twelve-step operating spine the journeys map onto.
3. `docs/integrations/WORKFLOW_STATE_MODEL_V0_1.md` — the state language each journey speaks.
4. `docs/integrations/WORKFLOW_OUTCOMES_V0_1_CLOSEOUT.md` — what telemetry records about each completed journey.

## Operating principle

```text
The user must always know:
  current state, next action, blocking issue (if any), why it matters.
```

If a screen cannot answer those four, it is not a Rook screen yet.

## 1. Default journey — what the user sees with no current workflow

**Binding question:** When a user opens Rook with nothing in flight, what do they see?

**Contract:**

- The default surface is **workflow selection**, not chat.
- Chat exists as an explicit fallback, not the entry point.
- The user sees a small set of named, available workflow modules. Each module names: required input, the roles that will run, the artifact produced, whether human review is required.
- A "I don't know what workflow I need" path exists and routes to the unknown-workflow journey (§3). It is not a dead end.
- If preflight fails for any reason, the user sees a recovery surface (§6) before they can attempt to start a workflow that will fail.

**What is NOT in scope here:** layout, module card visual, branding, persistence of "recent" workflows, multi-user. Those are downstream scope-locks.

## 2. Known-workflow journey — when the user knows what they want

**Binding question:** When a user knows which workflow they want to run, what are the screens between intent and outcome?

**Contract:** Every known-workflow run walks the same beats, derived from `OPERATING_MODEL_V0_1.md`'s twelve-step flow:

1. **Workflow selection** — the user picks the module.
2. **Input capture** — Rook surfaces the inputs the module declares as required (title, scope, acceptance criteria, etc.). The user fills them or imports from an existing Work Item.
3. **Preflight gate (§4)** — runtime readiness checked before any agent runs. Block here on failure with recovery copy.
4. **Colony creation** — seats appear, tasks listed, state visible.
5. **Per-seat execution** — for each specialist seat: the user kicks off the step, the model produces role-bounded output, the user reviews the step output, the user advances. No silent auto-progression between seats.
6. **Artifact assembly** — the user attaches the final artifact (often produced by the last seat). Rook checks readiness against the output contract.
7. **Review** — the user approves or requests changes. Guards in `outputReadiness.ts` enforce: approval needs readiness; request-changes needs an artifact.
8. **Close** — Rook records telemetry and surfaces the outcome (`endState`, trust posture, evidence summary).

**What must be visible at every beat:** current state, next action, blocking issue (if any), what the user is producing.

**What is NOT in scope here:** the exact UX of artifact editing, the layout of seat panels, multi-Colony coordination. Those are downstream scope-locks.

## 3. Unknown-workflow journey — when the user doesn't know

**Binding question:** When the user has an intent ("I need to prepare something for a client call") but doesn't map it to a module, how does Rook help them figure it out without dropping them into chat?

**Contract:**

- The first move is **classification**, not execution. Rook asks for the desired *output* and the *context* before suggesting modules.
- Rook proposes a ranked, small list of candidate modules — each tagged with what it's good for and what input it needs. The user can pick one, ask for more, or ask Rook to clarify.
- If no module is a confident match, Rook offers an **Intake workflow** that produces a structured Work Item the user can re-enter §1 with. This is the fallback, and it is itself a governed workflow (own seats, own output contract).
- Falling back to general chat is allowed but **named as a fallback**, not the default. The user must opt in.
- This journey ends by routing the user back into §2 (known-workflow) with a selected module and a populated Work Item.

**What is NOT in scope here:** the classifier model, ranking heuristics, the visual of the suggestion list. Those are downstream scope-locks.

## 4. Preflight contract — what must be true before a workflow starts

**Binding question:** What must Rook verify before a workflow can start, and how are missing pieces surfaced?

**Contract:** Before the first seat runs, Rook verifies:

1. **Execution provider available** — the configured model provider can be reached, or a local runtime binary exists and is launchable.
2. **Selected model available** — the model the user picked is reachable from the chosen provider.
3. **Artifact directory writable** — the workflow can persist outputs and telemetry.
4. **Workflow module valid** — the recipe loads, declares an output contract, and has at least one specialist seat.
5. **Required inputs present** — every input the module declares as required is filled in the Work Item.
6. **Output contract known** — what the workflow is supposed to produce is declared and inspectable to the user.

**On failure:** the workflow does not start. Rook shows a recovery surface (§6) listing exactly which check failed and what the user can do about it. The user does not see a stack trace, a binary path, or a Tauri error code.

**What is NOT in scope here:** auto-fix attempts, downloading binaries on demand, account/billing flows. Preflight reports state; it does not heal it.

The implementation slice is scope-locked in `docs/integrations/WORKFLOW_PREFLIGHT_V0_1.md`.

## 5. State display contract — what every screen owes the user

**Binding question:** At every screen, the user must be able to answer four questions in one glance. What does that contract look like?

**Contract:** Every Rook surface (workflow-bearing or not) makes these visible:

| Item | What it answers |
|---|---|
| **Current state** | Where am I in the workflow? (`scoped`, `running`, `reviewing`, `changes_requested`, `closed`, etc.) |
| **Next action** | What should I do next? Named as a verb, not a status. ("Run BA step", "Review artifact", "Approve", "Close".) |
| **Blocking issue** | What, if anything, prevents the next action? Named in user terms. |
| **Why it matters** | What does completing the next action achieve? One sentence, no jargon. |

This applies to:

- Workflow selection (state: "no workflow selected", next action: "choose a workflow or run discovery").
- Inside a Colony (state from `WORKFLOW_STATE_MODEL_V0_1.md`'s vocabulary, next action from the workflow's plan).
- Output review (state: "ready to approve" or "missing X, Y", next action: approve / request changes / add artifact).
- After close (state: "closed", next action: "view outcome" or "start another workflow").

**What is NOT in scope here:** specific copy, font choices, badge colors, progress bars. The contract is *visibility of the four items*, not their visual treatment.

## 6. Error translation contract — runtime failures become recovery steps

**Binding question:** When something inside Rook fails (runtime, provider, filesystem, network), how is that surfaced to a user who doesn't know what a "binary" or "ACP session" is?

**Contract:** Every runtime error reaching a user-facing surface gets translated to a recovery card with three parts:

1. **What happened** — one sentence in user terms. ("Rook couldn't start its local execution runtime.")
2. **What you can do** — one or more concrete recovery actions, ranked by likelihood of working. Each action is verb-led and concrete.
3. **Technical details** — collapsed by default. Contains the raw error, paths, stack trace. Opt-in only.

Worked example for the live-run failure that prompted this doc:

```text
Surface (user-facing):
  Rook couldn't start its local execution runtime.

  What you can do:
  1. Choose another configured model provider.
  2. Rebuild the local Rook runtime (developer setup required).
  3. Continue drafting without execution (output won't be tracked).

  [ ⌄ Technical details ]
     binary: /Users/.../target/debug/rook
     cwd:    /Users/.../.rook/artifacts
     error:  No such file or directory
```

**Guarantees:**

- No user-facing error contains a raw file path, binary name, or process identifier outside the collapsed technical-details block.
- No user-facing error is silent — every failure produces a recovery card, even if the only action is "report this to a maintainer".
- No user-facing error breaks the user out of the workflow. State is preserved; the user can retry the failed step or take an alternate action.

**What is NOT in scope here:** the design system for the recovery card, error-code taxonomies, error reporting telemetry. Those are downstream slices.

## Acceptance criteria for v0.1 adopted

This document is considered adopted when:

- [ ] Any new Rook UI slice cites which of the six contracts it implements.
- [ ] `WORKFLOW_PREFLIGHT_V0_1.md` exists and implements §4 specifically.
- [ ] The default Rook home surfaces workflow selection, not chat, when no workflow is in flight.
- [ ] Every runtime error reaching a user surface goes through the §6 translation pattern.
- [ ] No new feature work proposes UI without first naming which journey beat it serves.

## What this document is not

- A UI specification. Screens, layouts, copy, components — out of scope. Those are downstream scope-locks.
- A taxonomy of all possible workflows. The journeys are journey *shapes*, not module catalogs.
- A replacement for the operating model, state model, or positioning doc. It sits on top of them.
- A complete edge-case list. The eight edge cases that prompted this doc (no workflow, provider down, stage-but-no-send, incomplete inputs, output without workflow, premature approval, request-changes flow, missing module) are absorbed into the six contracts above. Future edge cases either fit a contract or surface a gap that demands a new contract.

## Open questions (deferred to v0.2)

1. **Beginner / Operator / Developer modes.** The original prompt named three audience tiers. v0.1 does not differentiate — every user sees Operator-level state by default. Mode-switching is deferred until real audience evidence appears.
2. **Recent workflows / history surface.** Once §1 is real, returning users will want a "pick up where I left off" affordance. Out of scope for the journey contract; will surface as its own slice.
3. **Multi-step intake within unknown-workflow journey.** §3 currently routes through a single intake step; multi-step intake (clarification rounds) may be needed when classification confidence is low. Defer until a confidence metric exists.
4. **Persistence of preflight state between sessions.** §4 reports state now; whether it caches "last known good" between launches is a separate question.

## Changelog

- **v0.1 (2026-05-17):** Initial journey contracts. Six binding sections (default / known / unknown / preflight / state display / error translation). Operating principle: every screen surfaces current state, next action, blocking issue, why it matters. No UI, no copy. Triggered by a live SOW Builder run that hit `Failed to spawn rook serve binary` and surfaced the gap between architectural correctness and operator experience.
