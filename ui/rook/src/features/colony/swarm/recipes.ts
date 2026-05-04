import type { SwarmRecipe } from "./types";

export const REPO_REVIEW_RECIPE: SwarmRecipe = {
  id: "repo-review",
  name: "Repo Review",
  version: "1.0.0",
  purpose:
    "Inspect an existing codebase and produce a structured findings report.",
  triggerExamples: [
    "Review this repo",
    "What needs work here?",
    "Check for technical debt",
  ],
  riskLevel: "low",
  colonyMapping: {
    taskType: "review",
    seats: ["Worker"],
    handoffs: ["context"],
    evidenceRequired: true,
  },
  specialists: [
    {
      id: "repo-explorer",
      label: "Repo Explorer",
      role: "Repo Explorer",
      skills: ["file-system", "code-analysis"],
      allowedContext: ["root-dir", "git-history", "config-files"],
      disallowedContext: ["secrets", "credentials"],
      taskPrompt: `You are a Repo Explorer. Your task is to map the codebase structure.

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
- Name the next specialist who should review this output.`,
      outputContract: {
        format: "markdown",
        requiredSections: [
          "Directory structure",
          "Entry points",
          "Configuration",
          "Evidence",
        ],
        evidenceRequired: true,
        uncertaintyRequired: true,
      },
    },
    {
      id: "ci-test-inspector",
      label: "CI/Test Inspector",
      role: "CI/Test Inspector",
      skills: ["ci-cd", "testing"],
      allowedContext: ["workflows", "test-configs", "scripts"],
      disallowedContext: ["secrets"],
      taskPrompt: `You are a CI/Test Inspector. Your task is to check testing and automation.

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
- Name the next specialist who should review this output.`,
      outputContract: {
        format: "markdown",
        requiredSections: [
          "Test framework",
          "Coverage",
          "Workflows",
          "Evidence",
        ],
        evidenceRequired: true,
        uncertaintyRequired: true,
      },
    },
    {
      id: "security-reviewer",
      label: "Security Reviewer",
      role: "Security Reviewer",
      skills: ["security-audit", "secret-detection"],
      allowedContext: ["dependencies", "config"],
      disallowedContext: ["secrets", "credentials"],
      taskPrompt: `You are a Security Reviewer. Your task is to find security concerns.

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
- Name the next specialist who should review this output.`,
      outputContract: {
        format: "markdown",
        requiredSections: ["Findings", "Risk", "Evidence"],
        evidenceRequired: true,
        uncertaintyRequired: true,
      },
    },
    {
      id: "product-interpreter",
      label: "Product Interpreter",
      role: "Product Interpreter",
      skills: ["product-analysis", "documentation"],
      allowedContext: ["readme", "docs", "package-json"],
      disallowedContext: ["secrets"],
      taskPrompt: `You are a Product Interpreter. Your task is to explain what this repo does.

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
- Name the next specialist who should review this output.`,
      outputContract: {
        format: "markdown",
        requiredSections: ["Summary", "Users", "Features", "Evidence"],
        evidenceRequired: true,
        uncertaintyRequired: true,
      },
    },
  ],
  finalArtifact: {
    artifactType: "report",
    format: "markdown",
    requiredSections: ["Executive summary", "Findings", "Recommendations"],
    evidenceRequired: true,
    reviewerRequired: true,
  },
  reviewChecklist: [
    "All four specialists completed",
    "No critical security issues left unreported",
    "Product summary is accurate",
    "Test status reflects reality",
    "Structure map includes all directories",
  ],
  nonGoals: [
    "Execute code automatically",
    "Fix security issues",
    "Modify the codebase",
  ],
};

