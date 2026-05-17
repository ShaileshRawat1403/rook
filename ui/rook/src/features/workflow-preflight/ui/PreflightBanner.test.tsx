import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PreflightBanner } from "./PreflightBanner";
import type {
  PreflightCheckResult,
  WorkflowPreflightResult,
} from "../types";

const ALL_PASS_CHECKS: PreflightCheckResult[] = [
  { id: "provider_configured", passed: true },
  { id: "provider_runtime", passed: true },
  { id: "artifact_directory", passed: true },
  { id: "module_valid", passed: true },
  { id: "required_inputs", passed: true },
  { id: "output_contract_known", passed: true },
];

function makeResult(overrides: Partial<WorkflowPreflightResult> = {}): WorkflowPreflightResult {
  return {
    schemaVersion: "0.1.0",
    ok: true,
    checks: ALL_PASS_CHECKS,
    ranAt: "2026-05-17T12:00:00.000Z",
    ...overrides,
  };
}

describe("PreflightBanner", () => {
  it("renders the loading state when isLoading=true", () => {
    render(<PreflightBanner result={null} isLoading={true} />);

    expect(screen.getByTestId("preflight-loading")).toBeInTheDocument();
    expect(screen.getByText(/checking workflow readiness/i)).toBeInTheDocument();
  });

  it("renders the loading state when result is null", () => {
    render(<PreflightBanner result={null} />);

    expect(screen.getByTestId("preflight-loading")).toBeInTheDocument();
  });

  it("renders the all-passed state with every check listed", () => {
    render(<PreflightBanner result={makeResult()} />);

    expect(screen.getByText(/workflow is ready to start/i)).toBeInTheDocument();
    expect(screen.getByText("Provider configured")).toBeInTheDocument();
    expect(screen.getByText("Provider runtime")).toBeInTheDocument();
    expect(screen.getByText("Artifact directory")).toBeInTheDocument();
    expect(screen.getByText("Workflow module valid")).toBeInTheDocument();
    expect(screen.getByText("Required inputs")).toBeInTheDocument();
    expect(screen.getByText("Output contract known")).toBeInTheDocument();
  });

  it("renders the one-failed state with reason and recovery", () => {
    const result = makeResult({
      ok: false,
      checks: [
        ...ALL_PASS_CHECKS.slice(0, 1),
        {
          id: "provider_runtime",
          passed: false,
          reason: "The local Rook runtime is missing or not executable.",
          recovery:
            "Rebuild the local Rook runtime: `cargo build --bin rook` from the project root.",
          technical: "/Users/x/target/debug/rook",
        },
        ...ALL_PASS_CHECKS.slice(2),
      ],
    });

    render(<PreflightBanner result={result} />);

    expect(screen.getByText(/cannot start workflow yet/i)).toBeInTheDocument();
    expect(
      screen.getByText(/local Rook runtime is missing/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/cargo build --bin rook/i)).toBeInTheDocument();
  });

  it("renders the multiple-failed state, listing every failed check", () => {
    const result = makeResult({
      ok: false,
      checks: [
        {
          id: "provider_configured",
          passed: false,
          reason: "No execution provider is configured.",
          recovery: "Choose a model provider in Settings.",
        },
        ALL_PASS_CHECKS[1],
        {
          id: "artifact_directory",
          passed: false,
          reason: "Rook couldn't access its artifact directory.",
          recovery: "Check permissions on `~/.rook/`.",
          technical: "EACCES",
        },
        ALL_PASS_CHECKS[3],
        {
          id: "required_inputs",
          passed: false,
          reason: "This workflow needs more input. Missing: description.",
          recovery:
            "Fill in the missing field on the Work Item: description.",
        },
        ALL_PASS_CHECKS[5],
      ],
    });

    render(<PreflightBanner result={result} />);

    expect(screen.getByText("Provider configured")).toBeInTheDocument();
    expect(screen.getByText("Artifact directory")).toBeInTheDocument();
    expect(screen.getByText("Required inputs")).toBeInTheDocument();
    expect(
      screen.getByText(/no execution provider is configured/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Rook couldn't access its artifact directory/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/this workflow needs more input/i),
    ).toBeInTheDocument();
  });

  it("hides technical details by default — they are NOT in the DOM", () => {
    const result = makeResult({
      ok: false,
      checks: [
        {
          id: "provider_runtime",
          passed: false,
          reason: "The local Rook runtime is missing or not executable.",
          recovery: "Rebuild the local Rook runtime.",
          technical: "/Users/secret/path/to/rook",
        },
      ],
    });

    render(<PreflightBanner result={result} />);

    // The raw technical path must NOT be in the DOM until the user
    // explicitly expands the disclosure. Protects the journey doc's
    // error-translation contract: no raw paths reach user surfaces by
    // default.
    expect(
      screen.queryByText("/Users/secret/path/to/rook"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId("preflight-technical-provider_runtime"),
    ).not.toBeInTheDocument();
  });

  it("shows technical details only after the disclosure is expanded", async () => {
    const user = userEvent.setup();
    const result = makeResult({
      ok: false,
      checks: [
        {
          id: "provider_runtime",
          passed: false,
          reason: "The local Rook runtime is missing or not executable.",
          recovery: "Rebuild the local Rook runtime.",
          technical: "/Users/secret/path/to/rook",
        },
      ],
    });

    render(<PreflightBanner result={result} />);

    const disclosure = screen.getByRole("button", {
      name: /technical details/i,
    });
    expect(disclosure).toHaveAttribute("aria-expanded", "false");

    await user.click(disclosure);

    expect(disclosure).toHaveAttribute("aria-expanded", "true");
    expect(
      screen.getByText("/Users/secret/path/to/rook"),
    ).toBeInTheDocument();
  });

  it("calls onRecheck when the recheck button is clicked", async () => {
    const user = userEvent.setup();
    const onRecheck = vi.fn();

    render(
      <PreflightBanner
        result={makeResult({ ok: false, checks: ALL_PASS_CHECKS.map((c, i) => i === 0 ? { ...c, passed: false, reason: "x", recovery: "y" } : c) })}
        onRecheck={onRecheck}
      />,
    );

    await user.click(screen.getByRole("button", { name: /re-check/i }));

    expect(onRecheck).toHaveBeenCalledTimes(1);
  });

  it("renders the recheck button on the all-passed state too", async () => {
    const user = userEvent.setup();
    const onRecheck = vi.fn();

    render(<PreflightBanner result={makeResult()} onRecheck={onRecheck} />);

    await user.click(screen.getByRole("button", { name: /re-check/i }));

    expect(onRecheck).toHaveBeenCalledTimes(1);
  });
});
