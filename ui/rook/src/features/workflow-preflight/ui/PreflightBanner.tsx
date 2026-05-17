import { useState } from "react";
import { cn } from "@/shared/lib/cn";
import type {
  PreflightCheckId,
  PreflightCheckResult,
  WorkflowPreflightResult,
} from "../types";

interface PreflightBannerProps {
  result: WorkflowPreflightResult | null;
  isLoading?: boolean;
  onRecheck?: () => void;
}

// Friendly labels for the six checks. Matches WORKFLOW_PREFLIGHT_V0_1.md §
// C1-C6. Kept in this file (not the orchestrator) because labels are a
// presentation concern; the orchestrator stays string-id only.
const CHECK_LABELS: Record<PreflightCheckId, string> = {
  provider_configured: "Provider configured",
  provider_runtime: "Provider runtime",
  artifact_directory: "Artifact directory",
  module_valid: "Workflow module valid",
  required_inputs: "Required inputs",
  output_contract_known: "Output contract known",
};

export function PreflightBanner({
  result,
  isLoading,
  onRecheck,
}: PreflightBannerProps) {
  if (isLoading || !result) {
    return (
      <div
        role="status"
        aria-live="polite"
        data-testid="preflight-loading"
        className="rounded-md border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground"
      >
        Checking workflow readiness…
      </div>
    );
  }

  if (result.ok) {
    return (
      <div
        role="status"
        className="rounded-md border border-green-500/30 bg-green-500/10 px-3 py-2 text-sm text-green-700 dark:text-green-400"
      >
        <p className="font-medium">Workflow is ready to start.</p>
        <ul className="mt-1.5 space-y-0.5 text-xs">
          {result.checks.map((check) => (
            <li key={check.id} className="flex items-center gap-1.5">
              <span aria-hidden="true">✓</span>
              <span>{CHECK_LABELS[check.id]}</span>
            </li>
          ))}
        </ul>
        {onRecheck ? <RecheckButton onClick={onRecheck} variant="ok" /> : null}
      </div>
    );
  }

  const failed = result.checks.filter((check) => !check.passed);

  return (
    <div
      role="alert"
      aria-live="polite"
      className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm"
    >
      <p className="font-medium text-red-700 dark:text-red-400">
        Cannot start workflow yet.
      </p>
      <ul className="mt-2 space-y-3">
        {failed.map((check) => (
          <FailedCheckRow key={check.id} check={check} />
        ))}
      </ul>
      {onRecheck ? <RecheckButton onClick={onRecheck} variant="error" /> : null}
    </div>
  );
}

function FailedCheckRow({ check }: { check: PreflightCheckResult }) {
  const [showTechnical, setShowTechnical] = useState(false);

  return (
    <li className="space-y-1">
      <p className="text-xs font-medium text-foreground/80">
        {CHECK_LABELS[check.id]}
      </p>
      {check.reason ? (
        <p className="text-xs text-foreground/80">{check.reason}</p>
      ) : null}
      {check.recovery ? (
        <p className="text-xs text-muted-foreground">
          <span className="font-medium">What you can do: </span>
          {check.recovery}
        </p>
      ) : null}
      {check.technical ? (
        <div>
          <button
            type="button"
            onClick={() => setShowTechnical((prev) => !prev)}
            aria-expanded={showTechnical}
            className="text-[11px] text-muted-foreground/70 underline-offset-2 hover:underline"
          >
            {showTechnical ? "Hide technical details" : "Technical details"}
          </button>
          {showTechnical ? (
            <pre
              data-testid={`preflight-technical-${check.id}`}
              className="mt-1 whitespace-pre-wrap break-words rounded border border-border/50 bg-muted/40 px-2 py-1 text-[11px] text-muted-foreground"
            >
              {check.technical}
            </pre>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}

function RecheckButton({
  onClick,
  variant,
}: {
  onClick: () => void;
  variant: "ok" | "error";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "mt-2 rounded border px-2 py-1 text-xs",
        variant === "ok"
          ? "border-green-500/30 text-green-700 hover:bg-green-500/10 dark:text-green-400"
          : "border-red-500/30 text-red-700 hover:bg-red-500/10 dark:text-red-400",
      )}
    >
      Re-check
    </button>
  );
}
