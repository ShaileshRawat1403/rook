import { useCallback, useMemo, useState, useEffect } from "react";
import { Bot, User, Eye } from "lucide-react";
import { useColonyStore, colonyStore } from "./colonyStore";
import { getConfiguredSentinelMode } from "@/shared/api/sentinel";
import { ColonySeatCard } from "./ColonySeatCard";
import { ColonyTranscript } from "./ColonyTranscript";
import { ColonyTaskBoard } from "./ColonyTaskBoard";
import { ColonyHandoffPanel } from "./ColonyHandoffPanel";
import { ColonyMemoryPanel } from "./ColonyMemoryPanel";
import { ColonyArtifactPanel } from "./ColonyArtifactPanel";
import { SwarmPanel } from "./swarm/SwarmPanel";
import { useChatSessionStore } from "@/features/chat/stores/chatSessionStore";
import { useChatStore } from "@/features/chat/stores/chatStore";
import { useAgentStore } from "@/features/agents/stores/agentStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import type { AppView } from "@/app/AppShell";
import type { ChatSessionInfo, ColonyTask } from "./types";

export type ColonyPanel =
  | "overview"
  | "context"
  | "work"
  | "handoffs"
  | "swarm"
  | "artifacts"
  | "activity";

const PANELS: { id: ColonyPanel; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "context", label: "Context" },
  { id: "work", label: "Work" },
  { id: "handoffs", label: "Handoffs" },
  { id: "swarm", label: "Swarm" },
  { id: "artifacts", label: "Artifacts" },
  { id: "activity", label: "Activity" },
];

