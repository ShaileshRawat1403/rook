import { describe, expect, it } from "vitest";
import type { ColonySession } from "@/features/colony/types";
import type { RookEvent } from "@/features/events";
import { classifyWorkflowInterventions } from "./interventions";

function makeColony(overrides: Partial<ColonySession> = {}): ColonySession {
  return {
    id: "colony-1",
    title: "Repo review",
    intent: "Review repo",
    seats: [],
    tasks: [],
    handoffs: [],
    sentinelMode: "off",
    createdAt: "2026-05-16T09:00:00.000Z",
    updatedAt: "2026-05-16T10:00:00.000Z",
    ...overrides,
  };
}

function makeEvent(data: RookEvent["data"]): RookEvent {
  return {
    schemaVersion: "0.1.0",
    eventId: "event-1",
    runId: "colony-1",
    type: "operator.intervened",
    source: "operator",
    timestamp: "2026-05-16T09:45:00.000Z",
    data,
  };
}

describe("classifyWorkflowInterventions", () => {
  it("classifies recorded operator interventions", () => {
    const interventions = classifyWorkflowInterventions(
      [
        makeEvent({
          reason: "request_output_changes",
          actor: "reviewer",
          note: "Add evidence",
        }),
      ],
      makeColony(),
    );

    expect(interventions).toEqual([
      {
        id: "intervention:event-1",
        reason: "request_output_changes",
        actor: "reviewer",
        resolvedAt: "2026-05-16T09:45:00.000Z",
        note: "Add evidence",
      },
    ]);
  });

  it("falls back to the latest review snapshot when the event is not persisted yet", () => {
    const interventions = classifyWorkflowInterventions(
      [],
      makeColony({
        outputReview: {
          status: "changes_requested",
          reviewedAt: "2026-05-16T09:45:00.000Z",
          note: "Add evidence",
        },
      }),
    );

    expect(interventions).toEqual([
      {
        id: "intervention:review:colony-1:2026-05-16T09:45:00.000Z",
        reason: "request_output_changes",
        actor: "reviewer",
        resolvedAt: "2026-05-16T09:45:00.000Z",
        note: "Add evidence",
      },
    ]);
  });
});
