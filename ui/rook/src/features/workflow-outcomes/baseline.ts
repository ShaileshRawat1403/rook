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
  // Instance counts: how many times each class/reason was logged across
  // all runs. A single run can contribute more than one instance.
  exceptionsByClass: Partial<Record<WorkflowExceptionClass, number>>;
  interventionsByReason: Partial<Record<WorkflowInterventionReason, number>>;
  // Prevalence counts: how many distinct runs contained at least one of
  // each class/reason. Bounded by `total`. Use these for "X of N runs"
  // wording in UI; instance counts are wrong for that.
  exceptionRunsByClass: Partial<Record<WorkflowExceptionClass, number>>;
  interventionRunsByReason: Partial<Record<WorkflowInterventionReason, number>>;
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

const SUPPORTED_SCHEMA_VERSION = "0.1.0";

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// Runtime guard for telemetry records crossing the Tauri boundary. Files in
// ~/.rook/runs/<id>/telemetry.json can be valid JSON but wrong shape (empty
// objects, partially populated, schema-drifted). The aggregator dereferences
// nested fields, so a shape-invalid input would crash the baseline path.
// Filter such records out and warn — a partial baseline is better than no
// baseline.
function isValidTelemetry(value: unknown): value is WorkflowRunTelemetry {
  if (!isObject(value)) return false;
  if (value.schemaVersion !== SUPPORTED_SCHEMA_VERSION) return false;

  if (typeof value.runId !== "string") return false;
  if (typeof value.moduleId !== "string") return false;
  if (typeof value.moduleVersion !== "string") return false;
  if (typeof value.endState !== "string") return false;

  if (!isObject(value.quality)) return false;
  if (!isObject(value.counts)) return false;
  if (!isObject(value.trust)) return false;

  if (!Array.isArray(value.exceptions)) return false;
  if (!Array.isArray(value.interventions)) return false;

  return true;
}

export function aggregateModuleBaseline(
  moduleId: string,
  moduleVersion: string,
  runs: readonly unknown[],
): ModuleBaseline {
  const valid: WorkflowRunTelemetry[] = runs.filter(isValidTelemetry);
  const skipped = runs.length - valid.length;
  if (skipped > 0) {
    console.warn(
      `[workflow-outcomes] skipped ${skipped} telemetry record(s) with invalid shape or unsupported schemaVersion (expected "${SUPPORTED_SCHEMA_VERSION}")`,
    );
  }

  const matching = valid.filter(
    (run) => run.moduleId === moduleId && run.moduleVersion === moduleVersion,
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
      exceptionRunsByClass: {},
      interventionRunsByReason: {},
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
  const exceptionRunsByClass: Partial<Record<WorkflowExceptionClass, number>> =
    {};
  for (const run of matching) {
    const classesInRun = new Set<WorkflowExceptionClass>();
    for (const exception of run.exceptions) {
      exceptionsByClass[exception.class] =
        (exceptionsByClass[exception.class] ?? 0) + 1;
      classesInRun.add(exception.class);
    }
    for (const cls of classesInRun) {
      exceptionRunsByClass[cls] = (exceptionRunsByClass[cls] ?? 0) + 1;
    }
  }

  const interventionsByReason: Partial<
    Record<WorkflowInterventionReason, number>
  > = {};
  const interventionRunsByReason: Partial<
    Record<WorkflowInterventionReason, number>
  > = {};
  for (const run of matching) {
    const reasonsInRun = new Set<WorkflowInterventionReason>();
    for (const intervention of run.interventions) {
      interventionsByReason[intervention.reason] =
        (interventionsByReason[intervention.reason] ?? 0) + 1;
      reasonsInRun.add(intervention.reason);
    }
    for (const reason of reasonsInRun) {
      interventionRunsByReason[reason] =
        (interventionRunsByReason[reason] ?? 0) + 1;
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
    exceptionRunsByClass,
    interventionRunsByReason,
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
