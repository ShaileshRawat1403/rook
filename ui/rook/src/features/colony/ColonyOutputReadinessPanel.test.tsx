import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ColonyOutputReadinessPanel } from "./ColonyOutputReadinessPanel";
import type {
  ColonyArtifact,
  ColonyArtifactKind,
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

function makeTask(status: ColonyTaskStatus): ColonyTask {
  return {
    id: crypto.randomUUID(),
    title: "task",
    status,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

function makeArtifact(
  kind: ColonyArtifactKind,
  content: string,
): ColonyArtifact {
  return {
    id: crypto.randomUUID(),
    title: "artifact",
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

describe("ColonyOutputReadinessPanel", () => {
  it("shows the no-contract message for a generic Colony", () => {
    render(<ColonyOutputReadinessPanel colony={makeColony()} />);

    const region = screen.getByRole("region", { name: /Output Contract/i });
    expect(region).toHaveTextContent(/No output contract is attached/i);
    expect(
      screen.getByLabelText(/Readiness status/i, { selector: "span" }),
    ).toHaveTextContent(/Not ready/i);
  });

  it("renders the contract summary fields for a recipe Colony", () => {
    const colony = makeColony({
      outputContract: makeContract({
        artifactType: "report",
        format: "markdown",
        evidenceRequired: true,
        reviewerRequired: false,
      }),
    });

    render(<ColonyOutputReadinessPanel colony={colony} />);

    const region = screen.getByRole("region", { name: /Output Contract/i });
    expect(within(region).getByText("Artifact type")).toBeInTheDocument();
    expect(within(region).getByText("report")).toBeInTheDocument();
    expect(within(region).getByText("Format")).toBeInTheDocument();
    expect(within(region).getByText("markdown")).toBeInTheDocument();
    expect(within(region).getByText("Evidence required")).toBeInTheDocument();
    expect(within(region).getByText("Reviewer required")).toBeInTheDocument();

    const evidenceTerm = within(region).getByText("Evidence required");
    expect(evidenceTerm.nextElementSibling).toHaveTextContent("Yes");
    const reviewerTerm = within(region).getByText("Reviewer required");
    expect(reviewerTerm.nextElementSibling).toHaveTextContent("No");
  });

  it("renders required sections with present and missing state", () => {
    const colony = makeColony({
      outputContract: makeContract({
        requiredSections: ["Summary", "Risks"],
      }),
      artifacts: [makeArtifact("review", "## summary\nstuff")],
    });

    render(<ColonyOutputReadinessPanel colony={colony} />);

    const summaryRow = screen
      .getByText("Summary")
      .closest("[data-section-present]");
    const risksRow = screen
      .getByText("Risks")
      .closest("[data-section-present]");

    expect(summaryRow).toHaveAttribute("data-section-present", "true");
    expect(risksRow).toHaveAttribute("data-section-present", "false");
    expect(within(summaryRow as HTMLElement).getByText("Present")).toBeInTheDocument();
    expect(within(risksRow as HTMLElement).getByText("Missing")).toBeInTheDocument();
  });

  it("shows readiness status and task completion derived from getColonyOutputReadiness", () => {
    const readyColony = makeColony({
      outputContract: makeContract({
        artifactType: "report",
        requiredSections: ["Summary"],
        evidenceRequired: false,
        reviewerRequired: false,
      }),
      tasks: [makeTask("done"), makeTask("done")],
      artifacts: [makeArtifact("review", "## Summary\nall good")],
    });
    const { rerender } = render(
      <ColonyOutputReadinessPanel colony={readyColony} />,
    );
    expect(
      screen.getByLabelText(/Readiness status/i, { selector: "span" }),
    ).toHaveTextContent(/Ready for review/i);
    expect(screen.getByText(/Tasks: 2 \/ 2 done/i)).toBeInTheDocument();

    const partialColony = makeColony({
      outputContract: makeContract({
        artifactType: "report",
        requiredSections: ["Summary", "Risks"],
      }),
      tasks: [makeTask("done"), makeTask("todo")],
      artifacts: [makeArtifact("review", "## Summary\nno risks here")],
    });
    rerender(<ColonyOutputReadinessPanel colony={partialColony} />);
    expect(
      screen.getByLabelText(/Readiness status/i, { selector: "span" }),
    ).toHaveTextContent(/Partially ready/i);
    expect(screen.getByText(/Tasks: 1 \/ 2 done/i)).toBeInTheDocument();
  });
});
