import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SdlcVerificationPanel } from "./SdlcVerificationPanel";
import type { VerificationReport } from "./types";

const mockInvokeTauri = vi.fn();

vi.mock("@/shared/api/tauri", () => ({
  invokeTauri: (...args: unknown[]) => mockInvokeTauri(...args),
}));

function makeReport(
  overrides: Partial<VerificationReport> = {},
): VerificationReport {
  return {
    schemaVersion: "0.1.0",
    source: "rook",
    runId: "run-123",
    repoRoot: "/tmp/rook",
    posture: "verified",
    blockingReasons: [],
    checks: [
      {
        id: "rust-test",
        label: "Rust tests",
        command: "cargo test --workspace",
        cwd: "/tmp/rook",
        required: true,
        status: "passed",
        exit_code: 0,
        duration_ms: 1200,
        stdout_preview: "test result: ok",
        stderr_preview: "",
      },
    ],
    evidence: [
      {
        schemaVersion: "0.1.0",
        receiptId: "receipt-123",
        runId: "run-123",
        claim: "Rust tests passed",
        proofType: "command_result",
        source: "rook",
        checkId: "rust-test",
        status: "passed",
        command: "cargo test --workspace",
        cwd: "/tmp/rook",
        durationMs: 1200,
        digest: "digest-123",
      },
    ],
    ...overrides,
  };
}

describe("SdlcVerificationPanel", () => {
  beforeEach(() => {
    mockInvokeTauri.mockReset();
  });

  it("renders repo path input and Run Verification button", () => {
    render(<SdlcVerificationPanel />);

    expect(screen.getByLabelText("Repo path")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Run Verification" }),
    ).toBeInTheDocument();
    expect(screen.getByText("No verification report yet.")).toBeInTheDocument();
  });

  it("clicking Run Verification calls verify_sdlc_repo with the entered path", async () => {
    const user = userEvent.setup();
    mockInvokeTauri.mockResolvedValue(makeReport());

    render(<SdlcVerificationPanel />);

    await user.type(screen.getByLabelText("Repo path"), "  /tmp/rook  ");
    await user.click(screen.getByRole("button", { name: "Run Verification" }));

    expect(mockInvokeTauri).toHaveBeenCalledWith("verify_sdlc_repo", {
      repoRoot: "/tmp/rook",
    });
  });

  it("shows loading state while running", async () => {
    const user = userEvent.setup();
    let resolveReport: (report: VerificationReport) => void = () => {};
    mockInvokeTauri.mockReturnValue(
      new Promise<VerificationReport>((resolve) => {
        resolveReport = resolve;
      }),
    );

    render(<SdlcVerificationPanel />);

    await user.type(screen.getByLabelText("Repo path"), "/tmp/rook");
    await user.click(screen.getByRole("button", { name: "Run Verification" }));

    expect(
      screen.getByRole("button", { name: "Running Verification" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("region", { name: "SDLC Verification" }),
    ).toHaveAttribute("aria-busy", "true");

    resolveReport(makeReport());

    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Run Verification" }),
      ).toBeEnabled(),
    );
  });

  it("successful command response renders the report", async () => {
    const user = userEvent.setup();
    mockInvokeTauri.mockResolvedValue(makeReport());

    render(<SdlcVerificationPanel />);

    await user.type(screen.getByLabelText("Repo path"), "/tmp/rook");
    await user.click(screen.getByRole("button", { name: "Run Verification" }));

    expect(await screen.findByText("run-123")).toBeInTheDocument();
    expect(screen.getByText("verified")).toBeInTheDocument();
    expect(screen.getByText("Rust tests")).toBeInTheDocument();
    expect(screen.getByText("receipt-123")).toBeInTheDocument();
  });

  it("failed command response shows safe error", async () => {
    const user = userEvent.setup();
    mockInvokeTauri.mockRejectedValue(
      new Error("repository path must be a directory"),
    );

    render(<SdlcVerificationPanel />);

    await user.type(screen.getByLabelText("Repo path"), "/tmp/rook/Cargo.toml");
    await user.click(screen.getByRole("button", { name: "Run Verification" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "repository path must be a directory",
    );
    expect(screen.getByText("No verification report yet.")).toBeInTheDocument();
  });

  it("empty path does not call the command", async () => {
    const user = userEvent.setup();

    render(<SdlcVerificationPanel />);

    await user.click(screen.getByRole("button", { name: "Run Verification" }));

    expect(mockInvokeTauri).not.toHaveBeenCalled();
  });
});