const GHOST_ROLES = [
  {
    role: "planner",
    label: "Planner",
    icon: Bot,
    desc: "Task direction and reasoning",
  },
  {
    role: "worker",
    label: "Worker",
    icon: User,
    desc: "Task execution and output",
  },
  {
    role: "reviewer",
    label: "Reviewer",
    icon: Eye,
    desc: "Inspection and risk surfacing",
  },
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
    setSentinelMode,
    createColony,
    setColonyScope,
    updateColonyMemory,
    addMemoryItem,
    removeMemoryItem,
    bindSeatToSession,
    unbindSeat,
    setActiveSeat,
    openSessionForSeat,
    createTask,
    assignTaskToSeat,
    updateTaskStatus,
    deleteTask,
    createHandoff,
    markHandoffCopied,
    deleteHandoff,
    createArtifact,
    deleteArtifact,
  } = useColonyStore();

  const sessionStore = useChatSessionStore();
  const chatStore = useChatStore();
  const agentStore = useAgentStore();

  const sessions = sessionStore.sessions;

  const sessionInfoMap = useMemo(() => {
    const map = new Map<string, ChatSessionInfo>();
    for (const session of sessions) {
      map.set(session.id, {
        id: session.id,
        title: session.title,
        providerId: session.providerId,
        modelName: session.modelName,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
        messageCount: session.messageCount,
        draft: session.draft,
      });
    }
    return map;
  }, [sessions]);

  const getSessionInfo = useCallback(
    (sessionId: string | undefined): ChatSessionInfo | undefined => {
      if (!sessionId) return undefined;
      return sessionInfoMap.get(sessionId);
    },
    [sessionInfoMap],
  );

  const activeColony = colonies.find((c) => c.id === activeColonyId) ?? null;
  const [scopePathInput, setScopePathInput] = useState("");

  useEffect(() => {
    let cancelled = false;
    const fetchMode = () => {
      void getConfiguredSentinelMode().then((nextMode) => {
        if (!cancelled && nextMode !== sentinelMode) {
          // Temporarily skip the global sync inside setSentinelMode
          // by setting it directly to avoid infinite loops, but since
          // setSentinelMode syncs global state which matches nextMode, it's fine.
          setSentinelMode(nextMode);
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
  }, [sentinelMode, setSentinelMode]);

  const hasColonyState =
    activeColony &&
    (activeColony.tasks.length > 0 ||
      activeColony.handoffs.length > 0 ||
      activeColony.seats.some((s) => s.binding === "linked"));

  const handleCreateColony = useCallback(() => {
    const now = new Date().toISOString();
    const title = `Colony ${new Date(now).toLocaleDateString()}`;
    createColony(title, "New colony intent");
  }, [createColony]);

  const sentinelLabel = sentinelMode === "off" ? "Sentinel: off" : "Sentinel: open";

  const handleCreateSessionForSeat = useCallback(
    (seatId: string, seatLabel: string) => {
      if (!activeColonyId || !activeColony) return;

      const session = sessionStore.createDraftSession({
        title: `Colony: ${seatLabel}`,
        projectId: activeColony.projectId,
        providerId: agentStore.selectedProvider,
      });

      bindSeatToSession(activeColonyId, seatId, {
        sessionId: session.id,
        acpSessionId: session.acpSessionId,
        providerId: session.providerId,
        projectId: session.projectId ?? undefined,
      });
    },
    [
      activeColonyId,
      activeColony,
      sessionStore,
      agentStore.selectedProvider,
      bindSeatToSession,
    ],
  );

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

  const handleUnbindSeat = useCallback(
    (seatId: string) => {
      if (!activeColonyId) return;
      unbindSeat(activeColonyId, seatId);
    },
    [activeColonyId, unbindSeat],
  );

  const handleUpdateSeatModel = useCallback(
    (seatId: string, modelName: string) => {
      if (!activeColonyId) return;
      colonyStore.getState().updateSeatModel(activeColonyId, seatId, modelName);
    },
    [activeColonyId],
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
      colonyStore.getState().reviewHandoff(
        activeColonyId,
        handoffId,
        reviewStatus,
        reviewNote,
      );
    },
    [activeColonyId],
  );

  const handleStageHandoff = useCallback(
    async (handoffId: string) => {
      if (!activeColony) return;
      const handoff = activeColony.handoffs.find((h) => h.id === handoffId);
      if (!handoff) return;

      const toSeat = activeColony.seats.find((s) => s.id === handoff.toSeatId);
      if (!toSeat?.sessionId) {
        alert("Receiving seat has no linked session. Link a session first.");
        return;
      }

      const fromSeat = activeColony.seats.find((s) => s.id === handoff.fromSeatId);
      const task = activeColony.tasks.find((t) => t.id === handoff.taskId);

      const prompt = `You are the ${toSeat.label} seat in Rook Colony.

Context from ${fromSeat?.label ?? "Unknown"}${task ? `\nTask: ${task.title}` : ""}

${handoff.summary.trim()}

Use this context to continue the work.
Do not add scope beyond the assigned task.`;

      // Stage the prompt as a draft in the target session
      chatStore.setDraft(toSeat.sessionId, prompt);
      
      // Navigate to the session
      await handleOpenSession(toSeat.sessionId, toSeat.id);
      
      // Mark as copied/staged
      if (activeColonyId) {
        markHandoffCopied(activeColonyId, handoffId);
      }
    },
    [activeColony, activeColonyId, chatStore, handleOpenSession, markHandoffCopied],
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
    if (!activeColonyId || !activeColony?.scope) return;
    const now = new Date().toISOString();
    setColonyScope(activeColonyId, {
      ...activeColony.scope,
      path: scopePathInput || activeColony.scope.path,
      updatedAt: now,
    });
    setScopePathInput("");
  }, [activeColonyId, activeColony?.scope, scopePathInput, setColonyScope]);

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

  const getMemoryItemCount = () => {
    if (!activeColony?.memory) return 0;
    const m = activeColony.memory;
    return (
      (m.repoNotes?.length ?? 0) +
      (m.decisions?.length ?? 0) +
      (m.constraints?.length ?? 0) +
      (m.risks?.length ?? 0) +
      (m.openQuestions?.length ?? 0)
    );
  };

  const renderPanel = () => {
    if (!activeColony) return null;

    switch (activePanel) {
      case "overview":
        return (
          <div className="flex flex-1 flex-col gap-4">
            <div className="grid grid-cols-3 gap-4">
              <Card className="flex flex-col">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Scope</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col gap-2 text-sm">
                  <span className="text-muted-foreground">
                    {activeColony.scope?.kind === "directory"
                      ? `Directory`
                      : activeColony.scope?.kind === "planning"
                        ? "Planning Only"
                        : "No scope"}
                  </span>
                  {activeColony.scope?.path && (
                    <span className="text-xs text-muted-foreground truncate">
                      {activeColony.scope.path}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setActivePanel("context");
                    }}
                    className="mt-auto text-xs text-accent hover:underline"
                  >
                    {activeColony.scope ? "Edit Scope" : "Set Scope"}
                  </button>
                </CardContent>
              </Card>

              <Card className="flex flex-col">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Active Work</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col gap-2 text-sm">
                  <span className="text-muted-foreground">
                    {activeColony.tasks.length > 0
                      ? `${activeColony.tasks.length} task${
                          activeColony.tasks.length === 1 ? "" : "s"
                        }`
                      : "No active task"}
                  </span>
                  {activeColony.seats.find((s) => s.currentTask) && (
                    <span className="text-xs text-muted-foreground">
                      {activeColony.seats.find((s) => s.currentTask)?.label}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => setActivePanel("work")}
                    className="mt-auto text-xs text-accent hover:underline"
                  >
                    {activeColony.tasks.length > 0 ? "View Tasks" : "Create Task"}
                  </button>
                </CardContent>
              </Card>

              <Card className="flex flex-col">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Evidence</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col gap-2 text-sm">
                  <span className="text-muted-foreground">
                    {colonyStore.getState().events.length > 0
                      ? colonyStore.getState().events[
                          colonyStore.getState().events.length - 1
                        ].type.replace("_", " ")
                      : "No activity"}
                  </span>
                  <button
                    type="button"
                    onClick={() => setActivePanel("activity")}
                    className="mt-auto text-xs text-accent hover:underline"
                  >
                    View All
                  </button>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <h3 className="col-span-3 mb-1 text-sm font-medium text-muted-foreground">
                Seats
              </h3>
              {activeColony.seats.map((seat) => (
                <ColonySeatCard
                  key={seat.id}
                  seat={seat}
                  sessionInfo={getSessionInfo(seat.sessionId)}
                  tasks={activeColony.tasks}
                  isActive={activeColony.activeSeatId === seat.id}
                  onCreateSession={() =>
                    handleCreateSessionForSeat(seat.id, seat.label)
                  }
                  onOpenSession={() =>
                    seat.sessionId && handleOpenSession(seat.sessionId, seat.id)
                  }
                  onUnbindSession={() => handleUnbindSeat(seat.id)}
                  onSelect={() => handleSelectSeat(seat.id)}
                  onUpdateModel={handleUpdateSeatModel}
                />
              ))}
            </div>

            <div>
              <h3 className="mb-2 text-sm font-medium text-muted-foreground">
                Quick Actions
              </h3>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setActivePanel("work")}
                  className="rounded-md border border-border bg-background px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
                >
                  Create Task
                </button>
                <button
                  type="button"
                  onClick={() => setActivePanel("handoffs")}
                  className="rounded-md border border-border bg-background px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
                >
                  Prepare Handoff
                </button>
                <button
                  type="button"
                  onClick={() => setActivePanel("context")}
                  className="rounded-md border border-border bg-background px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
                >
                  Open Memory
                </button>
                <button
                  type="button"
                  onClick={() => setActivePanel("swarm")}
                  className="rounded-md border border-border bg-background px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
                >
                  Use Swarm
                </button>
              </div>
            </div>
          </div>
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
                    <span className="text-sm text-muted-foreground">Directory</span>
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
                        className="rounded border border-border bg-background px-2 py-1 text-sm"
                      />
                      <button
                        type="button"
                        onClick={handleScopeUpdate}
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
            <div className="grid grid-cols-3 gap-4">
              <h3 className="col-span-3 mb-1 text-sm font-medium text-muted-foreground">
                Seats
              </h3>
              {activeColony.seats.map((seat) => (
                <ColonySeatCard
                  key={seat.id}
                  seat={seat}
                  sessionInfo={getSessionInfo(seat.sessionId)}
                  tasks={activeColony.tasks}
                  isActive={activeColony.activeSeatId === seat.id}
                  onCreateSession={() =>
                    handleCreateSessionForSeat(seat.id, seat.label)
                  }
                  onOpenSession={() =>
                    seat.sessionId && handleOpenSession(seat.sessionId, seat.id)
                  }
                  onUnbindSession={() => handleUnbindSeat(seat.id)}
                  onSelect={() => handleSelectSeat(seat.id)}
                  onUpdateModel={handleUpdateSeatModel}
                />
              ))}
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
            tasks={activeColony.tasks.map((t) => ({ id: t.id, title: t.title }))}
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
          <ColonyArtifactPanel
            colonyId={activeColony.id}
            artifacts={activeColony.artifacts ?? []}
            tasks={activeColony.tasks.map((t) => ({ id: t.id, title: t.title }))}
            handoffs={activeColony.handoffs.map((h) => ({ id: h.id, summary: h.summary }))}
            seats={activeColony.seats.map((s) => ({ id: s.id, label: s.label }))}
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
              colonyStore.getState().updateArtifact(activeColonyId, artifactId, patch);
            }}
            onExtractFromSeat={handleExtractFromSeat}
          />
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
            SDLC context container for AI-assisted work
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{sentinelLabel}</span>
            <select
              value={sentinelMode}
              onChange={(e) =>
                setSentinelMode(e.target.value as "off" | "dax_open")
              }
              className="rounded-md border border-border bg-background px-2 py-1 text-sm"
            >
              <option value="off">off</option>
              <option value="dax_open">open</option>
            </select>
          </div>
          {hasColonyState && (
            <button
              type="button"
              onClick={handleCreateColony}
              className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:bg-accent/90"
            >
              New Colony
            </button>
          )}
        </div>
      </div>

      {!activeColony ? (
        <div className="flex flex-1 flex-col items-center justify-center max-w-2xl mx-auto text-center">
          <div className="mb-8">
            <h2 className="text-xl font-medium mb-2">Initialize Orchestration Workspace</h2>
            <p className="text-muted-foreground">
              Colony is an advanced framework for managing complex, multi-agent pipelines with observability and auditability.
            </p>
          </div>

          <div className="mb-10 grid grid-cols-3 gap-6">
            {GHOST_ROLES.map((ghost) => (
              <div key={ghost.role} className="flex flex-col items-center gap-3">
                <div className="rounded-full bg-muted/50 p-4 border border-border/50">
                  <ghost.icon className="h-6 w-6 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="text-sm font-medium">{ghost.label}</h3>
                  <p className="text-[11px] text-muted-foreground mt-1 px-2 leading-relaxed">
                    {ghost.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col items-center gap-4">
            <button
              type="button"
              onClick={handleCreateColony}
              className="rounded-md bg-accent px-8 py-3 text-base font-medium text-accent-foreground hover:bg-accent/90 transition-colors shadow-sm"
            >
              Start New Colony
            </button>
            <p className="text-xs text-muted-foreground">
              Initializes a workspace with persistent memory and 3 context-isolated seats.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="mb-4 rounded-lg border border-border bg-card p-4 min-h-0">
            <h2 className="text-lg font-medium">{activeColony.title}</h2>
            <p className="text-sm text-muted-foreground">
              {activeColony.intent}
            </p>
          </div>

          <div className="mb-4 flex items-center gap-4 text-sm shrink-0">
            {activeColony.scope?.kind === "directory" ? (
              <div className="flex items-center gap-2">
                <span className="font-medium">Scope:</span>
                <span className="text-muted-foreground">
                  {activeColony.scope.kind} / {activeColony.scope.path || "(no path)"}
                </span>
              </div>
            ) : activeColony.scope ? (
              <div className="flex items-center gap-1">
                <span className="font-medium">Scope:</span>
                <span className="text-muted-foreground">
                  {activeColony.scope.kind} / {activeColony.scope.label}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">No scope</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <span className="font-medium">Seats:</span>
              <span className="text-muted-foreground">3</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="font-medium">Linked:</span>
              <span className="text-muted-foreground">
                {activeColony.seats.filter((s) => s.binding === "linked").length}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span className="font-medium">Tasks:</span>
              <span className="text-muted-foreground">
                {activeColony.tasks.length}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span className="font-medium">Handoffs:</span>
              <span className="text-muted-foreground">
                {activeColony.handoffs.length}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span className="font-medium">Memory:</span>
              <span className="text-muted-foreground">{getMemoryItemCount()}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="font-medium">Artifacts:</span>
              <span className="text-muted-foreground">
                {activeColony.artifacts?.length ?? 0}
              </span>
            </div>
          </div>

          <div className="mb-4 flex border-b border-border shrink-0">
            {PANELS.map((panel) => (
              <button
                key={panel.id}
                type="button"
                onClick={() => setActivePanel(panel.id)}
                className={`px-4 py-2 text-sm ${
                  activePanel === panel.id
                    ? "border-b-2 border-accent font-medium text-accent"
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