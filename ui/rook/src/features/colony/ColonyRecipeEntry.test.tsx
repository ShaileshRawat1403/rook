import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useWorkItemStore } from "@/features/work-items/stores/workItemStore";
import type { WorkItem } from "@/features/work-items/types";
import { ColonyRecipeEntry } from "./ColonyRecipeEntry";
import { colonyStore } from "./colonyStore";
import { REPO_REVIEW_RECIPE } from "./swarm/recipes";

vi.mock("@/shared/api/sentinel", () => ({
  getConfiguredSentinelMode: vi.fn().mockResolvedValue("off"),
  setConfiguredSentinelMode: vi.fn(),
}));

function resetStores() {
  colonyStore.setState({
    colonies: [],
    activeColonyId: null,
    sentinelMode: "off",
    events: [],
    preparedHandoff: null,
  });
  useWorkItemStore.setState({
    items: [],
    isLoading: false,
    error: null,
    fetchAll: async () => {},
  });
}

function makeWorkItem(overrides: Partial<WorkItem> = {}): WorkItem {
  return {
    id: "wi-1",
    key: "JIRA-101",
    title: "Audit auth module",
    source: "manual",
    acceptanceCriteria: [
      { id: "ac-1", text: "Repo structure is documented" },
      { id: "ac-2", text: "Test coverage is reported" },
    ],
    createdAt: "2026-05-08T00:00:00.000Z",
    updatedAt: "2026-05-08T00:00:00.000Z",
    ...overrides,
  };
}

describe("ColonyRecipeEntry", () => {
  beforeEach(() => {
    resetStores();
  });

  it("explains a Work Item is required when no Work Items exist", () => {
    render(<ColonyRecipeEntry />);

    const region = screen.getByRole("region", { name: /Repo Review Colony/i });
    expect(region).toBeInTheDocument();
    expect(region).toHaveTextContent(/starts from a Work Item/i);
    expect(
      screen.queryByRole("button", { name: /Create Colony/i }),
    ).not.toBeInTheDocument();
  });

  it("creates a recipe-anchored Colony from the selected Work Item on click", async () => {
    const user = userEvent.setup();
    const workItem = makeWorkItem();
    useWorkItemStore.setState({
      items: [workItem],
      fetchAll: async () => {},
    });

    render(<ColonyRecipeEntry />);

    const button = await screen.findByRole("button", {
      name: /Create Colony/i,
    });
    await user.click(button);

    const state = colonyStore.getState();
    expect(state.colonies).toHaveLength(1);
    const colony = state.colonies[0];
    expect(colony?.workItemId).toBe(workItem.id);
    expect(colony?.recipeId).toBe(REPO_REVIEW_RECIPE.id);
    expect(colony?.recipeVersion).toBe(REPO_REVIEW_RECIPE.version);
    expect(colony?.tasks.map((t) => t.title)).toEqual([
      "Repo structure is documented",
      "Test coverage is reported",
    ]);
    expect(colony?.tasks.map((t) => t.sourceAcceptanceCriterionId)).toEqual([
      "ac-1",
      "ac-2",
    ]);
    expect(colony?.seats).toHaveLength(REPO_REVIEW_RECIPE.specialists.length);
    expect(state.activeColonyId).toBe(colony?.id);
  });
});
