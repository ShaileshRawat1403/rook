import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AcceptanceCriterion } from "@/features/work-items/types";
import { colonyStore } from "./colonyStore";
import type { PersistedColonyState } from "./colonyPersistence";
import {
  DOCS_AUDIT_RECIPE,
  RELEASE_READINESS_RECIPE,
  REPO_REVIEW_RECIPE,
} from "./swarm/recipes";
import type { ColonyOutputContract } from "./types";

vi.mock("@/shared/api/sentinel", () => ({
  getConfiguredSentinelMode: vi.fn().mockResolvedValue("off"),
  setConfiguredSentinelMode: vi.fn(),
}));

function resetStore() {
  colonyStore.setState({
    colonies: [],
    activeColonyId: null,
    sentinelMode: "off",
    events: [],
    preparedHandoff: null,
  });
}

function createReviewableColony() {
  const colony = colonyStore.getState().createColonyFromRecipe({
    title: "Repo Review",
    intent: "Review repo",
    workItemId: "wi-review",
    recipeId: REPO_REVIEW_RECIPE.id,
    acceptanceCriteria: [{ id: "ac-1", text: "Review is complete" }],
  });
  const task = colony.tasks[0];
  if (!task) throw new Error("expected review task");
  colonyStore.getState().updateTaskStatus(colony.id, task.id, "done");
  colonyStore.getState().createArtifact(colony.id, {
    title: "Review",
    kind: "review",
    content: [
      "# Executive summary",
      "# Findings",
      "# Recommendations",
      "Evidence: inspected files",
    ].join("\n"),
  });

  return colony;
}