export const PRD_BUILDER_RECIPE: SwarmRecipe = {
  id: "prd-builder",
  name: "PRD Builder",
  version: "1.0.0",
  purpose: "Generate a structured Product Requirements Document from intent.",
  triggerExamples: [
    "Create a PRD for X",
    "Write specs for feature Y",
    "Document this idea",
  ],
  riskLevel: "low",
  colonyMapping: {
    taskType: "documentation",
    seats: ["Planner"],
    handoffs: ["context"],
    evidenceRequired: true,
  },
  specialists: [
    {
      id: "intent-clarifier",
      label: "Intent Clarifier",
      role: "Intent Clarifier",
      skills: ["requirements", "analysis"],
      allowedContext: ["user-input"],
      disallowedContext: [],
      taskPrompt: `You are an Intent Clarifier. Your task is to extract the core user need.

Ask:
1. What problem does this solve?
2. Who experiences this problem?
3. Why does it matter now?

Return a one-paragraph intent statement.

End with:
Evidence:
- List sources or research used.

Assumptions:
- State what you assumed about the intent.

Uncertainty:
- State what could not be verified.

Recommended handoff:
- Name the next specialist who should review this output.`,
      outputContract: {
        format: "markdown",
        requiredSections: ["Problem", "Users", "Why now"],
        evidenceRequired: true,
        uncertaintyRequired: true,
      },
    },
    {
      id: "stakeholder-mapper",
      label: "Stakeholder Mapper",
      role: "Stakeholder Mapper",
      skills: ["user-research"],
      allowedContext: ["user-input", "existing-research"],
      disallowedContext: ["secrets"],
      taskPrompt: `You are a Stakeholder Mapper. Your task is to identify users and beneficiaries.

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
- Name the next specialist who should review this output.`,
      outputContract: {
        format: "markdown",
        requiredSections: ["Stakeholders", "Evidence"],
        evidenceRequired: true,
        uncertaintyRequired: true,
      },
    },
    {
      id: "requirements-writer",
      label: "Requirements Writer",
      role: "Requirements Writer",
      skills: ["requirements", "specification"],
      allowedContext: ["intent", "stakeholders"],
      disallowedContext: [],
      taskPrompt: `You are a Requirements Writer. Your task is to write functional requirements.

Format:
1. ID: REQ-001
2. Title: Clear title
3. Description: What and why
4. Acceptance criteria: How to verify

List 5-10 requirements. Prioritize.

End with:
Evidence:
- List sources or requirements used.

Assumptions:
- State what you assumed about requirements.

Uncertainty:
- State what could not be verified.

Recommended handoff:
- Name the next specialist who should review this output.`,
      outputContract: {
        format: "markdown",
        requiredSections: ["Requirements", "Priorities"],
        evidenceRequired: true,
        uncertaintyRequired: true,
      },
    },
    {
      id: "ux-flow-mapper",
      label: "UX Flow Mapper",
      role: "UX Flow Mapper",
      skills: ["ux-design", "flows"],
      allowedContext: ["requirements"],
      disallowedContext: [],
      taskPrompt: `You are a UX Flow Mapper. Your task is to describe user interactions.

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
- Name the next specialist who should review this output.`,
      outputContract: {
        format: "markdown",
        requiredSections: ["Happy path", "Alternates", "Evidence"],
        evidenceRequired: true,
        uncertaintyRequired: true,
      },
    },
    {
      id: "acceptance-criteria-reviewer",
      label: "Acceptance Criteria Reviewer",
      role: "Acceptance Criteria Reviewer",
      skills: ["requirements", "testing"],
      allowedContext: ["requirements"],
      disallowedContext: [],
      taskPrompt: `You are an Acceptance Criteria Reviewer. Your task is to define done conditions.

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
- Name the next specialist who should review this output.`,
      outputContract: {
        format: "markdown",
        requiredSections: ["Criteria", "Evidence"],
        evidenceRequired: true,
        uncertaintyRequired: true,
      },
    },
    {
      id: "prd-synthesizer",
      label: "PRD Synthesizer",
      role: "PRD Synthesizer",
      skills: ["documentation", "synthesis"],
      allowedContext: ["all-specialist-outputs"],
      disallowedContext: [],
      taskPrompt: `You are a PRD Synthesizer. Your task is to produce the final Product Requirements Document.

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
- Name the reviewer who should approve this PRD.`,
      outputContract: {
        format: "markdown",
        requiredSections: [
          "Summary",
          "Problem",
          "Requirements",
          "Flows",
          "Criteria",
        ],
        evidenceRequired: true,
        uncertaintyRequired: true,
      },
    },
  ],
  finalArtifact: {
    artifactType: "prd",
    format: "markdown",
    requiredSections: [
      "Executive summary",
      "Requirements",
      "Acceptance criteria",
    ],
    evidenceRequired: true,
    reviewerRequired: true,
  },
  reviewChecklist: [
    "Intent is clear and bounded",
    "User personas are identified",
    "Requirements are testable",
    "Acceptance criteria are specific",
    "No requirements conflict with each other",
  ],
  nonGoals: [
    "Execute any code",
    "Create implementation",
    "Make final product decision",
  ],
};

