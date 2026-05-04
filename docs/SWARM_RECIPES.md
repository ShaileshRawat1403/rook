# Swarm Recipes

## Purpose

Swarm Recipes are structured decomposition patterns for complex work. They help Rook break down multi-faceted tasks into bounded specialist workflows while preserving Colony's visibility, handoffs, and evidence model.

## Relationship to Colony

Swarm sits above Colony:

```
User Intent → Swarm Recipe → Colony Tasks → Handoffs → Activity Evidence → Reviewer
```

Colony owns execution state. Swarm owns decomposition planning.

## Non-Goals

Swarm v0.1 does not:
- Execute specialists automatically
- Spawn autonomous agents
- Run hidden background tasks
- Skip handoff verification
- Bypass Sentinel governance
- Auto-merge outputs without review

**A Swarm Recipe is not an autonomous agent network. It is a structured decomposition pattern.**

## Recipe Lifecycle

| Stage | Description |
|-------|-------------|
| Draft | Recipe selected, prompts generated |
| Approved | User confirms specialist assignments |
| Tasks Created | Colony tasks created |
| Prompts Copied | Specialist prompts copied for manual use |
| Evidence | Outputs linked to activity |

v0.1 stops at "Prompts Copied." Everything else is manual.

## Recipe Schema

```typescript
type SwarmRecipe = {
  id: string;
  name: string;
  version: string;
  purpose: string;
  triggerExamples: string[];
  riskLevel: "low" | "medium" | "high";
  colonyMapping: {
    taskType: string;
    seats: string[];
    handoffs: string[];
    evidenceRequired: boolean;
  };
  specialists: SwarmSpecialist[];
  finalArtifact: SwarmArtifactContract;
  reviewChecklist: string[];
  nonGoals: string[];
};
```

## Specialist Schema

```typescript
type SwarmSpecialist = {
  id: string;
  label: string;
  role: string;
  skills: string[];
  allowedContext: string[];
  disallowedContext: string[];
  taskPrompt: string;
  outputContract: {
    format: "markdown" | "json" | "checklist";
    requiredSections: string[];
    evidenceRequired: boolean;
    uncertaintyRequired: boolean;
  };
};
```

## Context Packet Contract

```typescript
type ContextPacket = {
  sourceTaskId: string;
  sourceArtifacts: string[];
  summary: string;
  includedContext: string[];
  excludedContext: string[];
  budget: {
    maxTokens: number;
    priority: "low" | "medium" | "high";
  };
};
```

---

## Recipe 1: Repo Review

**Purpose**: Inspect an existing codebase and produce a structured findings report.

**Risk Level**: Low (read-only inspection)

**Trigger Examples**:
- "Review this repo"
- "What needs work here?"
- "Check for technical debt"

### Specialists

| Specialist | Role | Output |
|------------|------|--------|
| Repo Explorer | Maps structure, entry points, dead code | Structure map + file inventory |
| CI/Test Inspector | Checks scripts, tests, workflows | Test coverage + workflow status |
| Security Reviewer | Checks secrets, CSP, dependencies | Security findings |
| Product Interpreter | Explains what the repo is becoming | Product summary |

### Copyable Prompts

**Repo Explorer Prompt:**
```
You are a Repo Explorer. Your task is to map the codebase structure.

Report in this format:
1. Top-level directories and their purpose
2. Entry points (main, lib, bin)
3. Configuration files
4. Test locations
5. Any stale or unmaintained areas

Be thorough. List file paths. Do not skip directories.
```

**CI/Test Inspector Prompt:**
```
You are a CI/Test Inspector. Your task is to check testing and automation.

Report in this format:
1. Test framework used
2. Test coverage summary
3. CI/CD workflows found
4. Any broken or outdated workflows
5. Recommendations

Focus on quality, not just presence.
```

**Security Reviewer Prompt:**
```
You are a Security Reviewer. Your task is to find security concerns.

Report in this format:
1. Secrets or keys in code
2. CSP / security headers
3. Outdated dependencies
4. Known CVEs
5. Risk level: low/medium/high

Do not fix. Only report.
```

