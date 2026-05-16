import { appendRookEvent } from "@/features/events";
import type { RookEventInput } from "@/features/events";
import { isTauriRuntimeAvailable } from "@/shared/api/tauri";

// Track in-flight source-event writes so the terminal recorder can wait for
// them to flush before snapshotting the event store. Without this, a close
// can outrun a same-tick source-event write and the recorder reads an
// event store that doesn't yet contain the latest facts.
//
// The set is module-level, not request-scoped, which is fine because
// flushPendingSourceEvents just waits for everything currently in flight to
// settle. New source events emitted after a flush starts are not awaited;
// callers should emit, then flush, then record.
const inFlightSourceEvents = new Set<Promise<void>>();

export function recordWorkflowSourceEvent(input: RookEventInput): void {
  if (!isTauriRuntimeAvailable()) return;

  const settle = appendRookEvent(input)
    .then(() => undefined)
    .catch((error) => {
      console.warn("[workflow-outcomes] failed to record source event:", error);
    })
    .finally(() => {
      inFlightSourceEvents.delete(settle);
    });

  inFlightSourceEvents.add(settle);
}

export async function flushPendingSourceEvents(): Promise<void> {
  if (inFlightSourceEvents.size === 0) return;
  await Promise.all(Array.from(inFlightSourceEvents));
}
