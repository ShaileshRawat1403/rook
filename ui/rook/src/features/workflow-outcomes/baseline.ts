import { listWorkflowTelemetry } from "./api/workflowOutcomes";
import type {
  WorkflowEndState,
  WorkflowExceptionClass,
  WorkflowInterventionReason,
  WorkflowRunTelemetry,
} from "./types";

export type ModuleBaseline = {
  moduleId: string;
  moduleVersion: string;
  total: number;
  byEndState: Record<WorkflowEndState, number>;
  avgDurationMs: number | null;
  medianDurationMs: number | null;
  reviewerApprovalRate: number;
  evidenceSatisfiedRate: number;
  outputContractPassRate: number;
  exceptionsByClass: Partial<Record<WorkflowExceptionClass, number>>;
  interventionsByReason: Partial<Record<WorkflowInterventionReason, number>>;
  avgInterventionsPerRun: number;
  avgExceptionsPerRun: number;
};

function emptyEndStateCounts(): Record<WorkflowEndState, number> {
  return {
    succeeded: 0,
    partially_succeeded: 0,
    changes_requested: 0,
    blocked: 0,
    aborted: 0,
    failed: 0,
  };
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function aggregateModuleBaseline(
  moduleId: string,
  moduleVersion: string,
  runs: WorkflowRunTelemetry[],
): ModuleBaseline {
  const matching = runs.filter(
    (run) =>
      run.moduleId === moduleId && run.moduleVersion === moduleVersion,
  );

  if (matching.length === 0) {
    return {
      moduleId,
      moduleVersion,
      total: 0,
      byEndState: emptyEndStateCounts(),
      avgDurationMs: null,
      medianDurationMs: null,
      reviewerApprovalRate: 0,
      evidenceSatisfiedRate: 0,
      outputContractPassRate: 0,
      exceptionsByClass: {},
      interventionsByReason: {},
      avgInterventionsPerRun: 0,
      avgExceptionsPerRun: 0,
    };
  }

  const byEndState = emptyEndStateCounts();
  for (const run of matching) {
    byEndState[run.endState] = (byEndState[run.endState] ?? 0) + 1;
  }

  const durations = matching
    .map((run) => run.durationMs)
    .filter((value): value is number => typeof value === "number");

  const reviewerApproved = matching.filter(
    (run) => run.quality.reviewerApproved,
  ).length;
  const evidenceSatisfied = matching.filter(
    (run) => run.quality.evidenceSatisfied,
  ).length;
  const contractSatisfied = matching.filter(
    (run) => run.quality.outputContractSatisfied,
  ).length;

  const exceptionsByClass: Partial<Record<WorkflowExceptionClass, number>> = {};
  for (const run of matching) {
    for (const exception of run.exceptions) {
      exceptionsByClass[exception.class] =
        (exceptionsByClass[exception.class] ?? 0) + 1;
    }
  }

  const interventionsByReason: Partial<
    Record<WorkflowInterventionReason, number>
  > = {};
  for (const run of matching) {
    for (const intervention of run.interventions) {
      interventionsByReason[intervention.reason] =
        (interventionsByReason[intervention.reason] ?? 0) + 1;
    }
  }

  const totalExceptions = matching.reduce(
    (sum, run) => sum + run.exceptions.length,
    0,
  );
  const totalInterventions = matching.reduce(
    (sum, run) => sum + run.interventions.length,
    0,
  );

  return {
    moduleId,
    moduleVersion,
    total: matching.length,
    byEndState,
    avgDurationMs: average(durations),
    medianDurationMs: median(durations),
    reviewerApprovalRate: reviewerApproved / matching.length,
    evidenceSatisfiedRate: evidenceSatisfied / matching.length,
    outputContractPassRate: contractSatisfied / matching.length,
    exceptionsByClass,
    interventionsByReason,
    avgInterventionsPerRun: totalInterventions / matching.length,
    avgExceptionsPerRun: totalExceptions / matching.length,
  };
}

export async function getModuleBaseline(
  moduleId: string,
  moduleVersion: string,
): Promise<ModuleBaseline> {
  const runs = await listWorkflowTelemetry();
  return aggregateModuleBaseline(moduleId, moduleVersion, runs);
}
