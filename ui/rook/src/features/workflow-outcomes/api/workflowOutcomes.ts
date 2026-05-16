import { invokeTauri } from "@/shared/api/tauri";
import type { WorkflowRunTelemetry } from "../types";

export async function writeWorkflowTelemetry(
  runId: string,
  telemetry: WorkflowRunTelemetry,
): Promise<string> {
  return invokeTauri<string>("write_workflow_telemetry", {
    runId,
    telemetry,
  });
}

export async function listWorkflowTelemetry(): Promise<WorkflowRunTelemetry[]> {
  return invokeTauri<WorkflowRunTelemetry[]>("list_workflow_telemetry");
}
