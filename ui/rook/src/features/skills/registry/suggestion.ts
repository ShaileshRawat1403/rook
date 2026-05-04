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

export interface SkillSuggestion {
  skill: RookSkill;
  whySuggested: string;
}

export function suggestSkills(userIntent: string): SkillSuggestion[] {
  if (!userIntent || userIntent.trim() === "") {
    return [];
  }

  const intentLower = userIntent.toLowerCase();
  const suggestions: SkillSuggestion[] = [];
  const seenIds = new Set<string>();

  for (const [skillId, keywords] of Object.entries(SUGGESTION_RULES)) {
    for (const keyword of keywords) {
      if (intentLower.includes(keyword.toLowerCase())) {
        if (!seenIds.has(skillId)) {
          const skill = BUILTIN_SKILLS.find(s => s.id === skillId);
          if (skill) {
            seenIds.add(skillId);
            suggestions.push({
              skill,
              whySuggested: `Your request mentions "${keyword}".`,
            });
          }
        }
        break; // Move to next skill rule
      }
    }
  }

  // Return up to 3 relevant skills
  return suggestions.slice(0, 3);
}