describe("colonyStore — WorkItem anchoring (v0.5 F1)", () => {
  beforeEach(() => {
    resetStore();
    if (typeof window !== "undefined") {
      window.localStorage.clear();
    }
  });

  it("records workItemId when a Colony is created with a WorkItem anchor", () => {
    const colony = colonyStore
      .getState()
      .createColony("Anchored Colony", "Repo Review", "wi-123");

    expect(colony.workItemId).toBe("wi-123");

    const stored = colonyStore
      .getState()
      .colonies.find((c) => c.id === colony.id);
    expect(stored?.workItemId).toBe("wi-123");
  });

  it("leaves workItemId undefined when a Colony is created without an anchor (legacy path)", () => {
    const colony = colonyStore
      .getState()
      .createColony("Legacy Colony", "Task-focused Colony");

    expect(colony.workItemId).toBeUndefined();

    const stored = colonyStore
      .getState()
      .colonies.find((c) => c.id === colony.id);
    expect(stored?.workItemId).toBeUndefined();
  });

  it("creates a recipe-anchored Colony recording workItemId, recipeId, and recipeVersion", () => {
    const colony = colonyStore.getState().createColonyFromRecipe({
      title: "Repo Review for WI-42",
      intent: "Repo Review",
      workItemId: "wi-42",
      recipeId: REPO_REVIEW_RECIPE.id,
    });

    expect(colony.workItemId).toBe("wi-42");
    expect(colony.recipeId).toBe(REPO_REVIEW_RECIPE.id);
    expect(colony.recipeVersion).toBe(REPO_REVIEW_RECIPE.version);
  });

  it("creates one seat per Repo Review specialist with the specialist role as the seat label", () => {
    const colony = colonyStore.getState().createColonyFromRecipe({
      title: "Repo Review",
      intent: "Repo Review",
      workItemId: "wi-1",
      recipeId: REPO_REVIEW_RECIPE.id,
    });

    expect(colony.seats).toHaveLength(REPO_REVIEW_RECIPE.specialists.length);
    expect(colony.seats.map((s) => s.label)).toEqual(
      REPO_REVIEW_RECIPE.specialists.map((sp) => sp.role),
    );
    expect(colony.seats[0]?.role).toBe("planner");
    expect(colony.seats[colony.seats.length - 1]?.role).toBe("reviewer");
  });

  it("derives one Colony task per acceptance criterion, preserving the AC id", () => {
    const acceptanceCriteria: AcceptanceCriterion[] = [
      { id: "ac-1", text: "Repo structure is documented" },
      { id: "ac-2", text: "Test coverage is reported" },
      { id: "ac-3", text: "Risks list is produced" },
    ];

    const colony = colonyStore.getState().createColonyFromRecipe({
      title: "Repo Review",
      intent: "Repo Review",
      workItemId: "wi-1",
      recipeId: REPO_REVIEW_RECIPE.id,
      acceptanceCriteria,
    });

    expect(colony.tasks).toHaveLength(3);
    expect(colony.tasks.map((t) => t.title)).toEqual([
      "Repo structure is documented",
      "Test coverage is reported",
      "Risks list is produced",
    ]);
    expect(colony.tasks.map((t) => t.sourceAcceptanceCriterionId)).toEqual([
      "ac-1",
      "ac-2",
      "ac-3",
    ]);
    expect(colony.tasks.every((t) => t.status === "todo")).toBe(true);
  });

  it("throws on an unknown recipeId", () => {
    expect(() =>
      colonyStore.getState().createColonyFromRecipe({
        title: "x",
        intent: "x",
        workItemId: "wi-1",
        recipeId: "not-a-real-recipe",
      }),
    ).toThrow(/Unknown recipe/);
  });

  it("loads pre-lifecycle persisted Colonies (no lifecycleStatus field) as not-closed", () => {
    const legacyState: PersistedColonyState = {
      colonies: [
        {
          id: "legacy-active",
          title: "Pre-lifecycle Colony",
          intent: "task",
          seats: [],
          tasks: [],
          handoffs: [],
          sentinelMode: "off",
          createdAt: "2025-01-01T00:00:00.000Z",
          updatedAt: "2025-01-01T00:00:00.000Z",
        },
      ],
      activeColonyId: "legacy-active",
      sentinelMode: "off",
      events: [],
    };

    colonyStore.setState({
      colonies: legacyState.colonies,
      activeColonyId: legacyState.activeColonyId,
      sentinelMode: legacyState.sentinelMode,
      events: legacyState.events,
      preparedHandoff: null,
    });

    const colony = colonyStore.getState().colonies[0];
    expect(colony?.lifecycleStatus).toBeUndefined();
    expect(() =>
      colonyStore.getState().createTask("legacy-active", "Should work"),
    ).not.toThrow();
  });

  it("loads pre-v0.5 persisted Colonies (no workItemId field) without dropping them", () => {
    const legacyState: PersistedColonyState = {
      colonies: [
        {
          id: "legacy-1",
          title: "Pre-v0.5 Colony",
          intent: "task",
          seats: [],
          tasks: [],
          handoffs: [],
          sentinelMode: "off",
          createdAt: "2025-01-01T00:00:00.000Z",
          updatedAt: "2025-01-01T00:00:00.000Z",
        },
      ],
      activeColonyId: "legacy-1",
      sentinelMode: "off",
      events: [],
    };

    colonyStore.setState({
      colonies: legacyState.colonies,
      activeColonyId: legacyState.activeColonyId,
      sentinelMode: legacyState.sentinelMode,
      events: legacyState.events,
      preparedHandoff: null,
    });

    const loaded = colonyStore.getState().colonies;
    expect(loaded).toHaveLength(1);
    expect(loaded[0]?.id).toBe("legacy-1");
    expect(loaded[0]?.workItemId).toBeUndefined();
    expect(loaded[0]?.outputContract).toBeUndefined();
  });
});

describe("colonyStore — output contract persistence (v0.6)", () => {
  beforeEach(() => {
    resetStore();
    if (typeof window !== "undefined") {
      window.localStorage.clear();
    }
  });

  it("createColonyFromRecipe stores recipe.finalArtifact as the Colony output contract", () => {
    const colony = colonyStore.getState().createColonyFromRecipe({
      title: "Repo Review",
      intent: "Repo Review",
      workItemId: "wi-1",
      recipeId: REPO_REVIEW_RECIPE.id,
    });

    expect(colony.outputContract).toBeDefined();
    expect(colony.outputContract?.source).toBe("recipe");
    expect(colony.outputContract?.recipeId).toBe(REPO_REVIEW_RECIPE.id);
    expect(colony.outputContract?.recipeVersion).toBe(
      REPO_REVIEW_RECIPE.version,
    );
    expect(colony.outputContract?.artifactType).toBe(
      REPO_REVIEW_RECIPE.finalArtifact.artifactType,
    );
    expect(colony.outputContract?.format).toBe(
      REPO_REVIEW_RECIPE.finalArtifact.format,
    );
    expect(colony.outputContract?.requiredSections).toEqual(
      REPO_REVIEW_RECIPE.finalArtifact.requiredSections,
    );
    expect(colony.outputContract?.evidenceRequired).toBe(
      REPO_REVIEW_RECIPE.finalArtifact.evidenceRequired,
    );
    expect(colony.outputContract?.reviewerRequired).toBe(
      REPO_REVIEW_RECIPE.finalArtifact.reviewerRequired,
    );
  });

  it("stores a copy of requiredSections, not a reference to recipe.finalArtifact", () => {
    const colony = colonyStore.getState().createColonyFromRecipe({
      title: "Repo Review",
      intent: "Repo Review",
      workItemId: "wi-1",
      recipeId: REPO_REVIEW_RECIPE.id,
    });

    expect(colony.outputContract?.requiredSections).not.toBe(
      REPO_REVIEW_RECIPE.finalArtifact.requiredSections,
    );
  });

  it("legacy createColony does not assign an output contract", () => {
    const colony = colonyStore
      .getState()
      .createColony("Generic Colony", "Task-focused Colony");

    expect(colony.outputContract).toBeUndefined();
  });
});

