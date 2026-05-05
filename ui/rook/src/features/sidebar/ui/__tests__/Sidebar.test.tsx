import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Sidebar } from "../Sidebar";
import type { ColonySession } from "@/features/colony/types";

const mockSessions: Array<{
  id: string;
  title: string;
  updatedAt: string;
  messageCount: number;
  projectId?: string;
  draft?: boolean;
  archivedAt?: string;
}> = [];
let mockActiveColony: ColonySession | null = null;

vi.mock("@/features/chat/stores/chatStore", () => ({
  useChatStore: () => ({
    getSessionRuntime: () => ({
      chatState: "idle",
      hasUnread: false,
    }),
  }),
}));

vi.mock("@/features/chat/stores/chatSessionStore", () => ({
  useChatSessionStore: () => ({
    sessions: mockSessions,
  }),
}));

vi.mock("@/features/agents/stores/agentStore", () => ({
  useAgentStore: () => ({
    getPersonaById: () => undefined,
  }),
}));

vi.mock("@/features/projects/stores/projectStore", () => ({
  useProjectStore: () => ({
    projects: [],
  }),
}));

vi.mock("@/features/colony/colonyStore", () => ({
  useColonyStore: (selector: (state: unknown) => unknown) =>
    selector({
      getActiveColony: () => mockActiveColony,
    }),
}));

describe("Sidebar", () => {
  afterEach(() => {
    mockSessions.splice(0, mockSessions.length);
    mockActiveColony = null;
  });

  it("shows sessions in recents when their project is not loaded", () => {
    mockSessions.splice(0, mockSessions.length, {
      id: "session-1",
      title: "Recovered Session",
      updatedAt: "2026-04-09T12:00:00.000Z",
      messageCount: 3,
      projectId: "missing-project",
    });

    render(
      <Sidebar
        collapsed={false}
        onCollapse={vi.fn()}
        onNavigate={vi.fn()}
        onSelectSession={vi.fn()}
        projects={[]}
      />,
    );

    expect(screen.getByText("Recovered Session")).toBeInTheDocument();
  });

  it("renders a home button in the sidebar header and navigates home", async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();

    render(
      <Sidebar
        collapsed={false}
        onCollapse={vi.fn()}
        onNavigate={onNavigate}
        projects={[]}
      />,
    );

    await user.click(screen.getByRole("button", { name: /home/i }));

    expect(onNavigate).toHaveBeenCalledWith("home");
  });

  it("keeps the home button visible when the sidebar is collapsed", () => {
    render(
      <Sidebar
        collapsed
        onCollapse={vi.fn()}
        onNavigate={vi.fn()}
        projects={[]}
      />,
    );

    expect(screen.getByRole("button", { name: /home/i })).toBeInTheDocument();
  });

  it("shows active colony role sessions as container children", async () => {
    const user = userEvent.setup();
    const onSelectSession = vi.fn();
    mockActiveColony = {
      id: "colony-1",
      title: "Colony 5/5/2026",
      intent: "Task-focused Colony",
      seats: [
        {
          id: "planner",
          role: "planner",
          label: "Planner",
          binding: "linked",
          status: "idle",
          sessionId: "session-planner",
        },
        {
          id: "worker",
          role: "worker",
          label: "Worker",
          binding: "linked",
          status: "idle",
          sessionId: "session-worker",
        },
        {
          id: "reviewer",
          role: "reviewer",
          label: "Reviewer",
          binding: "unbound",
          status: "idle",
        },
      ],
      tasks: [],
      handoffs: [],
      sentinelMode: "off",
      createdAt: "2026-05-05T00:00:00.000Z",
      updatedAt: "2026-05-05T00:00:00.000Z",
    };

    render(
      <Sidebar
        collapsed={false}
        onCollapse={vi.fn()}
        onNavigate={vi.fn()}
        onSelectSession={onSelectSession}
        projects={[]}
      />,
    );

    expect(screen.getByText("Colony 5/5/2026")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Planner" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Worker" })).toBeEnabled();
    expect(
      screen.getByRole("button", { name: /Reviewer Not linked/i }),
    ).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "Worker" }));

    expect(onSelectSession).toHaveBeenCalledWith("session-worker");
  });
});
