import { describe, expect, it } from "vitest";
import { getColonyOutputReadiness } from "./outputReadiness";
import type {
  ColonyArtifact,
  ColonyArtifactKind,
  ColonyHandoff,
  ColonyOutputContract,
  ColonySession,
  ColonyTask,
  ColonyTaskStatus,
} from "./types";

function makeContract(
  overrides: Partial<ColonyOutputContract> = {},
): ColonyOutputContract {
  return {
    source: "recipe",
    recipeId: "repo-review",
    recipeVersion: "1.0.0",
    artifactType: "report",
    format: "markdown",
    requiredSections: [],
    evidenceRequired: false,
    reviewerRequired: false,
    ...overrides,
  };
}

function makeTask(status: ColonyTaskStatus, title = "task"): ColonyTask {
  return {
    id: crypto.randomUUID(),
    title,
    status,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

function makeArtifact(
  kind: ColonyArtifactKind,
  content: string,
  title = "artifact",
): ColonyArtifact {
  return {
    id: crypto.randomUUID(),
    title,
    kind,
    content,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

function makeColony(overrides: Partial<ColonySession> = {}): ColonySession {
  return {
    id: "colony-1",
    title: "Test Colony",
    intent: "Test",
    seats: [],
    tasks: [],
    handoffs: [],
    sentinelMode: "off",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("getColonyOutputReadiness (v0.6)", () => {
  it("returns not_ready and hasOutputContract=false when there is no contract", () => {
    const colony = makeColony({ tasks: [makeTask("done")] });

    const r = getColonyOutputReadiness(colony);

    expect(r.hasOutputContract).toBe(false);
    expect(r.status).toBe("not_ready");
    expect(r.requiredSections).toEqual([]);
    expect(r.requiredArtifactPresent).toBe(false);
  });

  it("counts total and done tasks", () => {
    const colony = makeColony({
      outputContract: makeContract(),
      tasks: [makeTask("done"), makeTask("inProgress"), makeTask("todo")],
    });

    const r = getColonyOutputReadiness(colony);

    expect(r.taskCompletion).toEqual({ total: 3, done: 1 });
  });

  it("detects required artifact presence via the v0.6 type→kind map", () => {
    const reportColony = makeColony({
      outputContract: makeContract({ artifactType: "report" }),
      artifacts: [makeArtifact("review", "anything")],
    });
    const prdColony = makeColony({
      outputContract: makeContract({ artifactType: "prd" }),
      artifacts: [makeArtifact("review", "anything")],
    });

    expect(getColonyOutputReadiness(reportColony).requiredArtifactPresent).toBe(
      true,
    );
    expect(getColonyOutputReadiness(prdColony).requiredArtifactPresent).toBe(
      false,
    );
  });

  it("matches required sections case-insensitively across artifact content", () => {
    const colony = makeColony({
      outputContract: makeContract({
        requiredSections: ["Summary", "Risks"],
      }),
      artifacts: [makeArtifact("review", "## summary\nfindings here")],
    });

    const r = getColonyOutputReadiness(colony);

    expect(r.requiredSections).toEqual([
      { section: "Summary", present: true },
      { section: "Risks", present: false },
    ]);
  });

  it("returns partially_ready when an artifact exists but required sections are missing", () => {
    const colony = makeColony({
      outputContract: makeContract({
        requiredSections: ["Summary", "Risks"],
      }),
      artifacts: [makeArtifact("review", "no matching headings")],
    });

    const r = getColonyOutputReadiness(colony);

    expect(r.status).toBe("partially_ready");
  });

  it("returns ready when all gates pass with reviewerRequired=false", () => {
    const colony = makeColony({
      outputContract: makeContract({
        artifactType: "report",
        requiredSections: ["Summary", "Scope"],
        evidenceRequired: true,
        reviewerRequired: false,
      }),
      tasks: [makeTask("done"), makeTask("done")],
      artifacts: [
        makeArtifact(
          "review",
          "## Summary\n## Scope\nEvidence: looked at files X, Y",
        ),
      ],
    });

    const r = getColonyOutputReadiness(colony);

    expect(r.requiredArtifactPresent).toBe(true);
    expect(r.requiredSections.every((s) => s.present)).toBe(true);
    expect(r.evidenceSatisfied).toBe(true);
    expect(r.reviewerSatisfied).toBe(true);
    expect(r.status).toBe("ready");
  });

  it("keeps reviewerSatisfied=false when reviewerRequired=true and no approved handoff exists", () => {
    const pendingHandoff: ColonyHandoff = {
      id: "h-1",
      fromSeatId: "s-1",
      toSeatId: "s-2",
      summary: "x",
      status: "ready",
      reviewStatus: "pending",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    };
    const colony = makeColony({
      outputContract: makeContract({ reviewerRequired: true }),
      tasks: [makeTask("done")],
      artifacts: [makeArtifact("review", "complete enough")],
      handoffs: [pendingHandoff],
    });

    const r = getColonyOutputReadiness(colony);

    expect(r.reviewerSatisfied).toBe(false);
    expect(r.status).not.toBe("ready");
  });

  it("treats an approved handoff as a reviewer-satisfied signal", () => {
    const approvedHandoff: ColonyHandoff = {
      id: "h-1",
      fromSeatId: "s-1",
      toSeatId: "s-2",
      summary: "x",
      status: "ready",
      reviewStatus: "approved",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    };
    const colony = makeColony({
      outputContract: makeContract({ reviewerRequired: true }),
      handoffs: [approvedHandoff],
    });

    const r = getColonyOutputReadiness(colony);

    expect(r.reviewerSatisfied).toBe(true);
  });
});