describe("colonyStore — lifecycle and close (v0.5 F7)", () => {
  beforeEach(() => {
    resetStore();
    if (typeof window !== "undefined") {
      window.localStorage.clear();
    }
  });

  it("starts new Colonies in lifecycleStatus 'active'", () => {
    const simple = colonyStore.getState().createColony("Simple", "Task");
    expect(simple.lifecycleStatus).toBe("active");

    const fromRecipe = colonyStore.getState().createColonyFromRecipe({
      title: "Recipe",
      intent: "Repo Review",
      workItemId: "wi-1",
      recipeId: REPO_REVIEW_RECIPE.id,
    });
    expect(fromRecipe.lifecycleStatus).toBe("active");
  });

  it("closeColony sets lifecycleStatus, closedAt, and closedReason", () => {
    const colony = colonyStore.getState().createColony("c", "Task");
    colonyStore.getState().closeColony(colony.id, "demo done");

    const stored = colonyStore
      .getState()
      .colonies.find((c) => c.id === colony.id);
    expect(stored?.lifecycleStatus).toBe("closed");
    expect(stored?.closedAt).toBeTruthy();
    expect(stored?.closedReason).toBe("demo done");
  });

  it("closeColony appends a colony_closed audit event", () => {
    const colony = colonyStore.getState().createColony("c", "Task");
    colonyStore.getState().closeColony(colony.id);

    const types = colonyStore.getState().events.map((e) => e.type);
    expect(types).toContain("colony_closed");
  });

  it("closed Colony blocks createTask with a clear error", () => {
    const colony = colonyStore.getState().createColony("c", "Task");
    colonyStore.getState().closeColony(colony.id);

    expect(() =>
      colonyStore.getState().createTask(colony.id, "Should not appear"),
    ).toThrow(/closed/i);

    const stored = colonyStore
      .getState()
      .colonies.find((c) => c.id === colony.id);
    expect(stored?.tasks).toHaveLength(0);
  });

  it("closed Colony blocks createHandoff", () => {
    const colony = colonyStore.getState().createColonyFromRecipe({
      title: "Recipe",
      intent: "Repo Review",
      workItemId: "wi-1",
      recipeId: REPO_REVIEW_RECIPE.id,
    });
    const fromSeat = colony.seats[0];
    const toSeat = colony.seats.at(-1);
    expect(fromSeat).toBeDefined();
    expect(toSeat).toBeDefined();
    if (!fromSeat || !toSeat) {
      throw new Error("Expected recipe seats");
    }
    const fromSeatId = fromSeat.id;
    const toSeatId = toSeat.id;

    colonyStore.getState().closeColony(colony.id);

    expect(() =>
      colonyStore
        .getState()
        .createHandoff(colony.id, fromSeatId, toSeatId, undefined, "ctx"),
    ).toThrow(/closed/i);

    const stored = colonyStore
      .getState()
      .colonies.find((c) => c.id === colony.id);
    expect(stored?.handoffs).toHaveLength(0);
  });

  it("closed Colony silently no-ops update/delete actions", () => {
    const colony = colonyStore.getState().createColony("c", "Task");
    const task = colonyStore.getState().createTask(colony.id, "Pre-close task");

    colonyStore.getState().closeColony(colony.id);

    colonyStore.getState().updateTaskStatus(colony.id, task.id, "done");
    colonyStore.getState().createArtifact(colony.id, {
      title: "Should not be added",
      kind: "note",
      content: "blocked",
    });

    const stored = colonyStore
      .getState()
      .colonies.find((c) => c.id === colony.id);
    const storedTask = stored?.tasks.find((t) => t.id === task.id);
    expect(storedTask?.status).toBe("todo");
    expect(stored?.artifacts ?? []).toHaveLength(0);
  });
});

