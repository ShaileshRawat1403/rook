import {
  AlertTriangle,
  CheckCircle2,
  Circle,
  FileText,
  GitBranch,
  Lock,
  Network,
  ShieldCheck,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import type { ColonySession } from "./types";

type ReadinessPanelTarget = "context" | "work" | "handoffs" | "artifacts";

type ReadinessItem = {
  id: string;
  label: string;
  detail: string;
  ready: boolean;
  panel?: ReadinessPanelTarget;
};

interface ColonyReadinessPanelProps {
  colony: ColonySession;
  sentinelMode: "off" | "dax_open";
  eventCount: number;
  onOpenPanel: (panel: ReadinessPanelTarget) => void;
}

function hasMemory(colony: ColonySession): boolean {
  const memory = colony.memory;
  if (!memory) return false;

  return Boolean(
    (memory.projectSummary ?? "").trim() ||
      (memory.repoNotes?.length ?? 0) ||
      (memory.decisions?.length ?? 0) ||
      (memory.constraints?.length ?? 0) ||
      (memory.risks?.length ?? 0) ||
      (memory.openQuestions?.length ?? 0),
  );
}

function buildReadinessItems(
  colony: ColonySession,
  sentinelMode: "off" | "dax_open",
  eventCount: number,
): ReadinessItem[] {
  const linkedSeats = colony.seats.filter((seat) => seat.binding === "linked");
  const reviewedHandoff = colony.handoffs.some(
    (handoff) => handoff.reviewStatus === "approved",
  );

  return [
    {
      id: "scope",
      label: "Scope selected",
      detail: colony.scope
        ? `${colony.scope.kind}: ${colony.scope.path || colony.scope.label}`
        : "Set a project or directory boundary.",
      ready: Boolean(colony.scope),
      panel: "context",
    },
    {
      id: "scope-lock",
      label: "Scope locked",
      detail: colony.scope?.locked
        ? "Run boundary is fixed for this colony."
        : "Lock the boundary before treating handoffs as durable.",
      ready: Boolean(colony.scope?.locked),
      panel: "context",
    },
    {
      id: "seats",
      label: "Seats linked",
      detail: `${linkedSeats.length}/${colony.seats.length} seats have sessions.`,
      ready: linkedSeats.length === colony.seats.length,
      panel: "work",
    },
    {
      id: "work",
      label: "Work captured",
      detail: colony.tasks.length
        ? `${colony.tasks.length} work item${
            colony.tasks.length === 1 ? "" : "s"
          } tracked.`
        : "Create at least one work item for the run.",
      ready: colony.tasks.length > 0,
      panel: "work",
    },
    {
      id: "handoff",
      label: "Reviewed handoff",
      detail: reviewedHandoff
        ? "At least one handoff has reviewer approval."
        : "Create and approve a handoff before relying on transferred context.",
      ready: reviewedHandoff,
      panel: "handoffs",
    },
    {
      id: "memory",
      label: "Memory captured",
      detail: hasMemory(colony)
        ? "Project summary, decisions, risks, or notes exist."
        : "Capture durable project facts and constraints.",
      ready: hasMemory(colony),
      panel: "context",
    },
    {
      id: "evidence",
      label: "Evidence trail",
      detail:
        eventCount > 1 || (colony.artifacts?.length ?? 0) > 0
          ? `${eventCount} activity events, ${colony.artifacts?.length ?? 0} saved outputs.`
          : "Generate activity or capture saved outputs for auditability.",
      ready: eventCount > 1 || (colony.artifacts?.length ?? 0) > 0,
      panel: "artifacts",
    },
    {
      id: "sentinel",
      label: "Safety advisory",
      detail:
        sentinelMode === "dax_open"
          ? "Safety posture is visible for governed work."
          : "Turn Safety to Advisory for enterprise pilot runs.",
      ready: sentinelMode === "dax_open",
    },
  ];
}

export function ColonyReadinessPanel({
  colony,
  sentinelMode,
  eventCount,
  onOpenPanel,
}: ColonyReadinessPanelProps) {
  const items = buildReadinessItems(colony, sentinelMode, eventCount);
  const readyCount = items.filter((item) => item.ready).length;
  const criticalReady =
    Boolean(colony.scope?.locked) && sentinelMode === "dax_open";
  const pilotReady = criticalReady && readyCount >= 6;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="text-sm">SDLC Readiness</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              Single-workspace pilot gate for long project work.
            </p>
          </div>
          <div
            className={`flex items-center gap-2 rounded-md px-2 py-1 text-xs ${
              pilotReady
                ? "bg-emerald-500 text-white"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {pilotReady ? (
              <ShieldCheck className="h-3.5 w-3.5" />
            ) : (
              <AlertTriangle className="h-3.5 w-3.5" />
            )}
            {readyCount}/{items.length}
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-2 md:grid-cols-2">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => item.panel && onOpenPanel(item.panel)}
            className="flex min-h-[68px] items-start gap-2 rounded-md border border-border bg-background p-2 text-left hover:bg-accent hover:text-accent-foreground"
          >
            {item.ready ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
            ) : (
              <Circle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-sm font-medium">
                {item.id === "scope-lock" && <Lock className="h-3 w-3" />}
                {item.id === "seats" && <Network className="h-3 w-3" />}
                {item.id === "work" && <GitBranch className="h-3 w-3" />}
                {item.id === "evidence" && <FileText className="h-3 w-3" />}
                <span>{item.label}</span>
              </div>
              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                {item.detail}
              </p>
            </div>
          </button>
        ))}
      </CardContent>
    </Card>
  );
}
