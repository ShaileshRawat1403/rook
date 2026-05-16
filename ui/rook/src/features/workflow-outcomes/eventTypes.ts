import type { WorkflowRunTelemetry } from "./types";

export type WorkflowOutcomeEventType = "workflow_outcome_recorded";

export type WorkflowOutcomeRecordedEventData = {
  runId: string;
  moduleId: string;
  moduleVersion: string;
  endState: WorkflowRunTelemetry["endState"];
  telemetryPath: string;
};