describe("colonyStore — additional recipe contract validation (v0.7)", () => {
  const SUPPORTED_ARTIFACT_TYPES: ColonyOutputContract["artifactType"][] = [
    "report",
    "prd",
    "strategy",
    "checklist",
    "audit",
  ];
  const SUPPORTED_FORMATS: ColonyOutputContract["format"][] = [
    "markdown",
    "json",
    "checklist",
  ];

  beforeEach(() => {
    resetStore();
    if (typeof window !== "undefined") {
      window.localStorage.clear();
    }
  });

  it("Release Readiness recipe is shaped to become a v0.6 ColonyOutputContract", () => {
    const recipe = RELEASE_READINESS_RECIPE;

    expect(recipe.id).toBe("release-readiness");
    expect(typeof recipe.version).toBe("string");
    expect(recipe.version.length).toBeGreaterThan(0);
    expect(SUPPORTED_ARTIFACT_TYPES).toContain(
      recipe.finalArtifact.artifactType,
    );
    expect(SUPPORTED_FORMATS).toContain(recipe.finalArtifact.format);
    expect(recipe.finalArtifact.requiredSections.length).toBeGreaterThan(0);
    expect(typeof recipe.finalArtifact.evidenceRequired).toBe("boolean");
    expect(typeof recipe.finalArtifact.reviewerRequired).toBe("boolean");
  });

  it("Docs Audit recipe is shaped to become a v0.6 ColonyOutputContract", () => {
    const recipe = DOCS_AUDIT_RECIPE;

    expect(recipe.id).toBe("docs-audit");
    expect(typeof recipe.version).toBe("string");
    expect(recipe.version.length).toBeGreaterThan(0);
    expect(SUPPORTED_ARTIFACT_TYPES).toContain(
      recipe.finalArtifact.artifactType,
    );
    expect(SUPPORTED_FORMATS).toContain(recipe.finalArtifact.format);
    expect(recipe.finalArtifact.requiredSections.length).toBeGreaterThan(0);
    expect(typeof recipe.finalArtifact.evidenceRequired).toBe("boolean");
    expect(typeof recipe.finalArtifact.reviewerRequired).toBe("boolean");
  });

  it("createColonyFromRecipe persists the Release Readiness output contract end-to-end", () => {
    const acceptanceCriteria: AcceptanceCriterion[] = [
      { id: "ac-1", text: "Build passes" },
      { id: "ac-2", text: "Changelog generated" },
    ];

    const colony = colonyStore.getState().createColonyFromRecipe({
      title: "Release Readiness",
      intent: "Release Readiness",
      workItemId: "wi-rel-1",
      recipeId: RELEASE_READINESS_RECIPE.id,
      acceptanceCriteria,
    });

    expect(colony.recipeId).toBe(RELEASE_READINESS_RECIPE.id);
    expect(colony.recipeVersion).toBe(RELEASE_READINESS_RECIPE.version);
    expect(colony.outputContract?.artifactType).toBe(
      RELEASE_READINESS_RECIPE.finalArtifact.artifactType,
    );
    expect(colony.outputContract?.format).toBe(
      RELEASE_READINESS_RECIPE.finalArtifact.format,
    );
    expect(colony.outputContract?.requiredSections).toEqual(
      RELEASE_READINESS_RECIPE.finalArtifact.requiredSections,
    );
    expect(colony.outputContract?.evidenceRequired).toBe(
      RELEASE_READINESS_RECIPE.finalArtifact.evidenceRequired,
    );
    expect(colony.outputContract?.reviewerRequired).toBe(
      RELEASE_READINESS_RECIPE.finalArtifact.reviewerRequired,
    );
    expect(colony.tasks.map((t) => t.title)).toEqual([
      "Build passes",
      "Changelog generated",
    ]);
    expect(colony.seats).toHaveLength(
      RELEASE_READINESS_RECIPE.specialists.length,
    );
  });

  it("createColonyFromRecipe persists the Docs Audit output contract end-to-end", () => {
    const acceptanceCriteria: AcceptanceCriterion[] = [
      { id: "ac-1", text: "README is current" },
      { id: "ac-2", text: "API docs cover public surface" },
      { id: "ac-3", text: "No drift from code" },
    ];

    const colony = colonyStore.getState().createColonyFromRecipe({
      title: "Docs Audit",
      intent: "Docs Audit",
      workItemId: "wi-docs-1",
      recipeId: DOCS_AUDIT_RECIPE.id,
      acceptanceCriteria,
    });

    expect(colony.recipeId).toBe(DOCS_AUDIT_RECIPE.id);
    expect(colony.recipeVersion).toBe(DOCS_AUDIT_RECIPE.version);
    expect(colony.outputContract?.artifactType).toBe(
      DOCS_AUDIT_RECIPE.finalArtifact.artifactType,
    );
    expect(colony.outputContract?.format).toBe(
      DOCS_AUDIT_RECIPE.finalArtifact.format,
    );
    expect(colony.outputContract?.requiredSections).toEqual(
      DOCS_AUDIT_RECIPE.finalArtifact.requiredSections,
    );
    expect(colony.outputContract?.evidenceRequired).toBe(
      DOCS_AUDIT_RECIPE.finalArtifact.evidenceRequired,
    );
    expect(colony.outputContract?.reviewerRequired).toBe(
      DOCS_AUDIT_RECIPE.finalArtifact.reviewerRequired,
    );
    expect(colony.tasks.map((t) => t.title)).toEqual([
      "README is current",
      "API docs cover public surface",
      "No drift from code",
    ]);
    expect(colony.seats).toHaveLength(DOCS_AUDIT_RECIPE.specialists.length);
  });
});

