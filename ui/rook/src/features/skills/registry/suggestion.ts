import { RookSkill } from "./types";
import { BUILTIN_SKILLS } from "./builtinSkills";

type SkillRules = Record<string, string[]>;

// A simple rule-based engine that maps keywords to skill IDs.
const SUGGESTION_RULES: SkillRules = {
  "commit-risk-review": ["commit", "diff", "change", "risk"],
  "jira-commit-trace": ["jira", "ticket"],
  "prd-builder": ["prd", "requirement", "spec", "idea", "product plan"],
  "repo-explorer": ["repo", "explore", "structure", "architecture"],
  "stakeholder-summary": ["boss", "manager", "stakeholder", "non-technical"],
  "reviewer-checklist": ["checklist", "review", "merge"],
  "release-readiness": ["release", "ship", "readiness", "production"],
  "handoff-builder": ["handoff", "reviewer", "leave off", "summary for next"],
};

export function suggestSkills(userIntent: string): RookSkill[] {
  if (!userIntent || userIntent.trim() === "") {
    return [];
  }

  const intentLower = userIntent.toLowerCase();
  const suggestedIds = new Set<string>();

  for (const [skillId, keywords] of Object.entries(SUGGESTION_RULES)) {
    for (const keyword of keywords) {
      if (intentLower.includes(keyword.toLowerCase())) {
        suggestedIds.add(skillId);
        break; // Match found for this skill, move to the next skill
      }
    }
  }

  // Map matched IDs back to full skill objects
  const suggestions = Array.from(suggestedIds)
    .map(id => BUILTIN_SKILLS.find(skill => skill.id === id))
    .filter((skill): skill is RookSkill => skill !== undefined);

  // Return up to 3 relevant skills
  return suggestions.slice(0, 3);
}
