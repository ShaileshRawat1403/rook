import { invokeTauri, isTauriRuntimeAvailable } from "@/shared/api/tauri";
import type { RookEvent, RookEventFilter, RookEventInput } from "../types";

function requireDesktopRuntime(command: string): void {
  if (!isTauriRuntimeAvailable()) {
    throw new Error(`${command} is only available in the desktop app`);
  }
}

export async function getRookEventsDbPath(): Promise<string | null> {
  if (!isTauriRuntimeAvailable()) {
    return null;
  }
  return invokeTauri<string>("get_rook_events_db_path");
}

export async function appendRookEvent(
  input: RookEventInput,
): Promise<RookEvent> {
  requireDesktopRuntime("appendRookEvent");
  return invokeTauri<RookEvent>("append_rook_event", { input });
}

export async function listRookEvents(
  filter?: RookEventFilter,
): Promise<RookEvent[]> {
  if (!isTauriRuntimeAvailable()) {
    return [];
  }
  return invokeTauri<RookEvent[]>("list_rook_events", {
    filter: filter ?? null,
  });
}
