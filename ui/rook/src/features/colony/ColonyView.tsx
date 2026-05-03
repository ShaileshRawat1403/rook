import { useCallback, useMemo } from "react";
import { Bot, User, Eye } from "lucide-react";
import { useColonyStore } from "./colonyStore";
import { ColonySeatCard } from "./ColonySeatCard";
import { ColonyTranscript } from "./ColonyTranscript";
import { ColonyTaskBoard } from "./ColonyTaskBoard";
import { ColonyHandoffPanel } from "./ColonyHandoffPanel";
import { useChatSessionStore } from "@/features/chat/stores/chatSessionStore";
import { useChatStore } from "@/features/chat/stores/chatStore";
import { useAgentStore } from "@/features/agents/stores/agentStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import type { AppView } from "@/app/AppShell";
import type { ChatSessionInfo, ColonyTask } from "./types";

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
  const {
    colonies,
    activeColonyId,
    sentinelMode,
    setSentinelMode,
    createColony,
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

  return (
    <div className="flex h-full flex-col overflow-hidden p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Colony Mode</h1>
          <p className="text-sm text-muted-foreground">
            Coordinate multiple agents with defined roles
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
              <option value="off">off</option>
              <option value="dax_open">open</option>
            </select>
          </div>
          <button
            type="button"
            onClick={handleCreateColony}
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:bg-accent/90"
          >
            Reset Colony
          </button>
        </div>
      </div>

      <p className="mb-2 text-sm text-muted-foreground">
        Intent → Task · Context → Handoff · Role → Seat · Governance → Sentinel · Evidence → Activity
      </p>

      <p className="mb-6 text-sm text-muted-foreground">
        Coordinate AI work through roles, tasks, handoffs, and evidence. Nothing executes without your action.
      </p>

      {!activeColony ? (
        <div className="flex flex-1 flex-col items-center justify-center">
          <p className="mb-6 text-center text-muted-foreground">
            No colony active. A colony starts with three seats:
          </p>

          <div className="mb-6 grid grid-cols-3 gap-4">
            {GHOST_ROLES.map((ghost) => (
              <Card key={ghost.role} className="border-dashed opacity-50">
                <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-2">
                  <div className="rounded-full bg-muted p-2">
                    <ghost.icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <CardTitle className="text-base">{ghost.label}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">{ghost.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <button
            type="button"
            onClick={handleCreateColony}
            className="rounded-md bg-accent px-6 py-3 text-base font-medium text-accent-foreground hover:bg-accent/90"
          >
            Reset Colony
          </button>
        </div>
      ) : (
        <div className="flex flex-1 flex-col overflow-y-auto">
          <div className="mb-4 rounded-lg border border-border bg-card p-4">
            <h2 className="text-lg font-medium">{activeColony.title}</h2>
            <p className="text-sm text-muted-foreground">
              {activeColony.intent}
            </p>
          </div>

          <div className="mb-4 flex items-center gap-4 text-sm">
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
            {activeColony.activeSeatId && (
              <div className="flex items-center gap-1">
                <span className="font-medium">Active:</span>
                <span className="text-muted-foreground">
                  {activeColony.seats.find(
                    (s) => s.id === activeColony.activeSeatId,
                  )?.label ?? "—"}
                </span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <span className="font-medium">Sentinel:</span>
              <span className="text-muted-foreground">{activeColony.sentinelMode}</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <h3 className="col-span-3 mb-1 text-sm font-medium text-muted-foreground">
              Seats — Who is responsible?
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
              />
            ))}
          </div>

          <div className="mt-4">
            <h3 className="mb-1 text-sm font-medium text-muted-foreground">
              Tasks — What work exists?
            </h3>
            <ColonyTaskBoard
              tasks={activeColony.tasks}
              seats={activeColony.seats}
              onCreateTask={handleTaskCreate}
              onAssignTask={handleTaskAssign}
              onUpdateStatus={handleTaskStatus}
              onDeleteTask={handleTaskDelete}
            />
          </div>

          <div className="mt-4">
            <h3 className="mb-1 text-sm font-medium text-muted-foreground">
              Handoffs — What context moves?
            </h3>
            <ColonyHandoffPanel
              handoffs={activeColony.handoffs}
              seats={activeColony.seats}
              tasks={activeColony.tasks.map((t) => ({ id: t.id, title: t.title }))}
              onCreateHandoff={handleHandoffCreate}
              onMarkCopied={handleHandoffCopy}
              onDeleteHandoff={handleHandoffDelete}
            />
          </div>

          <div className="mt-4 h-48">
            <h3 className="mb-1 text-sm font-medium text-muted-foreground">
              Activity — What happened?
            </h3>
            <ColonyTranscript />
          </div>
        </div>
      )}
    </div>
  );
}