export const SEO_STRATEGY_RECIPE: SwarmRecipe = {
  id: "seo-strategy",
  name: "SEO/GEO Strategy",
  version: "1.0.0",
  purpose: "Analyze a web presence and recommend search optimization.",
  triggerExamples: [
    "Audit our SEO",
    "What keywords should we target?",
    "Check our search visibility",
  ],
  riskLevel: "low",
  colonyMapping: {
    taskType: "analysis",
    seats: ["Worker"],
    handoffs: ["context"],
    evidenceRequired: true,
  },
  specialists: [
    {
      id: "content-analyzer",
      label: "Content Analyzer",
      role: "Content Analyzer",
      skills: ["content-audit"],
      allowedContext: ["site-content"],
      disallowedContext: ["secrets"],
      taskPrompt: `You are a Content Analyzer. Map the existing content.

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
- Name the next specialist who should review this output.`,
      outputContract: {
        format: "markdown",
        requiredSections: ["Inventory", "Gaps", "Evidence"],
        evidenceRequired: true,
        uncertaintyRequired: true,
      },
    },
    {
      id: "keyword-researcher",
      label: "Keyword Researcher",
      role: "Keyword Researcher",
      skills: ["keyword-research"],
      allowedContext: ["analytics", "search-data"],
      disallowedContext: [],
      taskPrompt: `You are a Keyword Researcher. Identify target keywords.

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
- Name the next specialist who should review this output.`,
      outputContract: {
        format: "markdown",
        requiredSections: ["Keywords", "Evidence"],
        evidenceRequired: true,
        uncertaintyRequired: true,
      },
    },
    {
      id: "competitor-analyst",
      label: "Competitor Analyst",
      role: "Competitor Analyst",
      skills: ["competitive-analysis"],
      allowedContext: ["competitor-sites"],
      disallowedContext: ["secrets"],
      taskPrompt: `You are a Competitor Analyst. Map competitor presence.

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
- Name the next specialist who should review this output.`,
      outputContract: {
        format: "markdown",
        requiredSections: ["Competitors", "Opportunities", "Evidence"],
        evidenceRequired: true,
        uncertaintyRequired: true,
      },
    },
    {
      id: "technical-seo-auditor",
      label: "Technical SEO Auditor",
      role: "Technical SEO Auditor",
      skills: ["technical-seo"],
      allowedContext: ["site-config"],
      disallowedContext: ["secrets"],
      taskPrompt: `You are a Technical SEO Auditor. Check site health.

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
- Name the next specialist who should review this output.`,
      outputContract: {
        format: "markdown",
        requiredSections: ["Technical findings", "Evidence"],
        evidenceRequired: true,
        uncertaintyRequired: true,
      },
    },
    {
      id: "strategy-synthesizer",
      label: "Strategy Synthesizer",
      role: "Strategy Synthesizer",
      skills: ["strategy", "synthesis"],
      allowedContext: ["all-specialist-outputs"],
      disallowedContext: [],
      taskPrompt: `You are a Strategy Synthesizer. Your task is to produce SEO/GEO recommendations.

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
- Name the reviewer who should approve this strategy.`,
      outputContract: {
        format: "markdown",
        requiredSections: ["Recommendations", "Timeline", "Evidence"],
        evidenceRequired: true,
        uncertaintyRequired: true,
      },
    },
  ],
  finalArtifact: {
    artifactType: "strategy",
    format: "markdown",
    requiredSections: ["Priorities", "Recommendations", "Timeline"],
    evidenceRequired: true,
    reviewerRequired: true,
  },
  reviewChecklist: [
    "Keyword list is actionable",
    "No critical technical issues",
    "Competitor analysis is current",
    "Recommendations are prioritized",
    "Content gaps identified",
  ],
  nonGoals: [
    "Execute SEO changes automatically",
    "Modify website content",
    "Guarantee rankings",
  ],
};

