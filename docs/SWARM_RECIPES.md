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
In v0.1, evidence is manually attached by the user. Rook does not collect specialist outputs automatically.

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

type SwarmArtifactContract = {
  artifactType: "report" | "prd" | "strategy" | "checklist" | "audit";
  format: "markdown" | "json" | "checklist";
  requiredSections: string[];
  evidenceRequired: boolean;
  reviewerRequired: boolean;
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

End with:
Evidence:
- List files, directories, or commands used.

Assumptions:
- State what you assumed about the codebase.

Uncertainty:
- State what could not be verified.

Recommended handoff:
- Name the next specialist who should review this output.
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

End with:
Evidence:
- List test files, config files, or commands used.

Assumptions:
- State what you assumed about test setup.

Uncertainty:
- State what tests could not be verified.

Recommended handoff:
- Name the next specialist who should review this output.
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

Do not claim a CVE unless supported by package audit output, advisory data, or dependency metadata.
If CVE verification is unavailable, mark it as "requires audit."

End with:
Evidence:
- List files, audit outputs, or sources used.

Assumptions:
- State what you assumed about the security context.

Uncertainty:
- State what could not be verified.

Recommended handoff:
- Name the next specialist who should review this output.
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

End with:
Evidence:
- List files, docs, or commands used.

Assumptions:
- State what you assumed about the product.

Uncertainty:
- State what could not be verified.

Recommended handoff:
- Name the next specialist who should review this output.
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

End with:
Evidence:
- List docs, mocks, or sources used.

Assumptions:
- State what you assumed about user behavior.

Uncertainty:
- State what flows could not be verified.

Recommended handoff:
- Name the next specialist who should review this output.
```

**Stakeholder Mapper Prompt:**
```
You are a Stakeholder Mapper. Your task is to identify users and beneficiaries.

For each stakeholder:
1. Who are they?
2. What is their role?
3. What is their need?
4. How do they benefit?

Identify primary and secondary stakeholders.

End with:
Evidence:
- List user interviews, surveys, or sources used.

Assumptions:
- State what you assumed about user research.

Uncertainty:
- State what stakeholders could not be verified.

Recommended handoff:
- Name the next specialist who should review this output.
```

**Acceptance Criteria Reviewer Prompt:**
```
You are an Acceptance Criteria Reviewer. Your task is to define done conditions.

For each requirement:
1. Requirement ID
2. Clear, testable condition
3. Pass/fail criteria

Ensure criteria are:
- Specific
- Measurable
- Achievable
- Relevant
- Time-bound

End with:
Evidence:
- List requirements documents or sources used.

Assumptions:
- State what you assumed about criteria.

Uncertainty:
- State what criteria could not be verified.

Recommended handoff:
- Name the next specialist who should review this output.
```

**PRD Synthesizer Prompt:**
```
You are a PRD Synthesizer. Your task is to produce the final Product Requirements Document.

Produce a Markdown PRD with:
1. Executive summary
2. Problem statement
3. Stakeholders
4. Requirements (by priority)
5. User flows
6. Acceptance criteria
7. Out of scope
8. Assumptions
9. Risks

End with:
Evidence:
- List all specialist outputs used.

Assumptions:
- State any assumptions made during synthesis.

Uncertainty:
- State what could not be verified.

Recommended handoff:
- Name the reviewer who should approve this PRD.
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

End with:
Evidence:
- List pages, tools, or sources used.

Assumptions:
- State what you assumed about content.

Uncertainty:
- State what could not be verified.

Recommended handoff:
- Name the next specialist who should review this output.
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

End with:
Evidence:
- List tools, reports, or sources used.

Assumptions:
- State what you assumed about technical setup.

Uncertainty:
- State what could not be verified.

Recommended handoff:
- Name the next specialist who should review this output.
```

**Keyword Researcher Prompt:**
```
You are a Keyword Researcher. Identify target keywords.

For each keyword:
1. Keyword phrase
2. Estimated monthly volume (low/medium/high) - mark source confidence
3. Difficulty (easy/medium/hard)
4. Intent (informational/transactional/navigational)

For each keyword, mark source confidence:
- Verified: from tool/source data
- Estimated: reasoned approximation
- Unknown: not enough evidence

Suggest up to 10 primary and up to 20 secondary keywords. Do not invent volume numbers without a source.

End with:
Evidence:
- List tools, sources, or data used.

Assumptions:
- State what you assumed about keyword data.

Uncertainty:
- State what could not be verified.

Recommended handoff:
- Name the next specialist who should review this output.
```

**Competitor Analyst Prompt:**
```
You are a Competitor Analyst. Map competitor presence.

For each competitor:
1. Competitor name
2. Key pages
3. Keyword presence
4. Content gaps compared to us

Report in this format:
1. Competitor overview
2. Keyword overlap
3. Content opportunities

End with:
Evidence:
- List sources or tools used.

Assumptions:
- State what you assumed about competitor research.

Uncertainty:
- State what competitors could not be verified.

Recommended handoff:
- Name the next specialist who should review this output.
```

**Strategy Synthesizer Prompt:**
```
You are a Strategy Synthesizer. Your task is to produce SEO/GEO recommendations.

Produce a strategy document with:
1. Priority keywords
2. Content recommendations
3. Technical fixes
4. Timeline

Prioritize by impact and effort.

End with:
Evidence:
- List all specialist outputs used.

Assumptions:
- State any assumptions made.

Uncertainty:
- State what could not be verified.

Recommended handoff:
- Name the reviewer who should approve this strategy.
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

If manually approved by the user, run or request the following checks.
If execution is not available, report the exact commands the user should run.
Do not execute commands without explicit approval.

Commands to verify:
1. Production build command
2. Lint check
3. Type check
4. Any custom build scripts

Report pass/fail for each.

End with:
Evidence:
- List commands run or suggested.

Assumptions:
- State what you assumed about the build.

Uncertainty:
- State what could not be verified.

Recommended handoff:
- Name the next specialist who should review this output.
```

**Test Coverage Reviewer Prompt:**
```
You are a Test Coverage Reviewer. Check test coverage.

If manually approved, run or request:
1. Test coverage report
2. Failed tests
3. Skipped tests

Report in this format:
1. Coverage percentage
2. Low coverage areas
3. Critical missing tests

Do not run tests without explicit approval.

End with:
Evidence:
- List test reports or sources used.

Assumptions:
- State what you assumed about test setup.

Uncertainty:
- State what could not be verified.

Recommended handoff:
- Name the next specialist who should review this output.
```

**Dependency Auditor Prompt:**
```
Audit dependencies for vulnerabilities.

If manually approved, run or request:
1. npm audit / cargo audit
2. Check for known CVEs
3. Check license compliance
4. Check for unmaintained packages

Report critical items only.

Do not claim a CVE unless supported by package audit output, advisory data, or dependency metadata.
If CVE verification is unavailable, mark it as "requires audit."

Do not run security scans without explicit approval.

End with:
Evidence:
- List audit outputs or sources used.

Assumptions:
- State what you assumed about dependencies.

Uncertainty:
- State what could not be verified.

Recommended handoff:
- Name the next specialist who should review this output.
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

End with:
Evidence:
- List commits or PRs used.

Assumptions:
- State what you assumed about the changelog.

Uncertainty:
- State what could not be verified.

Recommended handoff:
- Name the next specialist who should review this output.
```

**Release Approver Prompt:**
```
You are a Release Approver. Your task is final sign-off.

Review all specialist outputs and verify:
1. Build passed
2. Tests passed
3. No critical vulnerabilities
4. Changelog complete

Produce an approval checklist with:
1. Items verified (Y/N)
2. Risky items remaining
3. Final decision: approve / reject / needs work

End with:
Evidence:
- List all specialist outputs reviewed.

Assumptions:
- State what you assumed.

Uncertainty:
- State any open items.

Recommended handoff:
- Name the user or reviewer who should make the final call.
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

End with:
Evidence:
- List README sections reviewed.

Assumptions:
- State what you assumed about the docs.

Uncertainty:
- State what could not be verified.

Recommended handoff:
- Name the next specialist who should review this output.
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

End with:
Evidence:
- List API docs reviewed.

Assumptions:
- State what you assumed about API coverage.

Uncertainty:
- State what endpoints could not be verified.

Recommended handoff:
- Name the next specialist who should review this output.
```

**Tutorial Mapper Prompt:**
```
You are a Tutorial Mapper. Map tutorials and guides.

For each tutorial:
1. Title
2. Topic
3. Completeness (complete/partial/outdated)
4. Working status (verified/needs test/unknown)

End with:
Evidence:
- List tutorials reviewed.

Assumptions:
- State what you assumed about tutorials.

Uncertainty:
- State what tutorials could not be verified.

Recommended handoff:
- Name the next specialist who should review this output.
```

**Consistency Checker Prompt:**
```
You are a Consistency Checker. Check for drift.

Check:
1. Code vs. docs naming
2. API vs. documentation
3. Examples vs. actual behavior

Report inconsistencies found.

End with:
Evidence:
- List files or comparisons made.

Assumptions:
- State what you assumed about consistency.

Uncertainty:
- State what could not be verified.

Recommended handoff:
- Name the next specialist who should review this output.
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

End with:
Evidence:
- List files or areas audited.

Assumptions:
- State what you assumed about gaps.

Uncertainty:
- State what could not be verified.

Recommended handoff:
- Name the next specialist who should review this output.
```

### Review Checklist

- [ ] README score >= 4
- [ ] API docs >= 80% complete
- [ ] No outdated examples
- [ ] All critical gaps filled
- [ ] No drift from code

---

## Editable Plans, Immutable Recipes

A Swarm Recipe is a versioned, read-only template. A Swarm Plan is the task-specific instance generated from that template.

### Mental Model

| Concept | Analogy | Behavior |
|---------|--------|--------|
| Recipe | Cookbook recipe | Canonical, versioned, read-only |
| Plan | Today's cooking plan | Editable instance generated from a recipe |
| Assignment | Each cook's job | Editable specialist task inside the plan |
| Evidence | What actually happened | Output linked to activity |

### Plan Schema

```typescript
type SwarmPlan = {
  id: string;
  recipeId: string;
  recipeVersion: string;
  userIntent: string;
  status: "draft" | "approved" | "tasks_created" | "prompts_copied" | "reviewed";
  editable: boolean;
  assignments: SwarmAssignment[];
  changesFromRecipe: SwarmPlanChange[];
};

type SwarmAssignment = {
  id: string;
  specialistId: string;
  label: string;
  role: string;
  taskPrompt: string;
  contextPacket: ContextPacket;
  outputContract: {
    format: "markdown" | "json" | "checklist";
    requiredSections: string[];
    evidenceRequired: boolean;
    uncertaintyRequired: boolean;
  };
  enabled: boolean;
  order: number;
};

type SwarmPlanChange = {
  field: string;
  previousValue: string;
  newValue: string;
  reason?: string;
  changedBy: "user" | "rook_suggestion";
};
```

### Core Rules

1. **Canonical recipes are read-only.** Users edit generated plans, not base recipes.
2. **Every edit is visible before approval.** No silent mutations.
3. **Every edit is recorded as a plan change.** Enables diff view.
4. **Rook may suggest changes, but user approval is required.** No automatic recipe mutation.
5. **No plan adjustment can execute specialists automatically.**

### Examples of Plan Editing

Generate a plan from "Repo Review" recipe:

```
Plan:
  - Repo Explorer
  - CI/Test Inspector
  - Security Reviewer
  - Product Interpreter
```

User can then edit:

```
Remove: Product Interpreter
Add: Rust Dependency Auditor (if Cargo project)
Rename: Security Reviewer → Supply Chain Reviewer
Reorder: Move CI/Test before Security
Modify prompt: Make Security Reviewer check for leaked keys first
```

### Roadmap: Editable Plans

| Version | Feature |
|---------|---------|
| v0.2 | Editable plan after recipe selection |
| v0.3 | Recipe-to-plan diff view |
| v0.4 | Codebase-aware suggestions (e.g., "This is Rust, add Cargo Auditor?") |
| v0.5 | Save custom recipes (fork into personal template) |

### Scope Guardrails

> Rook may suggest plan adjustments, but user approval is required.
> No recipe adjustment can execute specialists automatically.
> Canonical recipes are immutable. Plans are editable.

---

## Implementation Notes

### v0.2 Scope (Next)

- Add recipe selection UI in Colony
- Generate editable Swarm Plans from canonical recipes
- Allow specialist assignment edits before approval (add, remove, reorder, disable, edit prompts)
- Show specialist prompts in readable format
- Allow prompt copying to clipboard
- Record plan changes from the base recipe
- Link plans to existing Colony tasks

### v0.3 Scope (Future)

- Render recipe preview in Colony UI
- Show recipe-to-plan diff view
- Codebase-aware suggestions (e.g., "This is Rust, add Cargo Auditor?")

### v0.4 Scope (Future) - Not planned yet

- Read-only specialist execution
- Output collection
- Synthesis

### Scope Guardrails

> Swarm v0.1 does not execute specialists. It produces visible, reviewable delegation plans that users can inspect, copy, modify, and attach to Colony tasks.

> A Swarm Recipe is not an autonomous agent network. It is a structured decomposition pattern.
