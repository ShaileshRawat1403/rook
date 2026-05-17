import type {
  SwarmPlan,
  SwarmAssignment,
  SwarmPlanChange,
  SwarmPlanEditResult,
  ContextPacket,
} from "./types";

export function createSwarmPlan(
  recipeId: string,
  recipeVersion: string,
  userIntent: string,
  specialists: SwarmAssignment[],
): SwarmPlan {
  return {
    id: crypto.randomUUID(),
    recipeId,
    recipeVersion,
    userIntent,
    status: "draft",
    editable: true,
    assignments: specialists.map((specialist) => ({
      ...specialist,
      id: crypto.randomUUID(),
      contextPacket: { ...specialist.contextPacket },
      outputContract: { ...specialist.outputContract },
    })),
    changesFromRecipe: [],
  };
}

function isEditable(plan: SwarmPlan): boolean {
  if (!plan.editable) {
    return false;
  }
  if (plan.status !== "draft") {
    return false;
  }
  return true;
}

function createPlanChange(
  change: Omit<SwarmPlanChange, "id">,
): SwarmPlanChange {
  return {
    id: crypto.randomUUID(),
    ...change,
  };
}

export function disableAssignment(
  plan: SwarmPlan,
  assignmentId: string,
): SwarmPlanEditResult {
  if (!isEditable(plan)) {
    return { plan, change: null, error: "Plan is not editable" };
  }

  const assignment = plan.assignments.find((a) => a.id === assignmentId);
  if (!assignment) {
    return { plan, change: null, error: "Assignment not found" };
  }

  const assignments = plan.assignments.map((a) => {
    if (a.id === assignmentId) {
      return { ...a, enabled: false };
    }
    return a;
  });

  const change = createPlanChange({
    field: "enabled",
    previousValue: assignment.enabled === true ? "true" : "false",
    newValue: "false",
    reason: "User disabled specialist",
    changedBy: "user",
  });

  return {
    plan: {
      ...plan,
      assignments,
      changesFromRecipe: [...plan.changesFromRecipe, change],
    },
    change,
  };
}

export function enableAssignment(
  plan: SwarmPlan,
  assignmentId: string,
): SwarmPlanEditResult {
  if (!isEditable(plan)) {
    return { plan, change: null, error: "Plan is not editable" };
  }

  const assignment = plan.assignments.find((a) => a.id === assignmentId);
  if (!assignment) {
    return { plan, change: null, error: "Assignment not found" };
  }

  const assignments = plan.assignments.map((a) => {
    if (a.id === assignmentId) {
      return { ...a, enabled: true };
    }
    return a;
  });

  const change = createPlanChange({
    field: "enabled",
    previousValue: assignment.enabled === false ? "false" : "true",
    newValue: "true",
    reason: "User enabled specialist",
    changedBy: "user",
  });

  return {
    plan: {
      ...plan,
      assignments,
      changesFromRecipe: [...plan.changesFromRecipe, change],
    },
    change,
  };
}

export function updateAssignmentPrompt(
  plan: SwarmPlan,
  assignmentId: string,
  newPrompt: string,
): SwarmPlanEditResult {
  if (!isEditable(plan)) {
    return { plan, change: null, error: "Plan is not editable" };
  }

  const assignment = plan.assignments.find((a) => a.id === assignmentId);
  if (!assignment) {
    return { plan, change: null, error: "Assignment not found" };
  }

  const assignments = plan.assignments.map((a) => {
    if (a.id === assignmentId) {
      return { ...a, taskPrompt: newPrompt };
    }
    return a;
  });

  const change = createPlanChange({
    field: "taskPrompt",
    previousValue: assignment.taskPrompt,
    newValue: newPrompt,
    reason: "User edited specialist prompt",
    changedBy: "user",
  });

  return {
    plan: {
      ...plan,
      assignments,
      changesFromRecipe: [...plan.changesFromRecipe, change],
    },
    change,
  };
}

