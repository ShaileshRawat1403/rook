export type WorkflowEndState =
  | "succeeded"
  | "partially_succeeded"
  | "changes_requested"
  | "blocked"
  | "aborted"
  | "failed";

export type WorkflowExceptionClass =
  | "intent_exception"
  | "scope_exception"
  | "tool_exception"
  | "policy_exception"
  | "evidence_exception"
  | "review_exception";

export type WorkflowException = {
  id: string;
  class: WorkflowExceptionClass;
  severity: "low" | "medium" | "high" | "critical";
  source: "rook" | "dax" | "agent" | "human" | "tool" | "system";
  message: string;
  raisedAt: string;
  recoverable: boolean;
};

export type WorkflowInterventionReason =
  | "clarify_intent"
  | "adjust_scope"
  | "approve_risk"
  | "request_more_evidence"
  | "request_output_changes"
  | "approve_final_output";

export type WorkflowIntervention = {
  id: string;
  reason: WorkflowInterventionReason;
  actor: "human_operator" | "reviewer" | "sentinel";
  resolvedAt: string;
  note?: string;
};

export type WorkflowRunTelemetry = {
  schemaVersion: "0.1.0";

  runId: string;
  moduleId: string;
  moduleVersion: string;
  workItemId?: string;
  colonyId?: string;
  daxRunId?: string;

  startedAt: string;
  completedAt?: string;
  durationMs?: number;

  endState: WorkflowEndState;

  counts: {
    tasksTotal: number;
    tasksCompleted: number;
    approvalRequests: number;
    humanInterventions: number;
    exceptionsRaised: number;
    artifactsCreated: number;
  };

  quality: {
    outputContractSatisfied: boolean;
    evidenceSatisfied: boolean;
    reviewerApproved: boolean;
  };

  trust: {
    posture: "open" | "guarded" | "blocked" | "verified" | "failed";
    reasons: string[];
  };

  exceptions: WorkflowException[];
  interventions: WorkflowIntervention[];

  operatorNote?: string;
};
