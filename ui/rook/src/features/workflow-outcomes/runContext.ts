import { useColonyStore } from "@/features/colony/colonyStore";
import type { ColonySession } from "@/features/colony/types";

export function findColonyForSessionId(
  sessionId: string,
): ColonySession | null {
  return (
    useColonyStore
      .getState()
      .colonies.find((colony) =>
        colony.seats.some(
          (seat) =>
            seat.sessionId === sessionId || seat.acpSessionId === sessionId,
        ),
      ) ?? null
  );
}
