# Skills Registry

## Product Positioning

The Skills Registry is a governed catalog of reusable AI capabilities.

It is not a marketplace.

A marketplace suggests plugins, installation, and third-party distribution.

A registry suggests capability metadata, review, approval, governance, and evidence.

## Product Grammar

| Concept | Meaning |
|---|---|
| Skill | Reusable capability |
| Registry | Governed catalog |
| Suggestion | Rook recommends relevant skills |
| Approval | User reviews before use |
| DAX / Sentinel | Governs risky actions |
| Activity | Preserves evidence |

## Skill Categories

### Prompt Skills

Prompt skills shape messy user intent into structured prompts.

Examples:

- PRD Builder
- Stakeholder Summary
- Reviewer Checklist
- Release Note Writer

Risk level: Low

### Context Skills

Context skills gather, arrange, or summarize context.

Examples:

- Repo Explorer
- Commit Trace
- Jira Ticket Mapper
- File Context Builder

Risk level: Medium

### Action Skills

Action skills propose or perform state-changing work.

Examples:

- Create Branch
- Apply Patch
- Create PR
- Update Jira
- Open Sensitive File

Risk level: High

Action skills require approval and may require DAX/Sentinel evaluation.

## Skill Metadata Contract

A skill should declare:

```ts
type RookSkill = {
  id: string;
  name: string;
  description: string;
  category: "prompt" | "context" | "action";
  triggerExamples: string[];
  requiredContext: string[];
  outputContract: string;
  riskLevel: "low" | "medium" | "high";
  approvalRequired: boolean;
  evidenceEvents: string[];
  promptTemplate?: string;
};
```

## Suggestion Flow

Rook should suggest skills before using them.

```text
Raw user intent
  ↓
Rook interprets intent
  ↓
Rook suggests relevant skills
  ↓
User reviews skill card
  ↓
User approves or skips
  ↓
Rook prepares prompt, task, or action
  ↓
DAX/Sentinel governs risky actions
  ↓
Activity records evidence
```

## Skill Suggestion Card

A suggested skill should show:

```text
Skill name
Why Rook suggested it
Context it will use
Output it will produce
Risk level
Approval requirement
Evidence that will be logged
```

## DAX Boundary

Rook owns skill discovery and UX.

The Skills Registry owns skill metadata.

DAX owns governance decisions for risky actions.

The registry does not execute anything.

## Activity Events

Future events may include:

```text
skill_suggested
skill_approved
skill_skipped
skill_used
skill_blocked
```

## Non-Goals

* No public marketplace
* No plugin installation
* No dynamic code execution
* No hidden skill execution
* No autonomous skill chaining
* No DAX-hosted registry
* No hourly rebuild until the registry build path is restored
