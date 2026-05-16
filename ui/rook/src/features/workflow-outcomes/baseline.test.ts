import { describe, expect, it, vi } from "vitest";
import { aggregateModuleBaseline } from "./baseline";
import type {
  WorkflowException,
  WorkflowIntervention,
  WorkflowRunTelemetry,
} from "./types";

function makeRun(overrides: {
  runId: string;
  endState: WorkflowRunTelemetry["endState"];
  durationMs: number;
  reviewerApproved: boolean;
  evidenceSatisfied: boolean;
  outputContractSatisfied: boolean;
  exceptions: WorkflowException[];
  interventions: WorkflowIntervention[];
  moduleId?: string;
  moduleVersion?: string;
}): WorkflowRunTelemetry {
  const moduleId = overrides.moduleId ?? "repo-review";
  const moduleVersion = overrides.moduleVersion ?? "1.0.0";

  return {
    schemaVersion: "0.1.0",
    runId: overrides.runId,
    moduleId,
    moduleVersion,
    colonyId: overrides.runId,
    startedAt: "2026-05-16T09:00:00.000Z",
    completedAt: "2026-05-16T10:00:00.000Z",
    durationMs: overrides.durationMs,
    endState: overrides.endState,
    counts: {
      tasksTotal: 3,
      tasksCompleted: 0,
      approvalRequests: 0,
      humanInterventions: overrides.interventions.length,
      exceptionsRaised: overrides.exceptions.length,
      artifactsCreated: 0,
    },
    quality: {
      outputContractSatisfied: overrides.outputContractSatisfied,
      evidenceSatisfied: overrides.evidenceSatisfied,
      reviewerApproved: overrides.reviewerApproved,
    },
    trust: { posture: "open", reasons: [] },
    exceptions: overrides.exceptions,
    interventions: overrides.interventions,
  };
}

function makeException(
  id: string,
  exceptionClass: WorkflowException["class"],
): WorkflowException {
  return {
    id,
    class: exceptionClass,
    severity: "medium",
    source: "rook",
    message: `${exceptionClass} test fixture`,
    raisedAt: "2026-05-16T09:30:00.000Z",
    recoverable: true,
  };
}

function makeIntervention(
  id: string,
  reason: WorkflowIntervention["reason"],
): WorkflowIntervention {
  return {
    id,
    reason,
    actor: "human_operator",
    resolvedAt: "2026-05-16T09:45:00.000Z",
  };
}

// Five fixtures matching the structure of the live Step 6 telemetry files
// for repo-review @ 1.0.0. Aggregates below should match what a reader
// derives from the raw JSON files.
const FIVE_REPO_REVIEW_RUNS: WorkflowRunTelemetry[] = [
  makeRun({
    runId: "82d4e26e",
    endState: "partially_succeeded",
    durationMs: 344015,
    reviewerApproved: true,
    evidenceSatisfied: true,
    outputContractSatisfied: false,
    exceptions: [],
    interventions: [makeIntervention("i-1", "approve_final_output")],
  }),
  makeRun({
    runId: "f46f81da",
    endState: "changes_requested",
    durationMs: 10631,
    reviewerApproved: false,
    evidenceSatisfied: false,
    outputContractSatisfied: false,
    exceptions: [
      makeException("e-1", "review_exception"),
      makeException("e-2", "evidence_exception"),
    ],
    interventions: [makeIntervention("i-2", "request_output_changes")],
  }),
  makeRun({
    runId: "aaaab7dd",
    endState: "partially_succeeded",
    durationMs: 1885,
    reviewerApproved: true,
    evidenceSatisfied: false,
    outputContractSatisfied: false,
    exceptions: [makeException("e-3", "evidence_exception")],
    interventions: [makeIntervention("i-3", "approve_final_output")],
  }),
  makeRun({
    runId: "a0cdf772",
    endState: "changes_requested",
    durationMs: 22496,
    reviewerApproved: false,
    evidenceSatisfied: false,
    outputContractSatisfied: false,
    exceptions: [
      makeException("e-4", "review_exception"),
      makeException("e-5", "evidence_exception"),
    ],
    interventions: [makeIntervention("i-4", "request_output_changes")],
  }),
  makeRun({
    runId: "a5bf9231",
    endState: "changes_requested",
    durationMs: 8109,
    reviewerApproved: false,
    evidenceSatisfied: false,
    outputContractSatisfied: false,
    exceptions: [
      makeException("e-6", "review_exception"),
      makeException("e-7", "evidence_exception"),
    ],
    interventions: [
      makeIntervention("i-5", "adjust_scope"),
      makeIntervention("i-6", "request_output_changes"),
    ],
  }),
];

