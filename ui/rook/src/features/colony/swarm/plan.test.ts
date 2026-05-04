import { describe, it, expect, beforeEach } from "vitest";
import type { SwarmPlan, SwarmAssignment, SwarmPlanEditResult } from "./types";
import { createSwarmPlan, disableAssignment, enableAssignment, updateAssignmentPrompt, reorderAssignments, addAssignment, removeAssignment, approvePlan, markPromptsCopied, getEnabledAssignments } from "./plan";

function createMockAssignment(id: string, role: string, order: number, enabled = true): SwarmAssignment {
  return {
    id,
    specialistId: id,
    label: role,
    role,
    taskPrompt: `Task prompt for ${role}`,
    contextPacket: {
      sourceTaskId: "",
      sourceArtifacts: [],
      summary: "",
      includedContext: [],
      excludedContext: [],
      budget: { maxTokens: 8000, priority: "medium" as const },
    },
    outputContract: {
      format: "markdown" as const,
      requiredSections: ["Summary"],
      evidenceRequired: true,
      uncertaintyRequired: true,
    },
    enabled,
    order,
  };
}

describe("Swarm Plan Functions", () => {
  let plan: SwarmPlan;

  beforeEach(() => {
    plan = createSwarmPlan(
      "repo-review",
      "1.0.0",
      "Review this repo",
      [
        createMockAssignment("spec-1", "Explorer", 0),
        createMockAssignment("spec-2", "Inspector", 1),
        createMockAssignment("spec-3", "Reviewer", 2),
      ],
    );
  });

  const getError = (result: SwarmPlanEditResult): string | undefined => {
    return "error" in result ? result.error : undefined;
  };

  const isSuccess = (result: SwarmPlanEditResult): boolean => {
    return "change" in result && result.change !== null;
  };

  describe("createSwarmPlan", () => {
    it("keeps recipeId and recipeVersion", () => {
      expect(plan.recipeId).toBe("repo-review");
      expect(plan.recipeVersion).toBe("1.0.0");
    });

    it("starts as draft", () => {
      expect(plan.status).toBe("draft");
    });

    it("starts as editable", () => {
      expect(plan.editable).toBe(true);
    });

    it("preserves all assignments", () => {
      expect(plan.assignments.length).toBe(3);
    });

    it("starts with no changes", () => {
      expect(plan.changesFromRecipe.length).toBe(0);
    });

    it("does not share assignment references", () => {
      const originalId = plan.assignments[0].id;
      plan.assignments[0].id = "mutated";
      expect(plan.assignments[0].id).not.toBe(originalId);
    });
  });

  describe("disableAssignment", () => {
    it("disables the assignment", () => {
      const result = disableAssignment(plan, plan.assignments[1].id);
      expect(isSuccess(result)).toBe(true);
      const assignment = result.plan.assignments.find((a) => a.id === plan.assignments[1].id);
      expect(assignment?.enabled).toBe(false);
    });

    it("records a plan change on success", () => {
      const result = disableAssignment(plan, plan.assignments[1].id);
      expect(isSuccess(result)).toBe(true);
      expect("change" in result && result.change?.field).toBe("enabled");
    });

    it("returns error if plan not editable", () => {
      const approved = approvePlan(plan);
      const result = disableAssignment(approved, plan.assignments[1].id);
      expect(getError(result)).toBe("Plan is not editable");
    });

    it("returns error if assignment not found", () => {
      const result = disableAssignment(plan, "unknown-id");
      expect(getError(result)).toBe("Assignment not found");
    });
  });

  describe("enableAssignment", () => {
    it("enables the assignment", () => {
      const disabled = disableAssignment(plan, plan.assignments[1].id).plan;
      const result = enableAssignment(disabled, plan.assignments[1].id);
      expect(isSuccess(result)).toBe(true);
      const assignment = result.plan.assignments.find((a) => a.id === plan.assignments[1].id);
      expect(assignment?.enabled).toBe(true);
    });

    it("returns error if plan not editable", () => {
      const approved = approvePlan(plan);
      const result = enableAssignment(approved, plan.assignments[1].id);
      expect(getError(result)).toBe("Plan is not editable");
    });
  });

  describe("updateAssignmentPrompt", () => {
    it("updates the prompt", () => {
      const newPrompt = "Custom prompt for Explorer";
      const result = updateAssignmentPrompt(plan, plan.assignments[0].id, newPrompt);
      expect(isSuccess(result)).toBe(true);
      const assignment = result.plan.assignments.find((a) => a.id === plan.assignments[0].id);
      expect(assignment?.taskPrompt).toBe(newPrompt);
    });

    it("preserves previous value for diff", () => {
      const originalPrompt = plan.assignments[0].taskPrompt;
      const result = updateAssignmentPrompt(plan, plan.assignments[0].id, "New prompt");
      expect(isSuccess(result)).toBe(true);
      expect("change" in result && result.change?.previousValue).toBe(originalPrompt);
    });

    it("returns error if plan not editable", () => {
      const approved = approvePlan(plan);
      const result = updateAssignmentPrompt(approved, plan.assignments[0].id, "New prompt");
      expect(getError(result)).toBe("Plan is not editable");
    });
  });

  describe("reorderAssignments", () => {
    it("reorders assignments", () => {
      const ids = [plan.assignments[2].id, plan.assignments[0].id, plan.assignments[1].id];
      const result = reorderAssignments(plan, ids);
      expect(isSuccess(result)).toBe(true);
      expect(result.plan.assignments[0].id).toBe(ids[0]);
      expect(result.plan.assignments[1].id).toBe(ids[1]);
      expect(result.plan.assignments[2].id).toBe(ids[2]);
    });

    it("updates order values", () => {
      const ids = [plan.assignments[2].id, plan.assignments[0].id, plan.assignments[1].id];
      const result = reorderAssignments(plan, ids);
      expect(isSuccess(result)).toBe(true);
      expect(result.plan.assignments[0].order).toBe(0);
      expect(result.plan.assignments[1].order).toBe(1);
      expect(result.plan.assignments[2].order).toBe(2);
    });

    it("rejects missing IDs", () => {
      const result = reorderAssignments(plan, [plan.assignments[0].id, plan.assignments[1].id]);
      expect(getError(result)).toContain("must include all assignments");
    });

    it("rejects unknown IDs", () => {
      const result = reorderAssignments(plan, [plan.assignments[0].id, plan.assignments[1].id, "unknown-id"]);
      expect(getError(result)).toContain("Unknown assignment ID");
    });

    it("returns error if plan not editable", () => {
      const approved = approvePlan(plan);
      const ids = [approved.assignments[2].id, approved.assignments[0].id, approved.assignments[1].id];
      const result = reorderAssignments(approved, ids);
      expect(getError(result)).toBe("Plan is not editable");
    });
  });

  describe("addAssignment", () => {
    it("adds new assignment", () => {
      const newAssignment = createMockAssignment("spec-4", "NewSpecialist", 3);
      const result = addAssignment(plan, newAssignment);
      expect(isSuccess(result)).toBe(true);
      expect(result.plan.assignments.length).toBe(4);
    });

    it("sets order to max + 1", () => {
      const newAssignment = createMockAssignment("spec-4", "NewSpecialist", 0);
      const result = addAssignment(plan, newAssignment);
      expect(isSuccess(result)).toBe(true);
      const added = result.plan.assignments.find((a) => a.specialistId === "spec-4");
      expect(added?.order).toBe(3);
    });

    it("rejects duplicate ID", () => {
      const newAssignment = createMockAssignment(plan.assignments[0].id, "Duplicate", 0);
      const result = addAssignment(plan, newAssignment);
      expect(getError(result)).toBe("Assignment ID already exists");
    });

    it("returns error if plan not editable", () => {
      const approved = approvePlan(plan);
      const newAssignment = createMockAssignment("spec-4", "New", 0);
      const result = addAssignment(approved, newAssignment);
      expect(getError(result)).toBe("Plan is not editable");
    });
  });

  describe("removeAssignment", () => {
    it("removes assignment", () => {
      const result = removeAssignment(plan, plan.assignments[1].id);
      expect(isSuccess(result)).toBe(true);
      expect(result.plan.assignments.length).toBe(2);
      expect(result.plan.assignments.find((a) => a.id === plan.assignments[1].id)).toBeUndefined();
    });

    it("returns error if not found", () => {
      const result = removeAssignment(plan, "unknown-id");
      expect(getError(result)).toBe("Assignment not found");
    });

    it("returns error if plan not editable", () => {
      const approved = approvePlan(plan);
      const result = removeAssignment(approved, plan.assignments[1].id);
      expect(getError(result)).toBe("Plan is not editable");
    });
  });

  describe("approvePlan", () => {
    it("changes status to approved", () => {
      const approved = approvePlan(plan);
      expect(approved.status).toBe("approved");
    });

    it("makes plan non-editable", () => {
      const approved = approvePlan(plan);
      expect(approved.editable).toBe(false);
    });
  });

  describe("markPromptsCopied", () => {
    it("changes status to prompts_copied when approved", () => {
      const approved = approvePlan(plan);
      const result = markPromptsCopied(approved);
      expect(isSuccess(result)).toBe(true);
      expect(result.plan.status).toBe("prompts_copied");
    });

    it("returns error if not approved", () => {
      const result = markPromptsCopied(plan);
      expect(getError(result)).toBe("Plan must be approved before copying prompts");
    });
  });

  describe("getEnabledAssignments", () => {
    it("returns only enabled assignments", () => {
      const disabled = disableAssignment(plan, plan.assignments[1].id).plan;
      const enabled = getEnabledAssignments(disabled);
      expect(enabled.length).toBe(2);
      expect(enabled.find((a) => a.id === plan.assignments[1].id)).toBeUndefined();
    });

    it("sorts by order", () => {
      const ids = [plan.assignments[2].id, plan.assignments[0].id, plan.assignments[1].id];
      const reordered = reorderAssignments(plan, ids).plan;
      const enabled = getEnabledAssignments(reordered);
      expect(enabled[0].id).toBe(ids[0]);
      expect(enabled[1].id).toBe(ids[1]);
      expect(enabled[2].id).toBe(ids[2]);
    });
  });

  describe("Original plan is not mutated", () => {
    it("disabling does not affect original", () => {
      disableAssignment(plan, plan.assignments[1].id);
      const original = plan.assignments.find((a) => a.id === plan.assignments[1].id);
      expect(original?.enabled).toBe(true);
    });

    it("editing does not affect original", () => {
      updateAssignmentPrompt(plan, plan.assignments[0].id, "New");
      const original = plan.assignments.find((a) => a.id === plan.assignments[0].id);
      expect(original?.taskPrompt).not.toBe("New");
    });
  });
});