export const RELEASE_READINESS_RECIPE: SwarmRecipe = {
  id: "release-readiness",
  name: "Release Readiness",
  version: "1.0.0",
  purpose: "Verify a release is ready for production.",
  triggerExamples: [
    "Is this ready to release?",
    "Release checklist",
    "Can we ship this?",
  ],
  riskLevel: "medium",
  colonyMapping: {
    taskType: "verification",
    seats: ["Reviewer"],
    handoffs: ["context"],
    evidenceRequired: true,
  },
  specialists: [
    {
      id: "build-verifier",
      label: "Build Verifier",
      role: "Build Verifier",
      skills: ["build", "verification"],
      allowedContext: ["build-config"],
      disallowedContext: ["secrets", "credentials"],
      taskPrompt: `Verify the build passes.

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
- Name the next specialist who should review this output.`,
      outputContract: {
        format: "markdown",
        requiredSections: ["Build status", "Evidence"],
        evidenceRequired: true,
        uncertaintyRequired: true,
      },
    },
    {
      id: "test-coverage-reviewer",
      label: "Test Coverage Reviewer",
      role: "Test Coverage Reviewer",
      skills: ["testing", "coverage"],
      allowedContext: ["test-configs"],
      disallowedContext: ["secrets"],
      taskPrompt: `You are a Test Coverage Reviewer. Check test coverage.

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
- Name the next specialist who should review this output.`,
      outputContract: {
        format: "markdown",
        requiredSections: ["Coverage", "Gaps", "Evidence"],
        evidenceRequired: true,
        uncertaintyRequired: true,
      },
    },
    {
      id: "dependency-auditor",
      label: "Dependency Auditor",
      role: "Dependency Auditor",
      skills: ["security-audit", "dependencies"],
      allowedContext: ["dependencies"],
      disallowedContext: ["secrets", "credentials"],
      taskPrompt: `Audit dependencies for vulnerabilities.

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
- Name the next specialist who should review this output.`,
      outputContract: {
        format: "markdown",
        requiredSections: ["Vulnerabilities", "Evidence"],
        evidenceRequired: true,
        uncertaintyRequired: true,
      },
    },
    {
      id: "changelog-generator",
      label: "Changelog Generator",
      role: "Changelog Generator",
      skills: ["documentation", "git"],
      allowedContext: ["git-history"],
      disallowedContext: ["secrets"],
      taskPrompt: `Generate a changelog from git history.

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
- Name the next specialist who should review this output.`,
      outputContract: {
        format: "markdown",
        requiredSections: ["Changes", "Evidence"],
        evidenceRequired: true,
        uncertaintyRequired: true,
      },
    },
    {
      id: "release-approver",
      label: "Release Approver",
      role: "Release Approver",
      skills: ["release-management"],
      allowedContext: ["all-specialist-outputs"],
      disallowedContext: [],
      taskPrompt: `You are a Release Approver. Your task is final sign-off.

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
- Name the user or reviewer who should make the final call.`,
      outputContract: {
        format: "checklist",
        requiredSections: ["Verification", "Decision"],
        evidenceRequired: true,
        uncertaintyRequired: true,
      },
    },
  ],
  finalArtifact: {
    artifactType: "checklist",
    format: "checklist",
    requiredSections: ["Verification", "Sign-off"],
    evidenceRequired: true,
    reviewerRequired: true,
  },
  reviewChecklist: [
    "Build passes",
    "No critical vulnerabilities",
    "Test coverage maintained",
    "Changelog generated",
    "All items accounted for",
  ],
  nonGoals: ["Automatically deploy", "Release without approval", "Skip review"],
};

