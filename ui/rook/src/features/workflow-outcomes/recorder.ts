import { getColonyOutputReadiness } from "@/features/colony/outputReadiness";
import { useColonyStore } from "@/features/colony/colonyStore";
import type { ColonySession } from "@/features/colony/types";
import { appendRookEvent, listRookEvents } from "@/features/events";
import type { RookEvent } from "@/features/events";
import type {
  WorkflowEndState,
  WorkflowRunTelemetry,
} from "./types";
import { writeWorkflowTelemetry } from "./api/workflowOutcomes";
import { classifyWorkflowExceptions } from "./classifiers/exceptions";
import { classifyWorkflowInterventions } from "./classifiers/interventions";
import type { WorkflowOutcomeRecordedEventData } from "./eventTypes";
import { invalidateModuleBaseline } from "./ui/useModuleBaseline";

function countEvents(events: RookEvent[], type: RookEvent["type"]): number {
  return events.filter((event) => event.type === type).length;
}

function durationMs(startedAt: string, completedAt?: string): number | undefined {
  if (!completedAt) return undefined;

  const duration = Date.parse(completedAt) - Date.parse(startedAt);
  return Number.isFinite(duration) && duration >= 0 ? duration : undefined;
}

function endStateForColony(colony: ColonySession): WorkflowEndState {
  if (colony.outputReview?.status === "changes_requested") {
    return "changes_requested";
  }
  if (colony.lifecycleStatus === "blocked") {
    return "blocked";
  }
  if (colony.lifecycleStatus === "closed") {
    return getColonyOutputReadiness(colony).status === "ready"
      ? "succeeded"
      : "partially_succeeded";
  }

  throw new Error(`Colony ${colony.id} is not in a terminal state`);
}

type ModuleBackedColony = ColonySession & {
  recipeId: string;
  recipeVersion: string;
};

function getColonyForRun(runId: string): ModuleBackedColony {
  const colony = useColonyStore
    .getState()
    .colonies.find((candidate) => candidate.id === runId);

  if (!colony) {
    throw new Error(`No Colony found for run ${runId}`);
  }
  if (!colony.recipeId || !colony.recipeVersion) {
    throw new Error(`Colony ${runId} is not backed by a workflow module`);
  }

  return colony as ModuleBackedColony;
}

function buildTelemetry(
  colony: ModuleBackedColony,
  events: RookEvent[],
): WorkflowRunTelemetry {
  const readiness = getColonyOutputReadiness(colony);
  const completedAt =
    colony.closedAt ??
    (colony.lifecycleStatus === "blocked" ? colony.updatedAt : undefined);
  const exceptions = classifyWorkflowExceptions(colony, events);
  const interventions = classifyWorkflowInterventions(events, colony);

  return {
    schemaVersion: "0.1.0",
    runId: colony.id,
    moduleId: colony.recipeId,
    moduleVersion: colony.recipeVersion,
    workItemId: colony.workItemId,
    colonyId: colony.id,
    startedAt: colony.createdAt,
    completedAt,
    durationMs: durationMs(colony.createdAt, completedAt),
    endState: endStateForColony(colony),
    counts: {
      tasksTotal: colony.tasks.length,
      tasksCompleted: colony.tasks.filter((task) => task.status === "done")
        .length,
      approvalRequests: countEvents(events, "permission.requested"),
      humanInterventions: interventions.length,
      exceptionsRaised: exceptions.length,
      artifactsCreated: colony.artifacts?.length ?? 0,
    },
    quality: {
      outputContractSatisfied: readiness.status === "ready",
      evidenceSatisfied: readiness.evidenceSatisfied,
      reviewerApproved: readiness.reviewerSatisfied,
    },
    trust: {
      posture: "open",
      reasons: [],
    },
    exceptions,
    interventions,
  };
}

export async function recordWorkflowOutcome(runId: string): Promise<void> {
  const colony = getColonyForRun(runId);
  const events = await listRookEvents({ runId });
  const telemetry = buildTelemetry(colony, events);
  const telemetryPath = await writeWorkflowTelemetry(runId, telemetry);

  const data = {
    runId,
    moduleId: telemetry.moduleId,
    moduleVersion: telemetry.moduleVersion,
    endState: telemetry.endState,
    telemetryPath,
  } satisfies WorkflowOutcomeRecordedEventData;

  await appendRookEvent({
    runId,
    projectId: colony.projectId,
    type: "workflow_outcome_recorded",
    source: "rook",
    data,
  });

  invalidateModuleBaseline(telemetry.moduleId, telemetry.moduleVersion);
}