describe("colonyStore — output review state (v0.8)", () => {
  beforeEach(() => {
    resetStore();
    if (typeof window !== "undefined") {
      window.localStorage.clear();
    }
  });

  it("markOutputReviewed stores an approved outputReview", () => {
    const colony = createReviewableColony();
    colonyStore.getState().markOutputReviewed(colony.id);

    const stored = colonyStore
      .getState()
      .colonies.find((c) => c.id === colony.id);
    expect(stored?.outputReview?.status).toBe("approved");
    expect(stored?.outputReview?.reviewedAt).toBeTruthy();
  });

  it("markOutputReviewed persists an optional note", () => {
    const colony = createReviewableColony();
    colonyStore.getState().markOutputReviewed(colony.id, "lgtm");

    const stored = colonyStore
      .getState()
      .colonies.find((c) => c.id === colony.id);
    expect(stored?.outputReview?.note).toBe("lgtm");
  });

  it("markOutputReviewed appends an output_reviewed audit event", () => {
    const colony = createReviewableColony();
    colonyStore.getState().markOutputReviewed(colony.id);

    const types = colonyStore.getState().events.map((e) => e.type);
    expect(types).toContain("output_reviewed");
  });

  it("requestOutputChanges stores a changes_requested outputReview", () => {
    const colony = colonyStore.getState().createColony("c", "Task");
    colonyStore.getState().createArtifact(colony.id, {
      title: "Draft",
      kind: "doc",
      content: "rough draft",
    });
    colonyStore.getState().requestOutputChanges(colony.id);

    const stored = colonyStore
      .getState()
      .colonies.find((c) => c.id === colony.id);
    expect(stored?.outputReview?.status).toBe("changes_requested");
    expect(stored?.outputReview?.reviewedAt).toBeTruthy();
  });

  it("requestOutputChanges persists an optional note", () => {
    const colony = colonyStore.getState().createColony("c", "Task");
    colonyStore.getState().createArtifact(colony.id, {
      title: "Draft",
      kind: "doc",
      content: "rough draft",
    });
    colonyStore.getState().requestOutputChanges(colony.id, "missing risks");

    const stored = colonyStore
      .getState()
      .colonies.find((c) => c.id === colony.id);
    expect(stored?.outputReview?.note).toBe("missing risks");
  });

  it("requestOutputChanges appends an output_changes_requested audit event", () => {
    const colony = colonyStore.getState().createColony("c", "Task");
    colonyStore.getState().createArtifact(colony.id, {
      title: "Draft",
      kind: "doc",
      content: "rough draft",
    });
    colonyStore.getState().requestOutputChanges(colony.id);

    const types = colonyStore.getState().events.map((e) => e.type);
    expect(types).toContain("output_changes_requested");
  });

  it("closed Colony does not allow markOutputReviewed", () => {
    const colony = createReviewableColony();
    colonyStore.getState().closeColony(colony.id);

    colonyStore.getState().markOutputReviewed(colony.id, "should not apply");

    const stored = colonyStore
      .getState()
      .colonies.find((c) => c.id === colony.id);
    expect(stored?.outputReview).toBeUndefined();
    expect(
      colonyStore.getState().events.some((e) => e.type === "output_reviewed"),
    ).toBe(false);
  });

  it("closed Colony does not allow requestOutputChanges", () => {
    const colony = colonyStore.getState().createColony("c", "Task");
    colonyStore.getState().createArtifact(colony.id, {
      title: "Draft",
      kind: "doc",
      content: "rough draft",
    });
    colonyStore.getState().closeColony(colony.id);

    colonyStore.getState().requestOutputChanges(colony.id, "should not apply");

    const stored = colonyStore
      .getState()
      .colonies.find((c) => c.id === colony.id);
    expect(stored?.outputReview).toBeUndefined();
    expect(
      colonyStore
        .getState()
        .events.some((e) => e.type === "output_changes_requested"),
    ).toBe(false);
  });

  it("loads pre-v0.8 persisted Colonies (no outputReview field) without dropping them", () => {
    const legacyState: PersistedColonyState = {
      colonies: [
        {
          id: "legacy-no-review",
          title: "Pre-v0.8 Colony",
          intent: "task",
          seats: [],
          tasks: [],
          handoffs: [],
          sentinelMode: "off",
          createdAt: "2025-01-01T00:00:00.000Z",
          updatedAt: "2025-01-01T00:00:00.000Z",
        },
      ],
      activeColonyId: "legacy-no-review",
      sentinelMode: "off",
      events: [],
    };

    colonyStore.setState({
      colonies: legacyState.colonies,
      activeColonyId: legacyState.activeColonyId,
      sentinelMode: legacyState.sentinelMode,
      events: legacyState.events,
      preparedHandoff: null,
    });

    const loaded = colonyStore.getState().colonies;
    expect(loaded).toHaveLength(1);
    expect(loaded[0]?.outputReview).toBeUndefined();
    expect(() =>
      colonyStore.getState().markOutputReviewed("legacy-no-review"),
    ).not.toThrow();
  });

  it("does not mark output reviewed before an artifact exists", () => {
    const colony = colonyStore.getState().createColonyFromRecipe({
      title: "Repo Review",
      intent: "Review repo",
      workItemId: "wi-review",
      recipeId: REPO_REVIEW_RECIPE.id,
    });

    colonyStore.getState().markOutputReviewed(colony.id);

    const stored = colonyStore
      .getState()
      .colonies.find((candidate) => candidate.id === colony.id);
    expect(stored?.outputReview).toBeUndefined();
  });

  it("does not mark output reviewed when required sections are missing", () => {
    const colony = colonyStore.getState().createColonyFromRecipe({
      title: "Repo Review",
      intent: "Review repo",
      workItemId: "wi-review",
      recipeId: REPO_REVIEW_RECIPE.id,
      acceptanceCriteria: [{ id: "ac-1", text: "Review is complete" }],
    });
    const task = colony.tasks[0];
    if (!task) throw new Error("expected review task");
    colonyStore.getState().updateTaskStatus(colony.id, task.id, "done");
    colonyStore.getState().createArtifact(colony.id, {
      title: "Review",
      kind: "review",
      content: "# Executive summary\nEvidence: inspected files",
    });

    colonyStore.getState().markOutputReviewed(colony.id);

    const stored = colonyStore
      .getState()
      .colonies.find((candidate) => candidate.id === colony.id);
    expect(stored?.outputReview).toBeUndefined();
  });

  it("does not request output changes before an artifact exists", () => {
    const colony = colonyStore.getState().createColony("c", "Task");

    colonyStore.getState().requestOutputChanges(colony.id);

    const stored = colonyStore
      .getState()
      .colonies.find((candidate) => candidate.id === colony.id);
    expect(stored?.outputReview).toBeUndefined();
  });
});