export const DOCS_AUDIT_RECIPE: SwarmRecipe = {
  id: "docs-audit",
  name: "Documentation Audit",
  version: "1.0.0",
  purpose: "Audit existing documentation for completeness and accuracy.",
  triggerExamples: [
    "Audit our docs",
    "Is the README up to date?",
    "Check documentation coverage",
  ],
  riskLevel: "low",
  colonyMapping: {
    taskType: "audit",
    seats: ["Worker"],
    handoffs: ["context"],
    evidenceRequired: true,
  },
  specialists: [
    {
      id: "readme-auditor",
      label: "Readme Auditor",
      role: "Readme Auditor",
      skills: ["documentation"],
      allowedContext: ["readme", "docs"],
      disallowedContext: [],
      taskPrompt: `Audit the README.

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
- Name the next specialist who should review this output.`,
      outputContract: {
        format: "markdown",
        requiredSections: ["Scores", "Fixes", "Evidence"],
        evidenceRequired: true,
        uncertaintyRequired: true,
      },
    },
    {
      id: "api-doc-reviewer",
      label: "API Doc Reviewer",
      role: "API Doc Reviewer",
      skills: ["api-documentation"],
      allowedContext: ["api-docs"],
      disallowedContext: [],
      taskPrompt: `Audit API documentation.

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
- Name the next specialist who should review this output.`,
      outputContract: {
        format: "markdown",
        requiredSections: ["Coverage", "Evidence"],
        evidenceRequired: true,
        uncertaintyRequired: true,
      },
    },
    {
      id: "tutorial-mapper",
      label: "Tutorial Mapper",
      role: "Tutorial Mapper",
      skills: ["documentation", "tutorials"],
      allowedContext: ["tutorials"],
      disallowedContext: [],
      taskPrompt: `You are a Tutorial Mapper. Map tutorials and guides.

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
- Name the next specialist who should review this output.`,
      outputContract: {
        format: "markdown",
        requiredSections: ["Tutorials", "Evidence"],
        evidenceRequired: true,
        uncertaintyRequired: true,
      },
    },
    {
      id: "consistency-checker",
      label: "Consistency Checker",
      role: "Consistency Checker",
      skills: ["documentation", "consistency"],
      allowedContext: ["docs", "code"],
      disallowedContext: ["secrets"],
      taskPrompt: `You are a Consistency Checker. Check for drift.

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
- Name the next specialist who should review this output.`,
      outputContract: {
        format: "markdown",
        requiredSections: ["Inconsistencies", "Evidence"],
        evidenceRequired: true,
        uncertaintyRequired: true,
      },
    },
    {
      id: "gap-analyzer",
      label: "Gap Analyzer",
      role: "Gap Analyzer",
      skills: ["documentation", "gap-analysis"],
      allowedContext: ["docs", "code", "features"],
      disallowedContext: [],
      taskPrompt: `Identify documentation gaps.

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
- Name the next specialist who should review this output.`,
      outputContract: {
        format: "markdown",
        requiredSections: ["Gaps", "Evidence"],
        evidenceRequired: true,
        uncertaintyRequired: true,
      },
    },
  ],
  finalArtifact: {
    artifactType: "audit",
    format: "markdown",
    requiredSections: ["Summary", "Scores", "Gaps", "Recommendations"],
    evidenceRequired: true,
    reviewerRequired: true,
  },
  reviewChecklist: [
    "README score >= 4",
    "API docs >= 80% complete",
    "No outdated examples",
    "All critical gaps filled",
    "No drift from code",
  ],
  nonGoals: [
    "Automatically fix docs",
    "Modify code",
    "Make documentation changes",
  ],
};

export const SWARM_RECIPES: SwarmRecipe[] = [
  REPO_REVIEW_RECIPE,
  PRD_BUILDER_RECIPE,
  SEO_STRATEGY_RECIPE,
  RELEASE_READINESS_RECIPE,
  DOCS_AUDIT_RECIPE,
];

export function getSwarmRecipe(id: string): SwarmRecipe | undefined {
  return SWARM_RECIPES.find((r) => r.id === id);
}
