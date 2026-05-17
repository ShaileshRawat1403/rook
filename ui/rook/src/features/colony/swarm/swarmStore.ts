import { create } from "zustand";
import type { SwarmPlan, SwarmRecipe, SwarmAssignment } from "./types";
import {
  createSwarmPlan as createPlan,
  disableAssignment,
  enableAssignment,
  updateAssignmentPrompt,
  reorderAssignments,
  addAssignment,
  removeAssignment,
  approvePlan,
  markPromptsCopied,
} from "./plan";
import type { SwarmPlanEditResult } from "./types";

const getError = (result: SwarmPlanEditResult): string | undefined => {
  return "error" in result ? result.error : undefined;
};

interface SwarmStoreState {
  selectedRecipe: SwarmRecipe | null;
  currentPlan: SwarmPlan | null;
  error: string | null;
}

type SwarmStore = SwarmStoreState & {
  selectRecipe: (recipe: SwarmRecipe) => void;
  clearSelection: () => void;
  generatePlan: (userIntent: string) => void;
  toggleAssignment: (assignmentId: string) => void;
  updatePrompt: (assignmentId: string, newPrompt: string) => void;
  reorder: (orderedIds: string[]) => void;
  addSpecialist: (assignment: SwarmAssignment) => void;
  removeSpecialist: (assignmentId: string) => void;
  approve: () => void;
  markCopied: () => void;
  clearError: () => void;
};

export const useSwarmStore = create<SwarmStore>((set, get) => ({
  selectedRecipe: null,
  currentPlan: null,
  error: null,

  selectRecipe: (recipe) =>
    set({ selectedRecipe: recipe, currentPlan: null, error: null }),

  clearSelection: () =>
    set({ selectedRecipe: null, currentPlan: null, error: null }),

  generatePlan: (userIntent) => {
    const { selectedRecipe } = get();
    if (!selectedRecipe) {
      set({ error: "No recipe selected" });
      return;
    }

    const assignments = selectedRecipe.specialists.map((specialist, index) => ({
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
        budget: { maxTokens: 8000, priority: "medium" as const },
      },
      outputContract: specialist.outputContract,
      enabled: true,
      order: index,
    }));

    const plan = createPlan(
      selectedRecipe.id,
      selectedRecipe.version,
      userIntent,
      assignments,
    );
    set({ currentPlan: plan, error: null });
  },

  toggleAssignment: (assignmentId) => {
    const { currentPlan } = get();
    if (!currentPlan) return;

    const assignment = currentPlan.assignments.find(
      (a) => a.id === assignmentId,
    );
    if (!assignment) return;

    const result = assignment.enabled
      ? disableAssignment(currentPlan, assignmentId)
      : enableAssignment(currentPlan, assignmentId);

    const err = getError(result);
    if (err) {
      set({ error: err });
      return;
    }

    set({ currentPlan: result.plan, error: null });
  },

  updatePrompt: (assignmentId, newPrompt) => {
    const { currentPlan } = get();
    if (!currentPlan) return;

    const result = updateAssignmentPrompt(currentPlan, assignmentId, newPrompt);

    const err = getError(result);
    if (err) {
      set({ error: err });
      return;
    }

    set({ currentPlan: result.plan, error: null });
  },

  reorder: (orderedIds) => {
    const { currentPlan } = get();
    if (!currentPlan) return;

    const result = reorderAssignments(currentPlan, orderedIds);

    const err = getError(result);
    if (err) {
      set({ error: err });
      return;
    }

    set({ currentPlan: result.plan, error: null });
  },

  addSpecialist: (assignment) => {
    const { currentPlan } = get();
    if (!currentPlan) return;

    const result = addAssignment(currentPlan, assignment);

    const err = getError(result);
    if (err) {
      set({ error: err });
      return;
    }

    set({ currentPlan: result.plan, error: null });
  },

  removeSpecialist: (assignmentId) => {
    const { currentPlan } = get();
    if (!currentPlan) return;

    const result = removeAssignment(currentPlan, assignmentId);

    const err = getError(result);
    if (err) {
      set({ error: err });
      return;
    }

    set({ currentPlan: result.plan, error: null });
  },

  approve: () => {
    const { currentPlan } = get();
    if (!currentPlan) return;

    const plan = approvePlan(currentPlan);
    set({ currentPlan: plan, error: null });
  },

  markCopied: () => {
    const { currentPlan } = get();
    if (!currentPlan) return;

    const result = markPromptsCopied(currentPlan);

    const err = getError(result);
    if (err) {
      set({ error: err });
      return;
    }

    set({ currentPlan: result.plan, error: null });
  },

  clearError: () => set({ error: null }),
}));
