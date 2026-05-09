import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAgentStore } from "@/features/agents/stores/agentStore";
import { useChatSessionStore } from "@/features/chat/stores/chatSessionStore";
import { useChatStore } from "@/features/chat/stores/chatStore";
import { ColonyView } from "./ColonyView";
import { colonyStore } from "./colonyStore";

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
  useChatSessionStore.setState({
    sessions: [],
    activeSessionId: null,
    isLoading: false,
    contextPanelOpenBySession: {},
    activeWorkspaceBySession: {},
    activeWorkItemBySession: {},
    modelsBySession: {},
    modelCacheByProvider: {},
    modelLoadStateByProvider: {},
  });
  useChatStore.setState({
    messagesBySession: {},
    sessionStateById: {},
    queuedMessageBySession: {},
    draftsBySession: {},
    activeSessionId: null,
    isConnected: false,
    loadingSessionIds: new Set<string>(),
    scrollTargetMessageBySession: {},
  });
  useAgentStore.setState({ selectedProvider: "rook" });
}

function seedHandoff({ linkWorker = false }: { linkWorker?: boolean } = {}) {
  const colony = colonyStore
    .getState()
    .createColony("Colony Test", "Task-focused Colony");
  const planner = colony.seats.find((seat) => seat.role === "planner");
  const worker = colony.seats.find((seat) => seat.role === "worker");
  if (!planner || !worker) {
    throw new Error("Expected default colony seats");
  }

  let linkedSessionId: string | undefined;
  if (linkWorker) {
    const session = useChatSessionStore.getState().createDraftSession({
      title: "Colony: Worker",
      providerId: "rook",
    });
    linkedSessionId = session.id;
    colonyStore.getState().bindSeatToSession(colony.id, worker.id, {
      sessionId: session.id,
      acpSessionId: session.acpSessionId,
      providerId: session.providerId,
    });
  }

  const task = colonyStore
    .getState()
    .createTask(colony.id, "Implement the adoption bridge");
  const handoff = colonyStore
    .getState()
    .createHandoff(
      colony.id,
      planner.id,
      worker.id,
      task.id,
      "Build the staged draft workflow. Keep the user in control.",
    );

  return {
    colonyId: colony.id,
    workerId: worker.id,
    handoffId: handoff.id,
    linkedSessionId,
  };
}

async function openSendContext(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getAllByRole("button", { name: "Send Context" })[0]);
}

