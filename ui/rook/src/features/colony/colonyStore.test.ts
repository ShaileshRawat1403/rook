import { beforeEach, describe, expect, it, vi } from "vitest";
import { colonyStore } from "./colonyStore";
import type { PersistedColonyState } from "./colonyPersistence";

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
