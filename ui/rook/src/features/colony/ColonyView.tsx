import { useCallback, useState, useEffect } from "react";
import {
  ArrowRight,
  BriefcaseBusiness,
  ClipboardList,
  FileText,
  GitBranch,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useColonyStore, colonyStore, isColonyClosed } from "./colonyStore";
import { getColonyOutputReadiness } from "./outputReadiness";
import { getConfiguredSentinelMode } from "@/shared/api/sentinel";
import { ColonyTranscript } from "./ColonyTranscript";
import { ColonyRecipeEntry } from "./ColonyRecipeEntry";
import { ColonyTaskBoard } from "./ColonyTaskBoard";
import { ColonyHandoffPanel } from "./ColonyHandoffPanel";
import { ColonyMemoryPanel } from "./ColonyMemoryPanel";
import { ColonyArtifactPanel } from "./ColonyArtifactPanel";
import { ColonyOutputReadinessPanel } from "./ColonyOutputReadinessPanel";
import { ColonyReadinessPanel } from "./ColonyReadinessPanel";
import { SwarmPanel } from "./swarm/SwarmPanel";
import { useChatSessionStore } from "@/features/chat/stores/chatSessionStore";
import { useChatStore } from "@/features/chat/stores/chatStore";
import { useAgentStore } from "@/features/agents/stores/agentStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import type { AppView } from "@/app/AppShell";
import type { ColonyTask } from "./types";

export type ColonyPanel =
  | "overview"
  | "readiness"
  | "context"
  | "work"
  | "handoffs"
  | "swarm"
  | "artifacts"
  | "activity";

const PANELS: { id: ColonyPanel; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "work", label: "Work" },
  { id: "handoffs", label: "Context" },
  { id: "context", label: "Notes" },
  { id: "artifacts", label: "Outputs" },
  { id: "activity", label: "Audit" },
];

const START_OPTIONS = [
  { label: "Start with a task", intent: "Task-focused Colony" },
  { label: "Review this repo", intent: "Repo review Colony" },
  { label: "Plan work", intent: "Planning Colony" },
  { label: "Advanced Colony", intent: "Advanced Colony" },
] as const;

interface ColonyViewProps {
  onNavigate?: (view: AppView) => void;
}

