import { describe, expect, it, beforeEach, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import {
  useModuleBaseline,
  invalidateModuleBaseline,
  __resetModuleBaselineCache,
} from "./useModuleBaseline";
import type { ModuleBaseline } from "../baseline";

const mockGetModuleBaseline = vi.hoisted(() =>
  vi.fn<(moduleId: string, version: string) => Promise<ModuleBaseline>>(),
);

vi.mock("../baseline", async (original) => {
  const actual = await original<typeof import("../baseline")>();
  return {
    ...actual,
    getModuleBaseline: mockGetModuleBaseline,
  };
});

function makeBaseline(total: number): ModuleBaseline {
  return {
    moduleId: "repo-review",
    moduleVersion: "1.0.0",
    total,
    byEndState: {
      succeeded: total,
      partially_succeeded: 0,
      changes_requested: 0,
      blocked: 0,
      aborted: 0,
      failed: 0,
    },
    avgDurationMs: total === 0 ? null : 1000,
    medianDurationMs: total === 0 ? null : 1000,
    reviewerApprovalRate: 0,
    evidenceSatisfiedRate: 0,
    outputContractPassRate: 0,
    exceptionsByClass: {},
    interventionsByReason: {},
    exceptionRunsByClass: {},
    interventionRunsByReason: {},
    avgInterventionsPerRun: 0,
    avgExceptionsPerRun: 0,
  };
}

describe("useModuleBaseline", () => {
  beforeEach(() => {
    __resetModuleBaselineCache();
    mockGetModuleBaseline.mockReset();
  });

  it("invalidateModuleBaseline forces a refetch on next mount", async () => {
    mockGetModuleBaseline.mockResolvedValueOnce(makeBaseline(5));

    const first = renderHook(() => useModuleBaseline("repo-review", "1.0.0"));
    await waitFor(() => {
      expect(first.result.current.status).toBe("ready");
    });
    expect(mockGetModuleBaseline).toHaveBeenCalledTimes(1);

    // Remount without invalidation → cache hit, no new fetch.
    const second = renderHook(() => useModuleBaseline("repo-review", "1.0.0"));
    await waitFor(() => {
      expect(second.result.current.status).toBe("ready");
    });
    expect(mockGetModuleBaseline).toHaveBeenCalledTimes(1);

    // Invalidate → remount triggers a fresh fetch with new data.
    invalidateModuleBaseline("repo-review", "1.0.0");
    mockGetModuleBaseline.mockResolvedValueOnce(makeBaseline(6));

    const third = renderHook(() => useModuleBaseline("repo-review", "1.0.0"));
    await waitFor(() => {
      const state = third.result.current;
      expect(state.status).toBe("ready");
      if (state.status === "ready") {
        expect(state.baseline.total).toBe(6);
      }
    });
    expect(mockGetModuleBaseline).toHaveBeenCalledTimes(2);
  });

  it("invalidateModuleBaseline does not affect other module versions", async () => {
    mockGetModuleBaseline.mockResolvedValue(makeBaseline(3));

    const repoReview = renderHook(() =>
      useModuleBaseline("repo-review", "1.0.0"),
    );
    const prdBuilder = renderHook(() =>
      useModuleBaseline("prd-builder", "1.0.0"),
    );

    await waitFor(() => {
      expect(repoReview.result.current.status).toBe("ready");
      expect(prdBuilder.result.current.status).toBe("ready");
    });
    expect(mockGetModuleBaseline).toHaveBeenCalledTimes(2);

    invalidateModuleBaseline("repo-review", "1.0.0");

    // Remount prd-builder → still cached, no new fetch.
    renderHook(() => useModuleBaseline("prd-builder", "1.0.0"));
    expect(mockGetModuleBaseline).toHaveBeenCalledTimes(2);

    // Remount repo-review → fresh fetch.
    renderHook(() => useModuleBaseline("repo-review", "1.0.0"));
    await waitFor(() => {
      expect(mockGetModuleBaseline).toHaveBeenCalledTimes(3);
    });
  });
});
