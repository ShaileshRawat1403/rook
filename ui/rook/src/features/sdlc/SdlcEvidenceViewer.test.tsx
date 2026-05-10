import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SdlcEvidenceViewer } from "./SdlcEvidenceViewer";
import type { VerificationReport } from "./types";

function makeReport(
  overrides: Partial<VerificationReport> = {},
): VerificationReport {
  return {
    schemaVersion: "0.1.0",
    source: "rook",
    runId: "run-123",
    repoRoot: "/tmp/rook",
    posture: "blocked",
    blockingReasons: ["Rust clippy failed"],
    checks: [
      {
        id: "rust-clippy",
        label: "Rust clippy",
        command: "cargo clippy --workspace --all-targets -- -D warnings",
        cwd: "/tmp/rook",
        required: true,
        status: "failed",
        exit_code: 101,
        duration_ms: 2400,
        stdout_preview: "checking rook",
        stderr_preview: "warning: denied",
      },
    ],
    evidence: [
      {
        schemaVersion: "0.1.0",
        receiptId: "receipt-123",
        runId: "run-123",
        claim: "Rust clippy failed",
        proofType: "command_result",
        source: "rook",
        checkId: "rust-clippy",
        status: "failed",
        command: "cargo clippy --workspace --all-targets -- -D warnings",
        cwd: "/tmp/rook",
        durationMs: 2400,
        digest: "abc123digest",
      },
    ],
    ...overrides,
  };
}

describe("SdlcEvidenceViewer", () => {
  it("renders no-report empty state", () => {
    render(<SdlcEvidenceViewer report={null} />);

    expect(screen.getByText("No verification report yet.")).toBeInTheDocument();
    expect(
      screen.getByText("Run verification explicitly to generate evidence."),
    ).toBeInTheDocument();
  });

  it("renders posture and run ID", () => {
    render(<SdlcEvidenceViewer report={makeReport()} />);

    const summary = screen.getByRole("region", {
      name: "Verification Summary",
    });

    expect(within(summary).getByText("blocked")).toBeInTheDocument();
    expect(within(summary).getByText("run-123")).toBeInTheDocument();
    expect(within(summary).getByText("/tmp/rook")).toBeInTheDocument();
  });

  it("renders check results", () => {
    render(<SdlcEvidenceViewer report={makeReport()} />);
    const checks = screen.getByRole("region", { name: "Checks" });

    expect(within(checks).getByText("Rust clippy")).toBeInTheDocument();
    expect(within(checks).getByText("failed")).toBeInTheDocument();
    expect(within(checks).getByText("Required")).toBeInTheDocument();
    expect(within(checks).getByText("2400 ms")).toBeInTheDocument();
    expect(
      within(checks).getByText(
        "cargo clippy --workspace --all-targets -- -D warnings",
      ),
    ).toBeInTheDocument();
    expect(within(checks).getByText("checking rook")).toBeInTheDocument();
    expect(within(checks).getByText("warning: denied")).toBeInTheDocument();
  });

  it("renders blocking reasons", () => {
    render(<SdlcEvidenceViewer report={makeReport()} />);
    const blockingReasons = screen.getByRole("region", {
      name: "Blocking Reasons",
    });

    expect(
      within(blockingReasons).getByText("Blocking Reasons"),
    ).toBeInTheDocument();
    expect(
      within(blockingReasons).getByText("Rust clippy failed"),
    ).toBeInTheDocument();
  });

  it("renders evidence receipts", () => {
    render(<SdlcEvidenceViewer report={makeReport()} />);
    const receipts = screen.getByRole("region", {
      name: "Evidence Receipts",
    });

    expect(within(receipts).getByText("Evidence Receipts")).toBeInTheDocument();
    expect(within(receipts).getByText("receipt-123")).toBeInTheDocument();
    expect(within(receipts).getByText("rust-clippy")).toBeInTheDocument();
    expect(within(receipts).getByText("command_result")).toBeInTheDocument();
    expect(within(receipts).getByText("abc123digest")).toBeInTheDocument();
  });
});
