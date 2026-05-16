import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { ModuleBaselineCard } from "./ModuleBaselineCard";
import type { ModuleBaselineState } from "./useModuleBaseline";
import type { ModuleBaseline } from "../baseline";

const mockUseModuleBaseline = vi.hoisted(() => vi.fn<() => ModuleBaselineState>());

vi.mock("./useModuleBaseline", () => ({
  useModuleBaseline: mockUseModuleBaseline,
}));

function makeBaseline(overrides: Partial<ModuleBaseline> = {}): ModuleBaseline {
  return {
    moduleId: "repo-review",
    moduleVersion: "1.0.0",
    total: 0,
    byEndState: {
      succeeded: 0,
      partially_succeeded: 0,
      changes_requested: 0,
      blocked: 0,
      aborted: 0,
      failed: 0,
    },
    avgDurationMs: null,
    medianDurationMs: null,
    reviewerApprovalRate: 0,
    evidenceSatisfiedRate: 0,
    outputContractPassRate: 0,
    exceptionsByClass: {},
    interventionsByReason: {},
    avgInterventionsPerRun: 0,
    avgExceptionsPerRun: 0,
    ...overrides,
  };
}

describe("ModuleBaselineCard", () => {
  beforeEach(() => {
    mockUseModuleBaseline.mockReset();
  });

  it("renders a skeleton while loading", () => {
    mockUseModuleBaseline.mockReturnValue({ status: "loading" });

    render(<ModuleBaselineCard moduleId="repo-review" moduleVersion="1.0.0" />);

    expect(screen.getByTestId("baseline-loading")).toBeInTheDocument();
  });

  it("renders 'No runs yet' when total is zero", () => {
    mockUseModuleBaseline.mockReturnValue({
      status: "empty",
      baseline: makeBaseline(),
    });

    render(<ModuleBaselineCard moduleId="repo-review" moduleVersion="1.0.0" />);

    expect(screen.getByText("No runs yet")).toBeInTheDocument();
  });

  it("renders populated baseline with headline and top concern", () => {
    mockUseModuleBaseline.mockReturnValue({
      status: "ready",
      baseline: makeBaseline({
        total: 5,
        reviewerApprovalRate: 0.4,
        medianDurationMs: 10631,
        byEndState: {
          succeeded: 0,
          partially_succeeded: 2,
          changes_requested: 3,
          blocked: 0,
          aborted: 0,
          failed: 0,
        },
        exceptionsByClass: {
          review_exception: 3,
          evidence_exception: 4,
        },
      }),
    });

    render(<ModuleBaselineCard moduleId="repo-review" moduleVersion="1.0.0" />);

    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("40%")).toBeInTheDocument();
    expect(screen.getByText(/10\.6s median/)).toBeInTheDocument();
    expect(screen.getByText("evidence_exception")).toBeInTheDocument();
    expect(screen.getByText(/4 of 5/)).toBeInTheDocument();
  });

  it("renders 'No exceptions logged' when populated but exceptions are empty", () => {
    mockUseModuleBaseline.mockReturnValue({
      status: "ready",
      baseline: makeBaseline({
        total: 1,
        reviewerApprovalRate: 1,
        medianDurationMs: 8000,
        byEndState: {
          succeeded: 1,
          partially_succeeded: 0,
          changes_requested: 0,
          blocked: 0,
          aborted: 0,
          failed: 0,
        },
        exceptionsByClass: {},
      }),
    });

    render(<ModuleBaselineCard moduleId="repo-review" moduleVersion="1.0.0" />);

    expect(screen.getByText("No exceptions logged")).toBeInTheDocument();
  });

  it("renders 'Baseline unavailable' on error", () => {
    mockUseModuleBaseline.mockReturnValue({ status: "error" });

    render(<ModuleBaselineCard moduleId="repo-review" moduleVersion="1.0.0" />);

    expect(screen.getByText("Baseline unavailable")).toBeInTheDocument();
  });
});
