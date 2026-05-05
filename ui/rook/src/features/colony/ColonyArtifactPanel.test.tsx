import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ColonyArtifactPanel } from "./ColonyArtifactPanel";

describe("ColonyArtifactPanel", () => {
  it("fills content from a selected seat output without creating an artifact", async () => {
    const user = userEvent.setup();
    const onCreate = vi.fn();

    render(
      <ColonyArtifactPanel
        colonyId="colony-1"
        artifacts={[]}
        tasks={[]}
        handoffs={[]}
        seats={[{ id: "worker", label: "Worker" }]}
        onCreate={onCreate}
        onDelete={vi.fn()}
        onUpdate={vi.fn()}
        onExtractFromSeat={(seatId) =>
          seatId === "worker" ? "Latest worker output" : null
        }
      />,
    );

    await user.click(screen.getByRole("button", { name: "Add Saved Output" }));
    await user.selectOptions(screen.getByLabelText("Source Seat"), "worker");
    await user.click(
      screen.getByRole("button", { name: "Fill from Seat Output" }),
    );

    expect(screen.getByLabelText("Content")).toHaveValue(
      "Latest worker output",
    );
    expect(onCreate).not.toHaveBeenCalled();
  });
});
