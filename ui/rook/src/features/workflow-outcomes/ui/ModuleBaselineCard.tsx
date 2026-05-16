import { useModuleBaseline } from "./useModuleBaseline";
import type { ModuleBaseline } from "../baseline";
import type { WorkflowExceptionClass } from "../types";

interface ModuleBaselineCardProps {
  moduleId: string;
  moduleVersion: string;
}

interface TopException {
  class: WorkflowExceptionClass;
  count: number;
}

function pickTopException(
  exceptionsByClass: ModuleBaseline["exceptionsByClass"],
): TopException | null {
  let top: TopException | null = null;
  for (const [exceptionClass, count] of Object.entries(exceptionsByClass)) {
    if (count === undefined) continue;
    if (top === null || count > top.count) {
      top = {
        class: exceptionClass as WorkflowExceptionClass,
        count,
      };
    }
  }
  return top;
}

function formatPercent(rate: number): string {
  return `${Math.round(rate * 100)}%`;
}

function formatDuration(ms: number | null): string {
  if (ms === null) return "—";
  if (ms < 1000) return `${ms}ms`;
  const seconds = ms / 1000;
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const minutes = seconds / 60;
  return `${minutes.toFixed(1)}m`;
}

export function ModuleBaselineCard({
  moduleId,
  moduleVersion,
}: ModuleBaselineCardProps) {
  const state = useModuleBaseline(moduleId, moduleVersion);

  if (state.status === "loading") {
    return (
      <div
        data-testid="baseline-loading"
        className="mt-1 h-3 w-32 animate-pulse rounded bg-muted"
      />
    );
  }

  if (state.status === "error") {
    return (
      <p className="mt-1 text-[11px] text-muted-foreground/60">
        Baseline unavailable
      </p>
    );
  }

  if (state.status === "empty") {
    return (
      <p className="mt-1 text-[11px] text-muted-foreground/80">No runs yet</p>
    );
  }

  const { baseline } = state;
  const topException = pickTopException(baseline.exceptionsByClass);

  return (
    <div className="mt-1 space-y-0.5 text-[11px] text-muted-foreground">
      <p>
        <span className="font-medium text-foreground/80">
          {baseline.total}
        </span>{" "}
        {baseline.total === 1 ? "run" : "runs"} ·{" "}
        <span className="font-medium text-foreground/80">
          {formatPercent(baseline.reviewerApprovalRate)}
        </span>{" "}
        approved · {formatDuration(baseline.medianDurationMs)} median
      </p>
      {topException ? (
        <p>
          Top concern:{" "}
          <span className="font-medium text-foreground/80">
            {topException.class}
          </span>{" "}
          ({topException.count} of {baseline.total})
        </p>
      ) : (
        <p>No exceptions logged</p>
      )}
    </div>
  );
}
