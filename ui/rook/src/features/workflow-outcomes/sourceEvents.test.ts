import { describe, expect, it, vi, beforeEach } from "vitest";

const mockAppendRookEvent = vi.hoisted(() =>
  vi.fn<(input: unknown) => Promise<void>>(),
);
const mockIsTauriRuntimeAvailable = vi.hoisted(() => vi.fn<() => boolean>());

vi.mock("@/features/events", () => ({
  appendRookEvent: mockAppendRookEvent,
}));

vi.mock("@/shared/api/tauri", () => ({
  isTauriRuntimeAvailable: mockIsTauriRuntimeAvailable,
}));

describe("recordWorkflowSourceEvent + flushPendingSourceEvents", () => {
  beforeEach(() => {
    mockAppendRookEvent.mockReset();
    mockIsTauriRuntimeAvailable.mockReturnValue(true);
  });

  it("flushPendingSourceEvents resolves after all in-flight writes settle", async () => {
    let resolveFirst: () => void = () => {};
    let resolveSecond: () => void = () => {};
    mockAppendRookEvent.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveFirst = () => resolve();
        }),
    );
    mockAppendRookEvent.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveSecond = () => resolve();
        }),
    );

    const { recordWorkflowSourceEvent, flushPendingSourceEvents } =
      await import("./sourceEvents");

    recordWorkflowSourceEvent({
      runId: "r1",
      type: "operator.intervened",
      source: "operator",
      data: { reason: "adjust_scope", actor: "human_operator" },
    });
    recordWorkflowSourceEvent({
      runId: "r1",
      type: "operator.intervened",
      source: "operator",
      data: { reason: "request_output_changes", actor: "reviewer" },
    });

    let flushed = false;
    const flushPromise = flushPendingSourceEvents().then(() => {
      flushed = true;
    });

    // Without the writes settling, flush should not resolve.
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(flushed).toBe(false);

    resolveFirst();
    resolveSecond();
    await flushPromise;

    expect(flushed).toBe(true);
    expect(mockAppendRookEvent).toHaveBeenCalledTimes(2);
  });

  it("flushPendingSourceEvents returns immediately when no writes are in flight", async () => {
    const { flushPendingSourceEvents } = await import("./sourceEvents");
    await expect(flushPendingSourceEvents()).resolves.toBeUndefined();
  });

  it("write failures do not block flush", async () => {
    mockAppendRookEvent.mockRejectedValueOnce(new Error("disk full"));
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { recordWorkflowSourceEvent, flushPendingSourceEvents } =
      await import("./sourceEvents");

    recordWorkflowSourceEvent({
      runId: "r1",
      type: "operator.intervened",
      source: "operator",
      data: { reason: "adjust_scope", actor: "human_operator" },
    });

    await expect(flushPendingSourceEvents()).resolves.toBeUndefined();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});