export function ColonyView({ onNavigate }: ColonyViewProps) {
  const [activePanel, setActivePanel] = useState<ColonyPanel>("overview");

  const {
    colonies,
    activeColonyId,
    sentinelMode,
    events,
    setSentinelMode,
    syncSentinelMode,
    createColony,
    closeColony,
    setColonyScope,
    updateColonyMemory,
    addMemoryItem,
    removeMemoryItem,
    bindSeatToSession,
    setActiveSeat,
    openSessionForSeat,
    createTask,
    assignTaskToSeat,
    updateTaskStatus,
    deleteTask,
    createHandoff,
    markHandoffCopied,
    markHandoffStaged,
    deleteHandoff,
    createArtifact,
    deleteArtifact,
  } = useColonyStore();

  const sessionStore = useChatSessionStore();
  const chatStore = useChatStore();
  const agentStore = useAgentStore();

  const activeColony = colonies.find((c) => c.id === activeColonyId) ?? null;
  const [scopePathInput, setScopePathInput] = useState("");

  useEffect(() => {
    let cancelled = false;
    const fetchMode = () => {
      void getConfiguredSentinelMode().then((nextMode) => {
        if (!cancelled && nextMode !== sentinelMode) {
          syncSentinelMode(nextMode);
        }
      });
    };

    const listener = () => fetchMode();
    if (typeof window !== "undefined") {
      window.addEventListener("sentinel-mode-changed", listener);
    }
    return () => {
      cancelled = true;
      if (typeof window !== "undefined") {
        window.removeEventListener("sentinel-mode-changed", listener);
      }
    };
  }, [sentinelMode, syncSentinelMode]);

  const hasColonyState =
    activeColony &&
    (activeColony.tasks.length > 0 ||
      activeColony.handoffs.length > 0 ||
      activeColony.seats.some((s) => s.binding === "linked"));

  const handleCreateColony = useCallback(
    (intent = "New Colony") => {
      const now = new Date().toISOString();
      const title = `Colony ${new Date(now).toLocaleDateString()}`;
      createColony(title, intent);
    },
    [createColony],
  );

  const [incompleteWarningColonyId, setIncompleteWarningColonyId] = useState<
    string | null
  >(null);
  const showIncompleteWarning = incompleteWarningColonyId === activeColonyId;

  const handleCloseColony = useCallback(() => {
    if (!activeColony || !activeColonyId) return;
    const readiness = getColonyOutputReadiness(activeColony);
    if (readiness.status === "ready") {
      closeColony(activeColonyId);
      return;
    }
    setIncompleteWarningColonyId(activeColonyId);
  }, [activeColony, activeColonyId, closeColony]);

  const handleConfirmClose = useCallback(() => {
    if (!activeColony || !activeColonyId) return;
    const readiness = getColonyOutputReadiness(activeColony);
    closeColony(
      activeColonyId,
      `Closed with incomplete output contract: ${readiness.status}`,
    );
    setIncompleteWarningColonyId(null);
  }, [activeColony, activeColonyId, closeColony]);

  const handleCancelClose = useCallback(() => {
    setIncompleteWarningColonyId(null);
  }, []);

  const colonyClosed = isColonyClosed(activeColony);

  const sentinelLabel =
    sentinelMode === "off" ? "Safety: Off" : "Safety: Advisory";

  const handleOpenSession = useCallback(
    async (sessionId: string, seatId: string) => {
      await sessionStore.loadSessions();
      sessionStore.setActiveSession(sessionId);
      chatStore.setActiveSession(sessionId);
      if (activeColonyId) {
        openSessionForSeat(activeColonyId, seatId);
      }
      if (onNavigate) {
        onNavigate("chat");
      }
    },
    [sessionStore, chatStore, activeColonyId, openSessionForSeat, onNavigate],
  );

  const handleSelectSeat = useCallback(
    (seatId: string) => {
      if (!activeColonyId) return;
      setActiveSeat(activeColonyId, seatId);
    },
    [activeColonyId, setActiveSeat],
  );

  const handleTaskCreate = useCallback(
    (title: string, _description?: string) => {
      if (!activeColonyId) return;
      createTask(activeColonyId, title);
    },
    [activeColonyId, createTask],
  );

  const handleTaskAssign = useCallback(
    (taskId: string, seatId: string | null) => {
      if (!activeColonyId) return;
      assignTaskToSeat(activeColonyId, taskId, seatId);
    },
    [activeColonyId, assignTaskToSeat],
  );

  const handleTaskStatus = useCallback(
    (taskId: string, status: ColonyTask["status"]) => {
      if (!activeColonyId) return;
      updateTaskStatus(activeColonyId, taskId, status);
    },
    [activeColonyId, updateTaskStatus],
  );

  const handleTaskDelete = useCallback(
    (taskId: string) => {
      if (!activeColonyId) return;
      deleteTask(activeColonyId, taskId);
    },
    [activeColonyId, deleteTask],
  );

  const handleHandoffCreate = useCallback(
    (
      fromSeatId: string,
      toSeatId: string,
      taskId?: string,
      summary?: string,
    ) => {
      if (!activeColonyId) return;
      createHandoff(activeColonyId, fromSeatId, toSeatId, taskId, summary);
    },
    [activeColonyId, createHandoff],
  );

  const handleHandoffCopy = useCallback(
    (handoffId: string) => {
      if (!activeColonyId) return;
      markHandoffCopied(activeColonyId, handoffId);
    },
    [activeColonyId, markHandoffCopied],
  );

  const handleHandoffDelete = useCallback(
    (handoffId: string) => {
      if (!activeColonyId) return;
      deleteHandoff(activeColonyId, handoffId);
    },
    [activeColonyId, deleteHandoff],
  );

  const handleHandoffReview = useCallback(
    (
      handoffId: string,
      reviewStatus: "approved" | "rejected",
      reviewNote?: string,
    ) => {
      if (!activeColonyId) return;
      colonyStore
        .getState()
        .reviewHandoff(activeColonyId, handoffId, reviewStatus, reviewNote);
    },
    [activeColonyId],
  );

  const handleStageHandoff = useCallback(
    async (handoffId: string) => {
      if (!activeColony) return;
      const handoff = activeColony.handoffs.find((h) => h.id === handoffId);
      if (!handoff) return;

      const toSeat = activeColony.seats.find((s) => s.id === handoff.toSeatId);
      if (!toSeat) return;

      const fromSeat = activeColony.seats.find(
        (s) => s.id === handoff.fromSeatId,
      );
      const task = activeColony.tasks.find((t) => t.id === handoff.taskId);

      const prompt = `You are the ${toSeat.label} seat in Rook Colony.

Context from ${fromSeat?.label ?? "Unknown"}${task ? `\nTask: ${task.title}` : ""}

${handoff.summary.trim()}

Use this context to continue the work.
Do not add scope beyond the assigned task.`;

      let sessionId = toSeat.sessionId;
      if (!sessionId) {
        const session = sessionStore.createDraftSession({
          title: `Colony: ${toSeat.label}`,
          projectId: activeColony.projectId,
          providerId: agentStore.selectedProvider,
        });
        sessionId = session.id;
        if (activeColonyId) {
          bindSeatToSession(activeColonyId, toSeat.id, {
            sessionId: session.id,
            acpSessionId: session.acpSessionId,
            providerId: session.providerId,
            projectId: session.projectId ?? undefined,
          });
        }
      }

      chatStore.setDraft(sessionId, prompt);
      sessionStore.setActiveSession(sessionId);
      chatStore.setActiveSession(sessionId);

      if (activeColonyId) {
        openSessionForSeat(activeColonyId, toSeat.id);
        markHandoffStaged(activeColonyId, handoffId);
      }
      if (onNavigate) {
        onNavigate("chat");
      }
    },
    [
      activeColony,
      activeColonyId,
      agentStore.selectedProvider,
      bindSeatToSession,
      chatStore,
      markHandoffStaged,
      onNavigate,
      openSessionForSeat,
      sessionStore,
    ],
  );

  const handleScopeSet = useCallback(
    (kind: "planning" | "directory") => {
      if (!activeColonyId) return;
      const now = new Date().toISOString();
      setColonyScope(activeColonyId, {
        kind,
        label: kind === "planning" ? "Planning Only" : "Local Directory",
        path: kind === "directory" ? "" : undefined,
        branch: null,
        locked: false,
        createdAt: now,
        updatedAt: now,
      });
    },
    [activeColonyId, setColonyScope],
  );

  const handleScopeUpdate = useCallback(() => {
    if (!activeColonyId || !activeColony?.scope || activeColony.scope.locked) {
      return;
    }
    const now = new Date().toISOString();
    setColonyScope(activeColonyId, {
      ...activeColony.scope,
      path: scopePathInput || activeColony.scope.path,
      updatedAt: now,
    });
    setScopePathInput("");
  }, [activeColonyId, activeColony?.scope, scopePathInput, setColonyScope]);

  const handleScopeLockToggle = useCallback(() => {
    if (!activeColonyId || !activeColony?.scope) return;
    const now = new Date().toISOString();
    setColonyScope(activeColonyId, {
      ...activeColony.scope,
      locked: !activeColony.scope.locked,
      updatedAt: now,
    });
  }, [activeColonyId, activeColony?.scope, setColonyScope]);

  const handleExtractFromSeat = useCallback(
    (seatId: string) => {
      if (!activeColony) return null;
      const seat = activeColony.seats.find((s) => s.id === seatId);
      if (!seat?.sessionId) return null;

      const messages = chatStore.messagesBySession[seat.sessionId];
      if (!messages || messages.length === 0) return null;

      // Find the last assistant message
      for (let i = messages.length - 1; i >= 0; i--) {
        const msg = messages[i];
        if (msg.role === "assistant") {
          // Extract text from content blocks
          const textContent = msg.content
            .filter((c) => c.type === "text")
            .map((c) => c.text)
            .join("\n");
          if (textContent.trim()) {
            return textContent.trim();
          }
        }
      }
      return null;
    },
    [activeColony, chatStore.messagesBySession],
  );

  const getScopeSummary = () => {
    if (!activeColony?.scope) return "No scope selected";
    if (activeColony.scope.kind === "directory") {
      return activeColony.scope.path || "Directory scope";
    }
    return activeColony.scope.label || "Planning scope";
  };

  const getLatestEventLabel = () => {
    const latest = events.at(-1);
    if (!latest) return "No activity yet";
    return latest.type.replaceAll("_", " ");
  };

  const renderRoleStrip = () => {
    if (!activeColony) return null;

    return (
      <div className="grid gap-2 lg:grid-cols-3">
        {activeColony.seats.map((seat) => {
          const task = seat.currentTask
            ? activeColony.tasks.find(
                (candidate) => candidate.id === seat.currentTask,
              )
            : null;
          const linked = seat.binding === "linked";
          return (
            <button
              key={seat.id}
              type="button"
              onClick={() => {
                handleSelectSeat(seat.id);
                if (seat.sessionId) {
                  void handleOpenSession(seat.sessionId, seat.id);
                }
              }}
              className={`flex min-h-[76px] items-center justify-between rounded-lg border px-4 py-3 text-left transition-colors ${
                activeColony.activeSeatId === seat.id
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-background hover:bg-accent hover:text-accent-foreground"
              }`}
            >
              <div className="min-w-0">
                <div className="text-sm font-medium">{seat.label}</div>
                <div className="mt-1 truncate text-xs opacity-70">
                  {task?.title ?? "No assigned work"}
                </div>
              </div>
              <div
                className={`shrink-0 rounded-full px-2 py-1 text-[11px] ${
                  activeColony.activeSeatId === seat.id
                    ? "bg-background/15"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {linked ? "Linked" : "Unlinked"}
              </div>
            </button>
          );
        })}
      </div>
    );
  };

  const renderWorkspaceBrief = () => {
    if (!activeColony) return null;
    const linkedSeats = activeColony.seats.filter(
      (seat) => seat.binding === "linked",
    ).length;
    const openTasks = activeColony.tasks.filter(
      (task) => task.status !== "done",
    ).length;

    return (
      <div className="rounded-2xl border border-border bg-card px-5 py-4 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-semibold">{activeColony.title}</h2>
              <span className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
                {activeColony.intent}
              </span>
            </div>
            <p className="mt-2 max-w-3xl truncate text-sm text-muted-foreground">
              {getScopeSummary()}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2 text-xs">
            {colonyClosed && (
              <span
                role="status"
                aria-label="Colony status"
                className="rounded-full border border-border bg-muted px-3 py-1.5 font-medium"
              >
                Closed
              </span>
            )}
            <span className="rounded-full border border-border px-3 py-1.5">
              {openTasks} open work
            </span>
            <span className="rounded-full border border-border px-3 py-1.5">
              {linkedSeats}/{activeColony.seats.length} roles linked
            </span>
            <span className="rounded-full border border-border px-3 py-1.5">
              {activeColony.handoffs.length} context packets
            </span>
          </div>
        </div>
      </div>
    );
  };

  const renderPanel = () => {
    if (!activeColony) return null;

    switch (activePanel) {
      case "overview":
        return (
          <div className="flex flex-1 flex-col gap-5">
            <section className="grid gap-3 xl:grid-cols-[1.4fr_1fr]">
              <div className="rounded-2xl border border-border bg-background p-5">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <BriefcaseBusiness className="h-4 w-4" />
                  Workspace Brief
                </div>
                <div className="mt-5 grid gap-4 sm:grid-cols-3">
                  <div>
                    <div className="text-xs uppercase text-muted-foreground">
                      Scope
                    </div>
                    <div className="mt-1 truncate text-sm font-medium">
                      {getScopeSummary()}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs uppercase text-muted-foreground">
                      Current Work
                    </div>
                    <div className="mt-1 text-sm font-medium">
                      {activeColony.tasks.length
                        ? `${activeColony.tasks.length} work item${
                            activeColony.tasks.length === 1 ? "" : "s"
                          }`
                        : "No work item yet"}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs uppercase text-muted-foreground">
                      Evidence
                    </div>
                    <button
                      type="button"
                      onClick={() => setActivePanel("activity")}
                      className="mt-1 max-w-full truncate text-left text-sm font-medium hover:underline"
                    >
                      {getLatestEventLabel()}
                    </button>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-foreground p-5 text-background">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Sparkles className="h-4 w-4" />
                  Next Step
                </div>
                <p className="mt-3 text-sm opacity-75">
                  Move from intent to reviewed context without sending anything
                  automatically.
                </p>
                <div className="mt-5 grid gap-2">
                  <button
                    type="button"
                    onClick={() => setActivePanel("work")}
                    className="flex items-center justify-between rounded-lg bg-background px-3 py-2 text-sm font-medium text-foreground"
                  >
                    Create Work Item
                    <ArrowRight className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setActivePanel("handoffs")}
                    className="flex items-center justify-between rounded-lg bg-background/10 px-3 py-2 text-sm font-medium"
                  >
                    Send Context
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </section>

            <section>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-medium text-muted-foreground">
                  Role Sessions
                </h3>
                <button
                  type="button"
                  onClick={() => setActivePanel("work")}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Manage roles
                </button>
              </div>
              {renderRoleStrip()}
            </section>

            <section className="grid gap-3 lg:grid-cols-4">
              <button
                type="button"
                onClick={() => setActivePanel("work")}
                className="flex items-center gap-3 rounded-xl border border-border bg-background px-4 py-3 text-left text-sm hover:bg-accent hover:text-accent-foreground"
              >
                <ClipboardList className="h-4 w-4" />
                Work Items
              </button>
              <button
                type="button"
                onClick={() => setActivePanel("context")}
                className="flex items-center gap-3 rounded-xl border border-border bg-background px-4 py-3 text-left text-sm hover:bg-accent hover:text-accent-foreground"
              >
                <FileText className="h-4 w-4" />
                Project Notes
              </button>
              <button
                type="button"
                onClick={() => setActivePanel("swarm")}
                className="flex items-center gap-3 rounded-xl border border-border bg-background px-4 py-3 text-left text-sm hover:bg-accent hover:text-accent-foreground"
              >
                <GitBranch className="h-4 w-4" />
                Plan with Swarm
              </button>
              <button
                type="button"
                onClick={() => setActivePanel("readiness")}
                className="flex items-center gap-3 rounded-xl border border-border bg-background px-4 py-3 text-left text-sm hover:bg-accent hover:text-accent-foreground"
              >
                <ShieldCheck className="h-4 w-4" />
                Readiness
              </button>
            </section>
          </div>
        );

      case "readiness":
        return (
          <ColonyReadinessPanel
            colony={activeColony}
            sentinelMode={sentinelMode}
            eventCount={events.length}
            onOpenPanel={setActivePanel}
          />
        );

      case "context":
        return (
          <div className="flex flex-1 flex-col gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Colony Scope</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                {activeColony.scope?.kind === "directory" ? (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Kind:</span>
                    <span className="text-sm text-muted-foreground">
                      Directory
                    </span>
                  </div>
                ) : activeColony.scope ? (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Kind:</span>
                    <span className="text-sm text-muted-foreground">
                      {activeColony.scope.kind}
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    <span className="text-sm text-muted-foreground">
                      No scope set yet
                    </span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleScopeSet("planning")}
                        className="rounded-md border border-border bg-background px-3 py-1 text-sm hover:bg-accent hover:text-accent-foreground"
                      >
                        Planning Only
                      </button>
                      <button
                        type="button"
                        onClick={() => handleScopeSet("directory")}
                        className="rounded-md border border-border bg-background px-3 py-1 text-sm hover:bg-accent hover:text-accent-foreground"
                      >
                        Directory
                      </button>
                    </div>
                  </div>
                )}
                {activeColony.scope && (
                  <>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={activeColony.scope.locked}
                        onChange={handleScopeLockToggle}
                      />
                      Lock scope for this colony run
                    </label>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">Path:</span>
                      <span className="text-sm text-muted-foreground">
                        {activeColony.scope.path || "(none)"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={scopePathInput}
                        onChange={(e) => setScopePathInput(e.target.value)}
                        placeholder={activeColony.scope.path || "Enter path"}
                        disabled={activeColony.scope.locked}
                        className="rounded border border-border bg-background px-2 py-1 text-sm"
                      />
                      <button
                        type="button"
                        onClick={handleScopeUpdate}
                        disabled={activeColony.scope.locked}
                        className="rounded-md bg-accent px-3 py-1 text-sm text-accent-foreground"
                      >
                        Update
                      </button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <ColonyMemoryPanel
              colonyId={activeColony.id}
              memory={activeColony.memory}
              onUpdateMemory={(patch) =>
                updateColonyMemory(activeColony.id, patch)
              }
              onAddItem={(section, text) =>
                addMemoryItem(activeColony.id, section, text)
              }
              onRemoveItem={(section, idx) =>
                removeMemoryItem(activeColony.id, section, idx)
              }
            />
          </div>
        );

      case "work":
        return (
          <div className="flex flex-1 flex-col gap-4">
            <div>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-medium text-muted-foreground">
                  Role Sessions
                </h3>
                <span className="text-xs text-muted-foreground">
                  Create or open role sessions from context staging.
                </span>
              </div>
              {renderRoleStrip()}
            </div>

            <ColonyTaskBoard
              tasks={activeColony.tasks}
              seats={activeColony.seats}
              handoffsByTaskId={
                activeColony.handoffs.reduce(
                  (acc, h) => {
                    if (h.taskId) {
                      if (!acc[h.taskId]) acc[h.taskId] = [];
                      acc[h.taskId].push(h);
                    }
                    return acc;
                  },
                  {} as Record<string, typeof activeColony.handoffs>,
                ) as Record<string, typeof activeColony.handoffs>
              }
              onCreateTask={handleTaskCreate}
              onAssignTask={handleTaskAssign}
              onUpdateStatus={handleTaskStatus}
              onDeleteTask={handleTaskDelete}
              onOpenSwarm={() => setActivePanel("swarm")}
            />
          </div>
        );

      case "handoffs":
        return (
          <ColonyHandoffPanel
            handoffs={activeColony.handoffs}
            seats={activeColony.seats}
            tasks={activeColony.tasks.map((t) => ({
              id: t.id,
              title: t.title,
            }))}
            handoffsByTaskId={
              activeColony.handoffs.reduce(
                (acc, h) => {
                  if (h.taskId) {
                    if (!acc[h.taskId]) acc[h.taskId] = [];
                    acc[h.taskId].push(h);
                  }
                  return acc;
                },
                {} as Record<string, typeof activeColony.handoffs>,
              ) as Record<string, typeof activeColony.handoffs>
            }
            prefill={colonyStore.getState().preparedHandoff}
            onCreateHandoff={handleHandoffCreate}
            onMarkCopied={handleHandoffCopy}
            onDeleteHandoff={handleHandoffDelete}
            onReviewHandoff={handleHandoffReview}
            onStageHandoff={handleStageHandoff}
          />
        );

      case "swarm":
        return (
          <SwarmPanel
            onCreateTask={(title, description) => {
              if (!activeColonyId) return;
              createTask(activeColonyId, title, description);
            }}
            onPrepareHandoff={(_workItemId, role, prompt) => {
              if (!activeColonyId || !activeColony) return;
              const scopeInfo = activeColony.scope
                ? `\nScope: ${activeColony.scope.kind} / ${activeColony.scope.label}`
                : "\nWarning: No workspace scope set";
              const summary = `Work Item: ${role}${scopeInfo}

Goal:
Use this role to complete the assigned work.

Context:
${prompt}

Do Not:
- Do not execute commands automatically.
- Do not modify files outside scope.
- Do not add work beyond the defined output.`;
              colonyStore.getState().prepareHandoff({
                fromSeatId: activeColony.seats[0]?.id,
                toSeatId: activeColony.seats[1]?.id,
                summary,
                prompt,
              });
              setActivePanel("handoffs");
            }}
          />
        );

      case "artifacts":
        return (
          <div className="flex flex-1 flex-col gap-4">
            <ColonyOutputReadinessPanel colony={activeColony} />
            <ColonyArtifactPanel
              colonyId={activeColony.id}
              artifacts={activeColony.artifacts ?? []}
              tasks={activeColony.tasks.map((t) => ({
                id: t.id,
                title: t.title,
              }))}
              handoffs={activeColony.handoffs.map((h) => ({
                id: h.id,
                summary: h.summary,
              }))}
              seats={activeColony.seats.map((s) => ({
                id: s.id,
                label: s.label,
              }))}
              onCreate={(artifact) => {
                if (!activeColonyId) return;
                createArtifact(activeColonyId, artifact);
              }}
              onDelete={(artifactId) => {
                if (!activeColonyId) return;
                deleteArtifact(activeColonyId, artifactId);
              }}
              onUpdate={(artifactId, patch) => {
                if (!activeColonyId) return;
                colonyStore
                  .getState()
                  .updateArtifact(activeColonyId, artifactId, patch);
              }}
              onExtractFromSeat={handleExtractFromSeat}
            />
          </div>
        );

      case "activity":
        return <ColonyTranscript />;

      default:
        return null;
    }
  };

  return (
    <div className="flex h-full flex-col overflow-hidden p-6">
      <div className="mb-4 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-semibold">Colony Mode</h1>
          <p className="text-sm text-muted-foreground">
            A governed workspace for long-running AI-assisted work.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {sentinelLabel}
            </span>
            <select
              value={sentinelMode}
              onChange={(e) =>
                setSentinelMode(e.target.value as "off" | "dax_open")
              }
              className="rounded-md border border-border bg-background px-2 py-1 text-sm"
            >
              <option value="off">Off</option>
              <option value="dax_open">Advisory</option>
            </select>
          </div>
          {activeColony && !colonyClosed && (
            <button
              type="button"
              onClick={handleCloseColony}
              className="rounded-md border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
            >
              Close Colony
            </button>
          )}
          {hasColonyState && (
            <button
              type="button"
              onClick={() => handleCreateColony()}
              className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:bg-accent/90"
            >
              New Colony
            </button>
          )}
        </div>
      </div>

      {!activeColony ? (
        <div className="flex flex-1 flex-col items-center justify-center max-w-2xl mx-auto text-center">
          <div className="mb-6">
            <h2 className="mb-2 text-xl font-medium">
              Start a governed AI workspace
            </h2>
            <p className="text-muted-foreground">
              Use Colony when a task needs memory, handoffs, review, or
              repo-scale context.
            </p>
          </div>

          <div className="grid w-full grid-cols-2 gap-3">
            {START_OPTIONS.map((option) => (
              <button
                key={option.intent}
                type="button"
                onClick={() => handleCreateColony(option.intent)}
                className="rounded-md border border-border bg-background px-4 py-3 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
              >
                {option.label}
              </button>
            ))}
          </div>

          <p className="mt-4 text-xs text-muted-foreground">
            Creates Planner, Worker, and Reviewer roles behind the workspace.
          </p>

          <ColonyRecipeEntry />
        </div>
      ) : (
        <div className="flex flex-1 flex-col overflow-hidden">
          {colonyClosed && (
            <div
              role="status"
              aria-label="Colony closed notice"
              className="mb-4 shrink-0 rounded-lg border border-border bg-muted px-4 py-3 text-sm"
            >
              This Colony is closed. Work items, handoffs, and artifacts are
              preserved for review.
            </div>
          )}
          {showIncompleteWarning && !colonyClosed && activeColony && (
            <div
              role="alertdialog"
              aria-label="Incomplete output contract warning"
              className="mb-4 shrink-0 rounded-lg border border-border bg-card px-5 py-4 text-sm"
            >
              <p className="font-medium">
                This Colony does not fully satisfy its output contract.
              </p>
              <p className="mt-1 text-muted-foreground">
                You can still close it, but the audit trail will record that it
                was closed with unresolved output items.
              </p>
              {(() => {
                const readiness = getColonyOutputReadiness(activeColony);
                const statusLabel =
                  readiness.status === "not_ready"
                    ? "Not ready"
                    : "Partially ready";
                const missingSections = readiness.requiredSections.filter(
                  (s) => !s.present,
                ).length;
                return (
                  <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                    <dt className="text-muted-foreground">Readiness</dt>
                    <dd className="font-medium">{statusLabel}</dd>
                    <dt className="text-muted-foreground">Tasks</dt>
                    <dd className="font-medium">
                      {readiness.taskCompletion.done} /{" "}
                      {readiness.taskCompletion.total} done
                    </dd>
                    {readiness.requiredSections.length > 0 && (
                      <>
                        <dt className="text-muted-foreground">
                          Missing sections
                        </dt>
                        <dd className="font-medium">{missingSections}</dd>
                      </>
                    )}
                  </dl>
                );
              })()}
              <div className="mt-4 flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={handleCancelClose}
                  className="rounded-md border border-border bg-background px-3 py-1.5 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmClose}
                  className="rounded-md bg-foreground px-3 py-1.5 text-sm font-medium text-background hover:bg-foreground/90"
                >
                  Close Anyway
                </button>
              </div>
            </div>
          )}
          <div className="mb-4 shrink-0">{renderWorkspaceBrief()}</div>

          <div className="mb-4 flex shrink-0 gap-1 rounded-full bg-muted p-1">
            {PANELS.map((panel) => (
              <button
                key={panel.id}
                type="button"
                onClick={() => setActivePanel(panel.id)}
                className={`rounded-full px-4 py-2 text-sm transition-colors ${
                  activePanel === panel.id
                    ? "bg-background font-medium text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {panel.label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto">{renderPanel()}</div>
        </div>
      )}
    </div>
  );
}
