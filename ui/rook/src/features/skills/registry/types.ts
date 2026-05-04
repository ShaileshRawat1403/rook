export type SkillCategory = "prompt" | "context" | "action";
export type RiskLevel = "low" | "medium" | "high";

export interface RookSkill {
  id: string;
  name: string;
  description: string;
  category: SkillCategory;
  triggerExamples: string[];
  requiredContext: string[];
  outputContract: string;
  riskLevel: RiskLevel;
  approvalRequired: boolean;
  evidenceEvents: string[];
  promptTemplate?: string;
}
