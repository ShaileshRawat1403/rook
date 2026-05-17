import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useWorkItemStore } from "@/features/work-items/stores/workItemStore";
import type { WorkItem } from "@/features/work-items/types";
import { ColonyRecipeEntry } from "./ColonyRecipeEntry";
import { colonyStore } from "./colonyStore";
import {
  DOCS_AUDIT_RECIPE,
  RELEASE_READINESS_RECIPE,
  REPO_REVIEW_RECIPE,
  SOW_BUILDER_RECIPE,
} from "./swarm/recipes";

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

function seedWorkItem(workItem = makeWorkItem()) {
  useWorkItemStore.setState({
    items: [workItem],
    fetchAll: async () => {},
  });
  return workItem;
}

describe("ColonyRecipeEntry", () => {
  beforeEach(() => {
    resetStores();
  });

  it("explains a Work Item is required when no Work Items exist", () => {
    render(<ColonyRecipeEntry />);

    const region = screen.getByRole("region", {
      name: /Create Colony from Work Item/i,
    });
    expect(region).toHaveTextContent(/starts from a Work Item/i);
    expect(
      screen.queryByRole("button", { name: /Create Colony/i }),
    ).not.toBeInTheDocument();
  });

  it("exposes exactly the four validated recipes", () => {
    seedWorkItem();
    render(<ColonyRecipeEntry />);

    const fieldset = screen.getByRole("group", { name: /Workflow recipe/i });
    expect(within(fieldset).getByLabelText(/Repo Review/i)).toBeInTheDocument();
    expect(
      within(fieldset).getByLabelText(/Release Readiness/i),
    ).toBeInTheDocument();
    expect(
      within(fieldset).getByLabelText(new RegExp(DOCS_AUDIT_RECIPE.name, "i")),
    ).toBeInTheDocument();
    expect(
      within(fieldset).getByLabelText(new RegExp(SOW_BUILDER_RECIPE.name, "i")),
    ).toBeInTheDocument();

    expect(within(fieldset).queryByLabelText(/PRD Builder/i)).toBeNull();
    expect(within(fieldset).queryByLabelText(/SEO Strategy/i)).toBeNull();
  });

  it("updates the preview when a different recipe is selected", async () => {
    const user = userEvent.setup();
    seedWorkItem();
    render(<ColonyRecipeEntry />);

    await user.click(screen.getByRole("radio", { name: /Release Readiness/i }));
    let expectedOutputDt = screen.getByText("Expected output");
    let requiredSectionsDt = screen.getByText("Required sections");
    expect(expectedOutputDt.nextElementSibling).toHaveTextContent("checklist");
    expect(requiredSectionsDt.nextElementSibling).toHaveTextContent(
      String(RELEASE_READINESS_RECIPE.finalArtifact.requiredSections.length),
    );

    await user.click(
      screen.getByRole("radio", {
        name: new RegExp(DOCS_AUDIT_RECIPE.name, "i"),
      }),
    );
    expectedOutputDt = screen.getByText("Expected output");
    requiredSectionsDt = screen.getByText("Required sections");
    expect(expectedOutputDt.nextElementSibling).toHaveTextContent("audit");
    expect(requiredSectionsDt.nextElementSibling).toHaveTextContent(
      String(DOCS_AUDIT_RECIPE.finalArtifact.requiredSections.length),
    );
  });

  it("creates a Repo Review Colony when the default recipe is used", async () => {
    const user = userEvent.setup();
    const workItem = seedWorkItem();
    render(<ColonyRecipeEntry />);

    await user.click(
      await screen.findByRole("button", { name: /Create Colony/i }),
    );

    const colony = colonyStore.getState().colonies[0];
    expect(colony?.workItemId).toBe(workItem.id);
    expect(colony?.recipeId).toBe(REPO_REVIEW_RECIPE.id);
    expect(colony?.recipeVersion).toBe(REPO_REVIEW_RECIPE.version);
    expect(colony?.outputContract?.artifactType).toBe(
      REPO_REVIEW_RECIPE.finalArtifact.artifactType,
    );
    expect(colony?.tasks.map((t) => t.title)).toEqual([
      "Repo structure is documented",
      "Test coverage is reported",
    ]);
    expect(colony?.seats).toHaveLength(REPO_REVIEW_RECIPE.specialists.length);
  });

  it("creates a Release Readiness Colony when that recipe is selected", async () => {
    const user = userEvent.setup();
    const workItem = seedWorkItem(
      makeWorkItem({
        id: "wi-rel",
        title: "Cut release 4.2",
        acceptanceCriteria: [
          { id: "ac-1", text: "Build passes" },
          { id: "ac-2", text: "Changelog generated" },
        ],
      }),
    );
    render(<ColonyRecipeEntry />);

    await user.click(screen.getByRole("radio", { name: /Release Readiness/i }));
    await user.click(
      await screen.findByRole("button", { name: /Create Colony/i }),
    );

    const colony = colonyStore.getState().colonies[0];
    expect(colony?.workItemId).toBe(workItem.id);
    expect(colony?.recipeId).toBe(RELEASE_READINESS_RECIPE.id);
    expect(colony?.outputContract?.artifactType).toBe("checklist");
    expect(colony?.tasks.map((t) => t.title)).toEqual([
      "Build passes",
      "Changelog generated",
    ]);
    expect(colony?.seats).toHaveLength(
      RELEASE_READINESS_RECIPE.specialists.length,
    );
  });

  it("creates a Docs Audit Colony when that recipe is selected", async () => {
    const user = userEvent.setup();
    const workItem = seedWorkItem(
      makeWorkItem({
        id: "wi-docs",
        title: "Refresh API docs",
        acceptanceCriteria: [
          { id: "ac-1", text: "README is current" },
          { id: "ac-2", text: "API docs cover public surface" },
        ],
      }),
    );
    render(<ColonyRecipeEntry />);

    await user.click(
      screen.getByRole("radio", {
        name: new RegExp(DOCS_AUDIT_RECIPE.name, "i"),
      }),
    );
    await user.click(
      await screen.findByRole("button", { name: /Create Colony/i }),
    );

    const colony = colonyStore.getState().colonies[0];
    expect(colony?.workItemId).toBe(workItem.id);
    expect(colony?.recipeId).toBe(DOCS_AUDIT_RECIPE.id);
    expect(colony?.outputContract?.artifactType).toBe("audit");
    expect(colony?.tasks.map((t) => t.title)).toEqual([
      "README is current",
      "API docs cover public surface",
    ]);
    expect(colony?.seats).toHaveLength(DOCS_AUDIT_RECIPE.specialists.length);
  });

  it("creates an Agile SOW Builder Colony when that recipe is selected", async () => {
    const user = userEvent.setup();
    const workItem = seedWorkItem(
      makeWorkItem({
        id: "wi-sow",
        title: "Define governed SDLC engagement",
        acceptanceCriteria: [
          { id: "ac-1", text: "Scope is bounded" },
          { id: "ac-2", text: "Sprint plan is sequenced" },
        ],
      }),
    );
    render(<ColonyRecipeEntry />);

    await user.click(
      screen.getByRole("radio", {
        name: new RegExp(SOW_BUILDER_RECIPE.name, "i"),
      }),
    );
    await user.click(
      await screen.findByRole("button", { name: /Create Colony/i }),
    );

    const colony = colonyStore.getState().colonies[0];
    expect(colony?.workItemId).toBe(workItem.id);
    expect(colony?.recipeId).toBe(SOW_BUILDER_RECIPE.id);
    expect(colony?.outputContract?.artifactType).toBe("sow");
    expect(colony?.seats.map((seat) => seat.label)).toEqual([
      "Business Analyst",
      "Developer",
      "Project Manager",
    ]);
  });
});