**Product Interpreter Prompt:**
```
You are a Product Interpreter. Your task is to explain what this repo does.

Report in this format:
1. What the repo is (one sentence)
2. Target users or audience
3. Key features
4. Architecture overview
5. How to run it

Write for a new developer joining the team.
```

### Review Checklist

- [ ] All four specialists completed
- [ ] No critical security issues left unreported
- [ ] Product summary is accurate
- [ ] Test status reflects reality
- [ ] Structure map includes all directories

---

## Recipe 2: PRD Builder

**Purpose**: Generate a structured Product Requirements Document from intent.

**Risk Level**: Low (generative, no execution)

**Trigger Examples**:
- "Create a PRD for X"
- "Write specs for feature Y"
- "Document this idea"

### Specialists

| Specialist | Role | Output |
|------------|------|--------|
| Intent Clarifier | Extracts core user need | Intent statement |
| Stakeholder Mapper | Identifies users and beneficiaries | User personas |
| Requirements Writer | Writes functional requirements | Requirements list |
| UX Flow Mapper | Describes user interactions | Flow descriptions |
| Acceptance Criteria Reviewer | Defines done conditions | Acceptance criteria |
| PRD Synthesizer | Produces final document | Markdown PRD |

### Copyable Prompts

**Intent Clarifier Prompt:**
```
You are an Intent Clarifier. Your task is to extract the core user need.

Ask:
1. What problem does this solve?
2. Who experiences this problem?
3. Why does it matter now?

Return a one-paragraph intent statement.
```

**Requirements Writer Prompt:**
```
You are a Requirements Writer. Your task is to write functional requirements.

Format:
1. ID: REQ-001
2. Title: Clear title
3. Description: What and why
4. Acceptance criteria: How to verify

List 5-10 requirements. Prioritize.
```

**UX Flow Mapper Prompt:**
```
You are a UX Flow Mapper. Your task is to describe user interactions.

Format:
1. User action
2. System response
3. Edge cases
4. Error states

Map the happy path and 2-3 alternate paths.
```

### Review Checklist

- [ ] Intent is clear and bounded
- [ ] User personas are identified
- [ ] Requirements are testable
- [ ] Acceptance criteria are specific
- [ ] No requirements conflict with each other

---

## Recipe 3: SEO/GEO Strategy

**Purpose**: Analyze a web presence and recommend search optimization.

**Risk Level**: Low (analysis only)

**Trigger Examples**:
- "Audit our SEO"
- "What keywords should we target?"
- "Check our search visibility"

### Specialists

| Specialist | Role | Output |
|------------|------|--------|
| Content Analyzer | Maps existing content | Content inventory |
| Keyword Researcher | Identifies target keywords | Keyword list with volume |
| Competitor Analyst | Maps competitor presence | Competitor overview |
| Technical SEO Auditor | Checks site health | Technical findings |
| Strategy Synthesizer | Produces recommendations | Strategy document |

### Copyable Prompts

**Content Analyzer Prompt:**
```
You are a Content Analyzer. Map the existing content.

Report:
1. Total pages indexed
2. Content categories
3. Content gaps
4. Thin content pages
5. Duplicate content

Prioritize by traffic.
```

**Keyword Researcher Prompt:**
```
You are a Keyword Researcher. Identify target keywords.

For each keyword:
1. Keyword phrase
2. Estimated monthly volume (low/medium/high)
3. Difficulty (easy/medium/hard)
4. Intent (informational/transactional/navigational)

Find 10 primary and 20 secondary keywords.
```

**Technical SEO Auditor Prompt:**
```
You are a Technical SEO Auditor. Check site health.

Report:
1. Core web vitals status
2. Crawl errors
3. Sitemap status
4. Robots.txt findings
5. Schema markup

Use Lighthouse and Search Console if available.
```

### Review Checklist

- [ ] Keyword list is actionable
- [ ] No critical technical issues
- [ ] Competitor analysis is current
- [ ] Recommendations are prioritized
- [ ] Content gaps identified

