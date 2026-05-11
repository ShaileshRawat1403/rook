import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SettingsModal } from "./SettingsModal";

const mockInvokeTauri = vi.fn();

vi.mock("@/shared/api/tauri", () => ({
  invokeTauri: (...args: unknown[]) => mockInvokeTauri(...args),
  isTauriRuntimeAvailable: () => false,
}));

describe("SettingsModal", () => {
  it("renders the SDLC verification surface", () => {
    render(<SettingsModal onClose={vi.fn()} initialSection="verification" />);

    expect(screen.getByText("SDLC Verification")).toBeInTheDocument();
    expect(screen.getByLabelText("Repo path")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Run Verification" }),
    ).toBeInTheDocument();
    expect(mockInvokeTauri).not.toHaveBeenCalled();
  });
});