describe("aggregateModuleBaseline", () => {
  it("returns a zeroed baseline when no runs match", () => {
    const baseline = aggregateModuleBaseline(
      "repo-review",
      "1.0.0",
      [],
    );

    expect(baseline.total).toBe(0);
    expect(baseline.avgDurationMs).toBeNull();
    expect(baseline.medianDurationMs).toBeNull();
    expect(baseline.reviewerApprovalRate).toBe(0);
    expect(baseline.exceptionsByClass).toEqual({});
    expect(baseline.interventionsByReason).toEqual({});
    expect(baseline.byEndState.succeeded).toBe(0);
  });

  it("filters by moduleId and moduleVersion", () => {
    const runs = [
      ...FIVE_REPO_REVIEW_RUNS,
      makeRun({
        runId: "other-1",
        moduleId: "release-readiness",
        endState: "succeeded",
        durationMs: 100,
        reviewerApproved: true,
        evidenceSatisfied: true,
        outputContractSatisfied: true,
        exceptions: [],
        interventions: [],
      }),
      makeRun({
        runId: "older-1",
        moduleVersion: "0.9.0",
        endState: "succeeded",
        durationMs: 200,
        reviewerApproved: true,
        evidenceSatisfied: true,
        outputContractSatisfied: true,
        exceptions: [],
        interventions: [],
      }),
    ];

    const baseline = aggregateModuleBaseline("repo-review", "1.0.0", runs);

    expect(baseline.total).toBe(5);
  });

  it("computes baseline for the five Step 6 repo-review runs", () => {
    const baseline = aggregateModuleBaseline(
      "repo-review",
      "1.0.0",
      FIVE_REPO_REVIEW_RUNS,
    );

    expect(baseline.moduleId).toBe("repo-review");
    expect(baseline.moduleVersion).toBe("1.0.0");
    expect(baseline.total).toBe(5);

    expect(baseline.byEndState).toEqual({
      succeeded: 0,
      partially_succeeded: 2,
      changes_requested: 3,
      blocked: 0,
      aborted: 0,
      failed: 0,
    });

    expect(baseline.avgDurationMs).toBeCloseTo(77427.2, 5);
    expect(baseline.medianDurationMs).toBe(10631);

    expect(baseline.reviewerApprovalRate).toBeCloseTo(0.4, 5);
    expect(baseline.evidenceSatisfiedRate).toBeCloseTo(0.2, 5);
    expect(baseline.outputContractPassRate).toBe(0);

    expect(baseline.exceptionsByClass).toEqual({
      review_exception: 3,
      evidence_exception: 4,
    });

    expect(baseline.interventionsByReason).toEqual({
      approve_final_output: 2,
      request_output_changes: 3,
      adjust_scope: 1,
    });

    expect(baseline.avgInterventionsPerRun).toBeCloseTo(1.2, 5);
    expect(baseline.avgExceptionsPerRun).toBeCloseTo(1.4, 5);

    // Step 7 stop condition: this prints baseline stats for repo-review@1.0.0
    // from the five-run corpus. Failing this test surfaces schema drift.
    console.log(
      "[baseline] repo-review@1.0.0:",
      JSON.stringify(baseline, null, 2),
    );
  });

  it("skips runs with unsupported schemaVersion and warns once", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const valid = FIVE_REPO_REVIEW_RUNS[0];
    const future: WorkflowRunTelemetry = {
      ...valid,
      runId: "future-1",
      schemaVersion: "0.2.0" as WorkflowRunTelemetry["schemaVersion"],
    };

    const baseline = aggregateModuleBaseline(
      "repo-review",
      "1.0.0",
      [valid, future],
    );

    expect(baseline.total).toBe(1);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toContain("skipped 1 telemetry record");
    warn.mockRestore();
  });

  it("does not warn when every run is on the supported schemaVersion", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    aggregateModuleBaseline("repo-review", "1.0.0", FIVE_REPO_REVIEW_RUNS);

    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });
});