---

## Recipe 4: Release Readiness

**Purpose**: Verify a release is ready for production.

**Risk Level**: Medium (checks execution state)

**Trigger Examples**:
- "Is this ready to release?"
- "Release checklist"
- "Can we ship this?"

### Specialists

| Specialist | Role | Output |
|------------|------|--------|
| Build Verifier | Checks build passes | Build status |
| Test Coverage Reviewer | Checks test coverage | Coverage report |
| Dependency Auditor | Checks for vulnerabilities | Security report |
| Changelog Generator | Summarizes changes | Changelog draft |
| Release Approver | Final sign-off | Approval checklist |

### Copyable Prompts

**Build Verifier Prompt:**
```
Verify the build passes.

Run:
1. Production build command
2. Lint check
3. Type check
4. Any custom build scripts

Report pass/fail for each.
```

**Dependency Auditor Prompt:**
```
Audit dependencies for vulnerabilities.

Run:
1. npm audit / cargo audit
2. Check for known CVEs
3. Check license compliance
4. Check for unmaintained packages

Report critical items only.
```

**Changelog Generator Prompt:**
```
Generate a changelog from git history.

Format:
1. Features (new)
2. Fixes (bug fixes)
3. Changes (modifications)
4. Deprecations (breaking)

Group by PR/commit. Be concise.
```

### Review Checklist

- [ ] Build passes
- [ ] No critical vulnerabilities
- [ ] Test coverage maintained
- [ ] Changelog generated
- [ ] All items accounted for

---

## Recipe 5: Documentation Audit

**Purpose**: Audit existing documentation for completeness and accuracy.

**Risk Level**: Low (read-only)

**Trigger Examples**:
- "Audit our docs"
- "Is the README up to date?"
- "Check documentation coverage"

### Specialists

| Specialist | Role | Output |
|------------|------|--------|
| Readme Auditor | Checks README quality | README report |
| API Doc Reviewer | Checks API documentation | API coverage |
| Tutorial Mapper | Maps tutorials and guides | Tutorial inventory |
| Consistency Checker | Checks for drift | Consistency report |
| Gap Analyzer | Identifies missing docs | Gap analysis |

### Copyable Prompts

**Readme Auditor Prompt:**
```
Audit the README.

Check:
1. Does it explain what the project is?
2. Are installation instructions clear?
3. Is there a getting started guide?
4. Are run instructions up to date?
5. Is the badge section accurate?

Score: 1-5 for each. Provide specific fixes.
```

**API Doc Reviewer Prompt:**
```
Audit API documentation.

For each endpoint:
1. Description present?
2. Parameters documented?
3. Response schema shown?
4. Error codes listed?
5. Examples provided?

Mark complete/partial/missing.
```

**Gap Analyzer Prompt:**
```
Identify documentation gaps.

Check against:
1. All features documented?
2. All error states documented?
3. All configurations documented?
4. All tutorials working?

List missing items by priority.
```

### Review Checklist

- [ ] README score >= 4
- [ ] API docs >= 80% complete
- [ ] No outdated examples
- [ ] All critical gaps filled
- [ ] No drift from code

---

## Implementation Notes

### v0.2 Scope (Future)

- Add recipe selection UI in Colony
- Show specialist prompts in readable format
- Allow prompt copying to clipboard
- Link recipes to existing Colony tasks

### v0.3 Scope (Future)

- Add lightweight TypeScript types in `src/colony/swarm/types.ts`
- Add static recipe data in `src/colony/swarm/recipes.ts`
- Render recipe preview in Colony UI

### v0.4 Scope (Future) - Not planned yet

- Read-only specialist execution
- Output collection
- Synthesis

### Scope Guardrails

> Swarm v0.1 does not execute specialists. It produces visible, reviewable delegation plans that users can inspect, copy, modify, and attach to Colony tasks.

> A Swarm Recipe is not an autonomous agent network. It is a structured decomposition pattern.