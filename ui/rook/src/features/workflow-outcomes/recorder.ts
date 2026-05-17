import { getColonyOutputReadiness } from "@/features/colony/outputReadiness";
import { useColonyStore } from "@/features/colony/colonyStore";
import type { ColonySession } from "@/features/colony/types";
import { appendRookEvent, listRookEvents } from "@/features/events";
import type { RookEvent } from "@/features/events";
import type {
  WorkflowEndState,
  WorkflowException,
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

function durationMs(
  startedAt: string,
  completedAt?: string,
): number | undefined {
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

// Derive trust posture from facts the recorder already has. No new schema,
// no DAX call, no new event — purely a function of exceptions + quality.
// Until DAX trust is wired in v0.2, this gives consumers a useful signal
// instead of every run being "open". Exported for direct unit testing.
export function deriveTrust(
  exceptions: WorkflowException[],
  quality: WorkflowRunTelemetry["quality"],
): WorkflowRunTelemetry["trust"] {
  const reasons: string[] = [];

  const hasBlockingPolicy = exceptions.some(
    (exception) =>
      exception.class === "policy_exception" &&
      (exception.severity === "high" || exception.severity === "critical"),
  );
  const hasAnyException = exceptions.length > 0;
  const evidenceMissing = quality.evidenceSatisfied === false;
  const reviewerApproved = quality.reviewerApproved === true;
  const evidenceOk = quality.evidenceSatisfied === true;
  const outputContractSatisfied = quality.outputContractSatisfied === true;

  if (hasBlockingPolicy) {
    reasons.push("policy denied a critical action");
    return { posture: "blocked", reasons };
  }

  if (hasAnyException) {
    const classes = Array.from(new Set(exceptions.map((e) => e.class))).sort();
    reasons.push(`exceptions present: ${classes.join(", ")}`);
    return { posture: "guarded", reasons };
  }

  if (reviewerApproved && evidenceOk && outputContractSatisfied) {
    reasons.push(
      "output contract satisfied, reviewer approved, evidence satisfied",
    );
    return { posture: "verified", reasons };
  }

  if (reviewerApproved && evidenceOk && !outputContractSatisfied) {
    reasons.push("output contract not satisfied");
    return { posture: "guarded", reasons };
  }

  if (evidenceMissing) {
    reasons.push("required evidence not satisfied");
    return { posture: "guarded", reasons };
  }

  return { posture: "open", reasons: [] };
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
  const quality = {
    outputContractSatisfied: readiness.status === "ready",
    evidenceSatisfied: readiness.evidenceSatisfied,
    reviewerApproved: readiness.reviewerSatisfied,
  };

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
    quality,
    trust: deriveTrust(exceptions, quality),
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
