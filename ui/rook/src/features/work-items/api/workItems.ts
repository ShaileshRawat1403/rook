import { invokeTauri, isTauriRuntimeAvailable } from "@/shared/api/tauri";
import type { WorkItem, WorkItemInput } from "../types";

export async function listWorkItems(): Promise<WorkItem[]> {
  if (!isTauriRuntimeAvailable()) return [];
  return invokeTauri<WorkItem[]>("list_work_items");
}

export async function getWorkItem(id: string): Promise<WorkItem> {
  return invokeTauri<WorkItem>("get_work_item", { id });
}

export async function createWorkItem(input: WorkItemInput): Promise<WorkItem> {
  return invokeTauri<WorkItem>("create_work_item", { input });
}

export async function updateWorkItem(
  id: string,
  input: WorkItemInput,
): Promise<WorkItem> {
  return invokeTauri<WorkItem>("update_work_item", { id, input });
}

export async function deleteWorkItem(id: string): Promise<void> {
  return invokeTauri<void>("delete_work_item", { id });
}
