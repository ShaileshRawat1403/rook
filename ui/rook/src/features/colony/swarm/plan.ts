import type {
  SwarmPlan,
  SwarmAssignment,
  SwarmPlanChange,
  SwarmOutputContract,
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
    assignments: specialists,
    changesFromRecipe: [],
  };
}

export function disableAssignment(
  plan: SwarmPlan,
  assignmentId: string,
): { plan: SwarmPlan; change: SwarmPlanChange } {
  const assignments = plan.assignments.map((a) => {
    if (a.id === assignmentId) {
      return { ...a, enabled: false };
    }
    return a;
  });

  const assignment = plan.assignments.find((a) => a.id === assignmentId);
  const change: SwarmPlanChange = {
    field: "enabled",
    previousValue: assignment?.enabled === true ? "true" : "false",
    newValue: "false",
    reason: "User disabled specialist",
    changedBy: "user",
  };

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
): { plan: SwarmPlan; change: SwarmPlanChange } {
  const assignments = plan.assignments.map((a) => {
    if (a.id === assignmentId) {
      return { ...a, enabled: true };
    }
    return a;
  });

  const assignment = plan.assignments.find((a) => a.id === assignmentId);
  const change: SwarmPlanChange = {
    field: "enabled",
    previousValue: assignment?.enabled === false ? "false" : "true",
    newValue: "true",
    reason: "User enabled specialist",
    changedBy: "user",
  };

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
): { plan: SwarmPlan; change: SwarmPlanChange } {
  const assignment = plan.assignments.find((a) => a.id === assignmentId);
  if (!assignment) {
    return { plan, change: {} as SwarmPlanChange };
  }

  const assignments = plan.assignments.map((a) => {
    if (a.id === assignmentId) {
      return { ...a, taskPrompt: newPrompt };
    }
    return a;
  });

  const change: SwarmPlanChange = {
    field: "taskPrompt",
    previousValue: assignment.taskPrompt,
    newValue: newPrompt,
    reason: "User edited specialist prompt",
    changedBy: "user",
  };

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
): { plan: SwarmPlan; change: SwarmPlanChange } {
  const assignmentMap = new Map(plan.assignments.map((a) => [a.id, a]));

  const reorderedAssignments = orderedAssignmentIds
    .map((id, index) => {
      const assignment = assignmentMap.get(id);
      if (!assignment) return null;
      return { ...assignment, order: index };
    })
    .filter((a): a is SwarmAssignment => a !== null);

  const change: SwarmPlanChange = {
    field: "order",
    previousValue: plan.assignments.map((a) => a.id).join(","),
    newValue: orderedAssignmentIds.join(","),
    reason: "User reordered specialists",
    changedBy: "user",
  };

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
): { plan: SwarmPlan; change: SwarmPlanChange } {
  const maxOrder = Math.max(...plan.assignments.map((a) => a.order), -1);
  const newAssignment = { ...assignment, order: maxOrder + 1 };

  const change: SwarmPlanChange = {
    field: "assignments",
    previousValue: "",
    newValue: newAssignment.id,
    reason: "User added specialist",
    changedBy: "user",
  };

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
): { plan: SwarmPlan; change: SwarmPlanChange } {
  const assignment = plan.assignments.find((a) => a.id === assignmentId);
  if (!assignment) {
    return { plan, change: {} as SwarmPlanChange };
  }

  const change: SwarmPlanChange = {
    field: "assignments",
    previousValue: assignment.id,
    newValue: "",
    reason: "User removed specialist",
    changedBy: "user",
  };

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

export function markPromptsCopied(plan: SwarmPlan): SwarmPlan {
  return {
    ...plan,
    status: "prompts_copied",
  };
}

export function createAssignment(
  specialistId: string,
  role: string,
  taskPrompt: string,
  outputContract: SwarmOutputContract,
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
