import { describe, expect, it } from "vitest";
import type { ColonySession } from "@/features/colony/types";
import type { RookEvent } from "@/features/events";
import { classifyWorkflowExceptions } from "./exceptions";

function makeColony(overrides: Partial<ColonySession> = {}): ColonySession {
  return {
    id: "colony-1",
    title: "Repo review",
    intent: "Review repo",
    recipeId: "repo-review",
    recipeVersion: "1.0.0",
    lifecycleStatus: "closed",
    closedAt: "2026-05-16T10:00:00.000Z",
    seats: [],
    tasks: [],
    handoffs: [],
    sentinelMode: "off",
    createdAt: "2026-05-16T09:00:00.000Z",
    updatedAt: "2026-05-16T10:00:00.000Z",
    ...overrides,
  };
}

function makeEvent(
  type: RookEvent["type"],
  data: RookEvent["data"],
): RookEvent {
  return {
    schemaVersion: "0.1.0",
    eventId: `${type}-1`,
    runId: "colony-1",
    type,
    source: "rook",
    timestamp: "2026-05-16T09:30:00.000Z",
    data,
  };
}

describe("classifyWorkflowExceptions", () => {
  it("classifies Sentinel denies, review rejection, and missing evidence", () => {
    const colony = makeColony({
      outputContract: {
        source: "recipe",
        recipeId: "repo-review",
        recipeVersion: "1.0.0",
        artifactType: "report",
        format: "markdown",
        requiredSections: [],
        evidenceRequired: true,
        reviewerRequired: true,
      },
      outputReview: {
        status: "changes_requested",
        reviewedAt: "2026-05-16T09:45:00.000Z",
        note: "Add evidence",
      },
    });
    const events = [
      makeEvent("governance.evaluated", {
        decision: "deny",
        reason: "Policy denied write",
      }),
    ];

    const exceptions = classifyWorkflowExceptions(colony, events);

    expect(exceptions.map((exception) => exception.class)).toEqual([
      "policy_exception",
      "review_exception",
      "evidence_exception",
    ]);
  });
});
