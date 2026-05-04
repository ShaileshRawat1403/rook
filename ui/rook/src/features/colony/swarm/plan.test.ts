import { describe, it, expect, beforeEach } from "vitest";
import type { SwarmPlan, SwarmAssignment } from "./types";
import {
  createSwarmPlan,
  disableAssignment,
  enableAssignment,
  updateAssignmentPrompt,
  reorderAssignments,
  addAssignment,
  removeAssignment,
  approvePlan,
  markPromptsCopied,
  getEnabledAssignments,
} from "./plan";

function createMockAssignment(
  id: string,
  role: string,
  order: number,
  enabled = true,
): SwarmAssignment {
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
      budget: { maxTokens: 8000, priority: "medium" },
    },
    outputContract: {
      format: "markdown",
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
    plan = createSwarmPlan("repo-review", "1.0.0", "Review this repo", [
      createMockAssignment("spec-1", "Explorer", 0),
      createMockAssignment("spec-2", "Inspector", 1),
      createMockAssignment("spec-3", "Reviewer", 2),
    ]);
  });

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
  });

  describe("disableAssignment", () => {
    it("disables the assignment", () => {
      const { plan: updated } = disableAssignment(plan, "spec-2");
      const assignment = updated.assignments.find((a) => a.id === "spec-2");
      expect(assignment?.enabled).toBe(false);
    });

    it("records a plan change", () => {
      const { change } = disableAssignment(plan, "spec-2");
      expect(change.field).toBe("enabled");
      expect(change.newValue).toBe("false");
      expect(change.changedBy).toBe("user");
    });

    it("adds change to plan", () => {
      const { plan: updated } = disableAssignment(plan, "spec-2");
      expect(updated.changesFromRecipe.length).toBe(1);
    });
  });

  describe("enableAssignment", () => {
    it("enables the assignment", () => {
      const { plan: updated } = enableAssignment(plan, "spec-2");
      const assignment = updated.assignments.find((a) => a.id === "spec-2");
      expect(assignment?.enabled).toBe(true);
    });

    it("records a plan change", () => {
      const { change } = enableAssignment(plan, "spec-2");
      expect(change.field).toBe("enabled");
      expect(change.newValue).toBe("true");
      expect(change.changedBy).toBe("user");
    });
  });

  describe("updateAssignmentPrompt", () => {
    it("updates the prompt", () => {
      const newPrompt = "Custom prompt for Explorer";
      const { plan: updated } = updateAssignmentPrompt(
        plan,
        "spec-1",
        newPrompt,
      );
      const assignment = updated.assignments.find((a) => a.id === "spec-1");
      expect(assignment?.taskPrompt).toBe(newPrompt);
    });

    it("records a plan change", () => {
      const { change } = updateAssignmentPrompt(plan, "spec-1", "New prompt");
      expect(change.field).toBe("taskPrompt");
      expect(change.changedBy).toBe("user");
    });

    it("preserves previous value for diff", () => {
      const originalPrompt = plan.assignments[0].taskPrompt;
      const { change } = updateAssignmentPrompt(plan, "spec-1", "New prompt");
      expect(change.previousValue).toBe(originalPrompt);
    });
  });

  describe("reorderAssignments", () => {
    it("reorders assignments", () => {
      const { plan: updated } = reorderAssignments(plan, [
        "spec-3",
        "spec-1",
        "spec-2",
      ]);
      expect(updated.assignments[0].id).toBe("spec-3");
      expect(updated.assignments[1].id).toBe("spec-1");
      expect(updated.assignments[2].id).toBe("spec-2");
    });

    it("updates order values", () => {
      const { plan: updated } = reorderAssignments(plan, [
        "spec-3",
        "spec-1",
        "spec-2",
      ]);
      expect(updated.assignments[0].order).toBe(0);
      expect(updated.assignments[1].order).toBe(1);
      expect(updated.assignments[2].order).toBe(2);
    });

    it("records a plan change", () => {
      const { change } = reorderAssignments(plan, [
        "spec-3",
        "spec-1",
        "spec-2",
      ]);
      expect(change.field).toBe("order");
      expect(change.changedBy).toBe("user");
    });
  });

  describe("addAssignment", () => {
    it("adds new assignment", () => {
      const newAssignment = createMockAssignment("spec-4", "NewSpecialist", 3);
      const { plan: updated } = addAssignment(plan, newAssignment);
      expect(updated.assignments.length).toBe(4);
    });

    it("sets order to max + 1", () => {
      const newAssignment = createMockAssignment("spec-4", "NewSpecialist", 0);
      const { plan: updated } = addAssignment(plan, newAssignment);
      const added = updated.assignments.find((a) => a.id === "spec-4");
      expect(added?.order).toBe(3);
    });

    it("records a plan change", () => {
      const newAssignment = createMockAssignment("spec-4", "NewSpecialist", 0);
      const { change } = addAssignment(plan, newAssignment);
      expect(change.field).toBe("assignments");
      expect(change.newValue).toBe("spec-4");
    });
  });

  describe("removeAssignment", () => {
    it("removes assignment", () => {
      const { plan: updated } = removeAssignment(plan, "spec-2");
      expect(updated.assignments.length).toBe(2);
      expect(
        updated.assignments.find((a) => a.id === "spec-2"),
      ).toBeUndefined();
    });

    it("records a plan change", () => {
      const { change } = removeAssignment(plan, "spec-2");
      expect(change.field).toBe("assignments");
      expect(change.previousValue).toBe("spec-2");
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
    it("changes status to prompts_copied", () => {
      const copied = markPromptsCopied(plan);
      expect(copied.status).toBe("prompts_copied");
    });
  });

  describe("getEnabledAssignments", () => {
    it("returns only enabled assignments", () => {
      const { plan: disabled } = disableAssignment(plan, "spec-2");
      const enabled = getEnabledAssignments(disabled);
      expect(enabled.length).toBe(2);
      expect(enabled.find((a) => a.id === "spec-2")).toBeUndefined();
    });

    it("sorts by order", () => {
      const { plan: reordered } = reorderAssignments(plan, [
        "spec-3",
        "spec-1",
        "spec-2",
      ]);
      const enabled = getEnabledAssignments(reordered);
      expect(enabled[0].id).toBe("spec-3");
      expect(enabled[1].id).toBe("spec-1");
      expect(enabled[2].id).toBe("spec-2");
    });
  });

  describe("Original recipe is not mutated", () => {
    it("disabling does not affect original", () => {
      disableAssignment(plan, "spec-2");
      const originalSpec2 = plan.assignments.find((a) => a.id === "spec-2");
      expect(originalSpec2?.enabled).toBe(true);
    });
  });
});