export function reorderAssignments(
  plan: SwarmPlan,
  orderedAssignmentIds: string[],
): SwarmPlanEditResult {
  if (!isEditable(plan)) {
    return { plan, change: null, error: "Plan is not editable" };
  }

  const existingIds = new Set(plan.assignments.map((a) => a.id));
  const requestedIds = new Set(orderedAssignmentIds);

  for (const id of requestedIds) {
    if (!existingIds.has(id)) {
      return {
        plan,
        change: null,
        error: `Unknown assignment ID: ${id}`,
      };
    }
  }

  for (const id of existingIds) {
    if (!requestedIds.has(id)) {
      return {
        plan,
        change: null,
        error: `Reorder must include all assignments. Missing: ${id}`,
      };
    }
  }

  const assignmentMap = new Map(plan.assignments.map((a) => [a.id, a]));

  const reorderedAssignments = orderedAssignmentIds
    .map((id, index) => {
      const assignment = assignmentMap.get(id);
      if (!assignment) return null;
      return { ...assignment, order: index };
    })
    .filter((a): a is SwarmAssignment => a !== null);

  const change = createPlanChange({
    field: "order",
    previousValue: plan.assignments.map((a) => a.id).join(","),
    newValue: orderedAssignmentIds.join(","),
    reason: "User reordered specialists",
    changedBy: "user",
  });

  return {
    plan: {
      ...plan,
      assignments: reorderedAssignments,
      changesFromRecipe: [...plan.changesFromRecipe, change],
    },
    change,
  };
}

export function addAssignment(
  plan: SwarmPlan,
  assignment: SwarmAssignment,
): SwarmPlanEditResult {
  if (!isEditable(plan)) {
    return { plan, change: null, error: "Plan is not editable" };
  }

  const existingIds = new Set(plan.assignments.map((a) => a.id));
  if (existingIds.has(assignment.id)) {
    return { plan, change: null, error: "Assignment ID already exists" };
  }

  const maxOrder = Math.max(...plan.assignments.map((a) => a.order), -1);
  const newAssignment = { ...assignment, order: maxOrder + 1 };

  const change = createPlanChange({
    field: "assignments",
    previousValue: "",
    newValue: assignment.id,
    reason: "User added specialist",
    changedBy: "user",
  });

  return {
    plan: {
      ...plan,
      assignments: [...plan.assignments, newAssignment],
      changesFromRecipe: [...plan.changesFromRecipe, change],
    },
    change,
  };
}

export function removeAssignment(
  plan: SwarmPlan,
  assignmentId: string,
): SwarmPlanEditResult {
  if (!isEditable(plan)) {
    return { plan, change: null, error: "Plan is not editable" };
  }

  const assignment = plan.assignments.find((a) => a.id === assignmentId);
  if (!assignment) {
    return { plan, change: null, error: "Assignment not found" };
  }

  const change = createPlanChange({
    field: "assignments",
    previousValue: assignment.id,
    newValue: "",
    reason: "User removed specialist",
    changedBy: "user",
  });

  return {
    plan: {
      ...plan,
      assignments: plan.assignments.filter((a) => a.id !== assignmentId),
      changesFromRecipe: [...plan.changesFromRecipe, change],
    },
    change,
  };
}

export function getAssignment(
  plan: SwarmPlan,
  assignmentId: string,
): SwarmAssignment | undefined {
  return plan.assignments.find((a) => a.id === assignmentId);
}

export function getEnabledAssignments(plan: SwarmPlan): SwarmAssignment[] {
  return plan.assignments
    .filter((a) => a.enabled)
    .sort((a, b) => a.order - b.order);
}

export function approvePlan(plan: SwarmPlan): SwarmPlan {
  return {
    ...plan,
    status: "approved",
    editable: false,
  };
}

export function markPromptsCopied(plan: SwarmPlan): SwarmPlanEditResult {
  if (plan.status !== "approved") {
    return {
      plan,
      change: null,
      error: "Plan must be approved before copying prompts",
    };
  }

  return {
    plan: {
      ...plan,
      status: "prompts_copied",
    },
    change: createPlanChange({
      field: "status",
      previousValue: "approved",
      newValue: "prompts_copied",
      reason: "User copied specialist prompts",
      changedBy: "user",
    }),
  };
}

export function createAssignment(
  specialistId: string,
  role: string,
  taskPrompt: string,
  outputContract: SwarmAssignment["outputContract"],
  contextPacket: ContextPacket,
): SwarmAssignment {
  return {
    id: crypto.randomUUID(),
    specialistId,
    label: role,
    role,
    taskPrompt,
    contextPacket,
    outputContract,
    enabled: true,
    order: 0,
  };
}
