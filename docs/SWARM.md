# Rook Swarm Roadmap

## Context
Rook Swarm is a recipe-based delegation system through bounded specialist agents. It operates as the next layer *after* Colony, fully respecting Colony's grounding layer:

- **Intent**     → Task
- **Context**    → Handoff
- **Role**       → Seat
- **Governance** → Sentinel
- **Evidence**   → Activity
- **Attention**  → Context Budget
- **Model**      → Seat Model → Session

Rook Swarm does *not* entail models freely spawning autonomous agents. Instead, it provides **visible, repeatable, reviewable, and bounded** delegation.

## Key Insight
Subagent delegation is valid and powerful when executed correctly. Tools like Claude Code and Codex CLI succeed by:
1. Breaking tasks into subtasks.
2. Assigning narrower instructions.
3. Using selective context.
4. Synthesizing partial findings.

Rook's differentiation lies in making this pattern transparent. Rather than a "black box" swarm, Rook Swarm provides a **Swarm Plan** that users can review and approve before any execution occurs. 

### The Safe Version (Our Goal)
1. User asks a complex task.
2. Main model proposes a swarm recipe.
3. Rook shows the specialist agents and their outputs.
4. User approves.
5. Rook creates tasks, handoffs, and evidence.
6. No hidden execution.

### The Risky Version (Non-Goal)
- User asks a task.
- Model silently creates many agents.
- Agents run with unclear context.
- Outputs merge without evidence.
- User loses track.

## Hierarchy & Model
Swarm feeds into Colony, it does not replace it.

```text
Swarm Recipe
  └── Specialist Agent
        ├── Persona
        ├── Skills
        ├── Model
        ├── Context Packet
        ├── Output Contract
        └── Evidence
```

**Connection to Colony:**
User Intent → Swarm Recipe → Specialist Assignments → Colony Tasks → Handoffs → Activity Evidence → Reviewer / Sentinel

## Examples

### Example: Repo Review Swarm
**User asks:** "Check this repo and tell me what needs work."
**Swarm Recipe:** Repo Review
**Specialists:**
1. **Repo Explorer:** Maps structure, entry points, stale areas.
2. **CI/Test Inspector:** Checks scripts, tests, workflows.
3. **Security Reviewer:** Checks CSP, secrets, policies.
4. **Product Interpreter:** Explains what the repo is becoming.
5. **Synthesis Writer:** Produces final findings.

Each specialist provides bounded outputs: Findings, Evidence, Risk, Recommendation, Uncertainty.

### Example: PRD Creator Swarm
**Swarm Recipe:** PRD Builder
**Specialists:**
1. Intent Clarifier
2. User / Stakeholder Mapper
3. Requirements Writer
4. UX Flow Mapper
5. Acceptance Criteria Reviewer
6. PRD Synthesizer

## Implementation Path

### Swarm v0.1: Recipe Planner (MVP)
*Goal: No automatic execution. Planning layer only.*
1. Detect complex user intent.
2. Suggest a workflow recipe.
3. Show specialist agents, tasks, and output contracts.
4. Ask user to approve.
5. Create Colony tasks and handoffs.
6. Generate copyable prompts.

### Swarm v0.2: Specialist Prompt Generation
- Each specialist gets a generated prompt.
- Prompts are fully copyable.
- Outputs are manually pasted or linked back.

### Swarm v0.3: Read-only Specialist Runs
- One specialist can run read-only inspections after user approval.
- No writes. No destructive commands.

### Swarm v0.4: Synthesis Artifact
- Rook collects specialist outputs into one single artifact.
- Reviewer checks the artifact.

### Swarm v0.5: Governed Execution
- Only after review and Sentinel approval can state-changing actions occur.

## Minimal Data Model

```typescript
type SwarmRecipe = {
  id: string;
  name: string;
  purpose: string;
  triggerExamples: string[];
  agents: SwarmAgentTemplate[];
  outputArtifact: string;
  riskLevel: "low" | "medium" | "high";
};

type SwarmAgentTemplate = {
  id: string;
  label: string;
  personaId?: string;
  skills: string[];
  taskPrompt: string;
  outputContract: string;
};

type SwarmPlan = {
  id: string;
  recipeId: string;
  userIntent: string;
  assignments: SwarmAssignment[];
  status: "draft" | "approved" | "running" | "reviewed";
};

type SwarmAssignment = {
  id: string;
  agentLabel: string;
  taskTitle: string;
  contextSummary: string;
  outputContract: string;
  linkedTaskId?: string;
  linkedHandoffId?: string;
};
```

## Strategic Vision
Colony keeps humans oriented.
Swarm helps Rook decompose complex work into repeatable specialist workflows.
Sentinel keeps execution governed.

*Nomenclature:* In product copy, refer to these as "Workflow Recipes", "Specialist Workflows", or "Delegation Plans". Avoid over-hyping "autonomous swarms".
