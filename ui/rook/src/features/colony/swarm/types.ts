export type SwarmRiskLevel = "low" | "medium" | "high";

export type SwarmOutputFormat = "markdown" | "json" | "checklist";

export type SwarmPlanStatus =
  | "draft"
  | "approved"
  | "tasks_created"
  | "prompts_copied"
  | "reviewed";

export type SwarmChangeOrigin = "user" | "rook_suggestion";

export type SwarmColonyMapping = {
  taskType: string;
  seats: string[];
  handoffs: string[];
  evidenceRequired: boolean;
};

export type SwarmOutputContract = {
  format: SwarmOutputFormat;
  requiredSections: string[];
  evidenceRequired: boolean;
  uncertaintyRequired: boolean;
};

export type SwarmSpecialist = {
  id: string;
  label: string;
  role: string;
  skills: string[];
  allowedContext: string[];
  disallowedContext: string[];
  taskPrompt: string;
  outputContract: SwarmOutputContract;
};

export type SwarmArtifactContract = {
  artifactType:
    | "report"
    | "prd"
    | "strategy"
    | "checklist"
    | "audit"
    | "sow";
  format: SwarmOutputFormat;
  requiredSections: string[];
  evidenceRequired: boolean;
  reviewerRequired: boolean;
};

export type SwarmContextBudget = {
  maxTokens: number;
  priority: "low" | "medium" | "high";
};

export type ContextPacket = {
  sourceTaskId: string;
  sourceArtifacts: string[];
  summary: string;
  includedContext: string[];
  excludedContext: string[];
  budget: SwarmContextBudget;
};

export interface SwarmRecipe {
  id: string;
  name: string;
  version: string;
  purpose: string;
  triggerExamples: string[];
  riskLevel: SwarmRiskLevel;
  colonyMapping: SwarmColonyMapping;
  specialists: SwarmSpecialist[];
  finalArtifact: SwarmArtifactContract;
  reviewChecklist: string[];
  nonGoals: string[];
}

export interface SwarmPlanChange {
  field: string;
  previousValue: string;
  newValue: string;
  reason?: string;
  changedBy: SwarmChangeOrigin;
}

export interface SwarmAssignment {
  id: string;
  specialistId: string;
  label: string;
  role: string;
  taskPrompt: string;
  contextPacket: ContextPacket;
  outputContract: SwarmOutputContract;
  enabled: boolean;
  order: number;
}

export interface SwarmPlan {
  id: string;
  recipeId: string;
  recipeVersion: string;
  userIntent: string;
  status: SwarmPlanStatus;
  editable: boolean;
  assignments: SwarmAssignment[];
  changesFromRecipe: SwarmPlanChange[];
}

export type SwarmPlanEditResult =
  | {
      plan: SwarmPlan;
      change: SwarmPlanChange;
    }
  | {
      plan: SwarmPlan;
      change: null;
      error: string;
    };

export function createSwarmPlan(
  recipe: SwarmRecipe,
  userIntent: string,
): SwarmPlan {
  return {
    id: crypto.randomUUID(),
    recipeId: recipe.id,
    recipeVersion: recipe.version,
    userIntent,
    status: "draft",
    editable: true,
    assignments: recipe.specialists.map((specialist, index) => ({
      id: crypto.randomUUID(),
      specialistId: specialist.id,
      label: specialist.role,
      role: specialist.role,
      taskPrompt: specialist.taskPrompt,
      contextPacket: {
        sourceTaskId: "",
        sourceArtifacts: [],
        summary: "",
        includedContext: specialist.allowedContext,
        excludedContext: specialist.disallowedContext,
        budget: {
          maxTokens: 8000,
          priority: "medium",
        },
      },
      outputContract: specialist.outputContract,
      enabled: true,
      order: index,
    })),
    changesFromRecipe: [],
  };
}