describe("ColonyView adoption workflow", () => {
  beforeEach(() => {
    localStorage.clear();
    resetStores();
    vi.clearAllMocks();
  });

  it("starts from intent-first empty state and keeps default role seats", async () => {
    const user = userEvent.setup();

    render(<ColonyView />);
    await user.click(screen.getByRole("button", { name: "Start with a task" }));

    const colony = colonyStore.getState().getActiveColony();
    expect(colony?.intent).toBe("Task-focused Colony");
    expect(colony?.seats.map((seat) => seat.role)).toEqual([
      "planner",
      "worker",
      "reviewer",
    ]);
  });

  it("stages a handoff into an existing linked role session", async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();
    const { linkedSessionId } = seedHandoff({ linkWorker: true });

    render(<ColonyView onNavigate={onNavigate} />);
    await openSendContext(user);
    await user.click(screen.getByRole("button", { name: "Stage in Session" }));

    expect(linkedSessionId).toBeDefined();
    const sessionId = linkedSessionId ?? "";
    expect(useChatStore.getState().draftsBySession[sessionId]).toContain(
      "Build the staged draft workflow",
    );
    expect(useChatSessionStore.getState().activeSessionId).toBe(
      linkedSessionId,
    );
    expect(useChatStore.getState().activeSessionId).toBe(linkedSessionId);
    expect(
      useChatStore.getState().messagesBySession[sessionId],
    ).toBeUndefined();
    expect(
      useChatStore.getState().queuedMessageBySession[sessionId],
    ).toBeUndefined();
    expect(onNavigate).toHaveBeenCalledWith("chat");
    expect(
      colonyStore
        .getState()
        .events.some((event) => event.type === "handoff_staged"),
    ).toBe(true);
    expect(
      colonyStore
        .getState()
        .events.some((event) => event.type === "handoff_copied"),
    ).toBe(false);
  });

  it("creates and binds a draft role session before staging when target is unlinked", async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();
    const { colonyId, workerId } = seedHandoff();

    render(<ColonyView onNavigate={onNavigate} />);
    await openSendContext(user);
    await user.click(screen.getByRole("button", { name: "Stage in Session" }));

    const colony = colonyStore
      .getState()
      .colonies.find((candidate) => candidate.id === colonyId);
    const worker = colony?.seats.find((seat) => seat.id === workerId);
    expect(worker?.binding).toBe("linked");
    expect(worker?.sessionId).toBeDefined();
    expect(useChatSessionStore.getState().sessions[0]?.title).toBe(
      "Colony: Worker",
    );
    const workerSessionId = worker?.sessionId ?? "";
    expect(useChatStore.getState().draftsBySession[workerSessionId]).toContain(
      "You are the Worker seat in Rook Colony.",
    );
    expect(
      useChatStore.getState().messagesBySession[workerSessionId],
    ).toBeUndefined();
    expect(
      useChatStore.getState().queuedMessageBySession[workerSessionId],
    ).toBeUndefined();
    expect(onNavigate).toHaveBeenCalledWith("chat");
  });

  it("keeps Copy Prompt as separate fallback evidence", () => {
    const { colonyId, handoffId } = seedHandoff();

    colonyStore.getState().markHandoffCopied(colonyId, handoffId);

    expect(
      colonyStore
        .getState()
        .events.some((event) => event.type === "handoff_copied"),
    ).toBe(true);
    expect(
      colonyStore
        .getState()
        .events.some((event) => event.type === "handoff_staged"),
    ).toBe(false);
  });

  it("warns and then closes when an incomplete Colony is closed via Close Anyway", async () => {
    const user = userEvent.setup();
    const colony = colonyStore
      .getState()
      .createColony("Active Colony", "Task-focused Colony");

    render(<ColonyView />);

    const closeButton = await screen.findByRole("button", {
      name: /Close Colony/i,
    });
    await user.click(closeButton);

    const warning = await screen.findByRole("alertdialog", {
      name: /Incomplete output contract warning/i,
    });
    expect(warning).toHaveTextContent(
      /does not fully satisfy its output contract/i,
    );
    expect(within(warning).getByRole("button", { name: /Cancel/i }));
    const closeAnyway = within(warning).getByRole("button", {
      name: /Close Anyway/i,
    });

    await user.click(closeAnyway);

    expect(
      screen.getByRole("status", { name: /Colony closed notice/i }),
    ).toHaveTextContent(/preserved for review/i);
    expect(
      screen.getByLabelText(/Colony status/i, { selector: "span" }),
    ).toHaveTextContent(/Closed/i);

    const stored = colonyStore
      .getState()
      .colonies.find((c) => c.id === colony.id);
    expect(stored?.lifecycleStatus).toBe("closed");
    expect(stored?.closedReason).toMatch(/incomplete output contract/i);
    expect(
      colonyStore.getState().events.some((e) => e.type === "colony_closed"),
    ).toBe(true);
  });

  it("Cancel on the incomplete warning leaves the Colony active", async () => {
    const user = userEvent.setup();
    const colony = colonyStore
      .getState()
      .createColony("Active Colony", "Task-focused Colony");

    render(<ColonyView />);

    await user.click(
      await screen.findByRole("button", { name: /Close Colony/i }),
    );
    const warning = await screen.findByRole("alertdialog", {
      name: /Incomplete output contract warning/i,
    });
    await user.click(within(warning).getByRole("button", { name: /Cancel/i }));

    expect(
      screen.queryByRole("alertdialog", {
        name: /Incomplete output contract warning/i,
      }),
    ).not.toBeInTheDocument();
    const stored = colonyStore
      .getState()
      .colonies.find((c) => c.id === colony.id);
    expect(stored?.lifecycleStatus).toBe("active");
    expect(stored?.closedAt).toBeUndefined();
  });

  it("Ready Colonies close directly without showing the incomplete warning", async () => {
    const user = userEvent.setup();
    const colony = colonyStore
      .getState()
      .createColony("Ready Colony", "Task-focused Colony");
    colonyStore.setState((state) => ({
      colonies: state.colonies.map((c) =>
        c.id !== colony.id
          ? c
          : {
              ...c,
              outputContract: {
                source: "recipe",
                recipeId: "repo-review",
                recipeVersion: "1.0.0",
                artifactType: "report",
                format: "markdown",
                requiredSections: [],
                evidenceRequired: false,
                reviewerRequired: false,
              },
              artifacts: [
                {
                  id: "a-1",
                  title: "Summary",
                  kind: "review",
                  content: "All good.",
                  createdAt: "2026-01-01T00:00:00.000Z",
                  updatedAt: "2026-01-01T00:00:00.000Z",
                },
              ],
            },
      ),
    }));

    render(<ColonyView />);

    await user.click(
      await screen.findByRole("button", { name: /Close Colony/i }),
    );

    expect(
      screen.queryByRole("alertdialog", {
        name: /Incomplete output contract warning/i,
      }),
    ).not.toBeInTheDocument();
    const stored = colonyStore
      .getState()
      .colonies.find((c) => c.id === colony.id);
    expect(stored?.lifecycleStatus).toBe("closed");
    expect(stored?.closedReason).toBeUndefined();
  });
});
