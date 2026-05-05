import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ColonyTaskBoard } from "./ColonyTaskBoard";
import type { ColonyTask } from "./types";

describe("ColonyTaskBoard", () => {
  it("ignores malformed persisted tasks and falls back for unknown statuses", () => {
    const tasks = [
      null,
      { id: "", title: "Missing id", status: "assigned" },
      {
        id: "task-1",
        title: "Recover the workspace",
        status: "stale",
        createdAt: "2026-05-05T00:00:00.000Z",
        updatedAt: "2026-05-05T00:00:00.000Z",
      },
    ] as unknown as ColonyTask[];

    render(
      <ColonyTaskBoard
        tasks={tasks}
        seats={[{ id: "worker", role: "worker", label: "Worker" }]}
        handoffsByTaskId={{}}
        onCreateTask={vi.fn()}
        onAssignTask={vi.fn()}
        onUpdateStatus={vi.fn()}
        onDeleteTask={vi.fn()}
      />,
    );

    expect(screen.getByText("Recover the workspace")).toBeInTheDocument();
    expect(screen.getAllByText("To Do").length).toBeGreaterThan(0);
    expect(screen.queryByText("Missing id")).not.toBeInTheDocument();
  });
});
