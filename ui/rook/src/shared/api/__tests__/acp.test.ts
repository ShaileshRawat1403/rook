import { beforeEach, describe, expect, it, vi } from "vitest";

const mockLoadSession = vi.fn();

vi.mock("../acpApi", () => ({
  listProviders: vi.fn(),
  prompt: vi.fn(),
  setModel: vi.fn(),
  listSessions: vi.fn(),
  loadSession: (...args: unknown[]) => mockLoadSession(...args),
  exportSession: vi.fn(),
  importSession: vi.fn(),
  forkSession: vi.fn(),
  cancelSession: vi.fn(),
}));

vi.mock("../acpNotificationHandler", () => ({
  setActiveMessageId: vi.fn(),
  clearActiveMessageId: vi.fn(),
}));

vi.mock("../sessionSearch", () => ({
  searchSessionsViaExports: vi.fn(),
}));

describe("acpLoadSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("restores the prior session mapping when replay loading fails", async () => {
    mockLoadSession.mockRejectedValueOnce(new Error("load failed"));

    const sessionTracker = await import("../acpSessionTracker");
    const { acpLoadSession } = await import("../acp");

    sessionTracker.registerSession(
      "local-session",
      "rook-session-1",
      "rook",
      "/tmp/original",
    );

    await expect(
      acpLoadSession("local-session", "rook-session-2", "/tmp/replay"),
    ).rejects.toThrow("load failed");

    expect(sessionTracker.getRookSessionId("local-session")).toBe(
      "rook-session-1",
    );
    expect(sessionTracker.getLocalSessionId("rook-session-1")).toBe(
      "local-session",
    );
    expect(sessionTracker.getLocalSessionId("rook-session-2")).toBeNull();
  });
});
