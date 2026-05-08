import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AcceptanceCriterion } from "@/features/work-items/types";
import { colonyStore } from "./colonyStore";
import type { PersistedColonyState } from "./colonyPersistence";
import { REPO_REVIEW_RECIPE } from "./swarm/recipes";

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
  });
});
