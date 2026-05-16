import { appendRookEvent } from "@/features/events";
import type { RookEventInput } from "@/features/events";
import { isTauriRuntimeAvailable } from "@/shared/api/tauri";

export function recordWorkflowSourceEvent(input: RookEventInput): void {
  if (!isTauriRuntimeAvailable()) return;

  void appendRookEvent(input).catch(() => {});
}
