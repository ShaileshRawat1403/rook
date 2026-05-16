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
