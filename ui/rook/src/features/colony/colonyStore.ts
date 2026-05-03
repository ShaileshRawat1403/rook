import { create } from "zustand";
import type {
  ColonySession,
  ColonySeat,
  ColonyRole,
  ColonyEvent,
  ColonyEventType,
  ColonyTask,
} from "./types";

interface ColonyStoreState {
  colonies: ColonySession[];
  activeColonyId: string | null;
  sentinelMode: "off" | "dax_open";
  events: ColonyEvent[];
}

type ColonyStore = ColonyStoreState & {
  getActiveColony: () => ColonySession | null;
  setActiveColony: (colonyId: string | null) => void;
  createColony: (title: string, intent: string) => ColonySession;
  updateColony: (colonyId: string, updates: Partial<ColonySession>) => void;
  deleteColony: (colonyId: string) => void;
  setSentinelMode: (mode: "off" | "dax_open") => void;
  addSeat: (colonyId: string, role: ColonyRole, label: string) => void;
  updateSeat: (
    colonyId: string,
    seatId: string,
    updates: Partial<ColonySeat>,
  ) => void;
  removeSeat: (colonyId: string, seatId: string) => void;
  setActiveSeat: (colonyId: string, seatId: string | null) => void;
  bindSeatToSession: (
    colonyId: string,
    seatId: string,
    session: {
      sessionId: string;
      acpSessionId?: string;
      providerId?: string;
      projectId?: string;
    },
  ) => void;
  unbindSeat: (colonyId: string, seatId: string) => void;
logEvent: (
    type: ColonyEventType,
    seatRole?: ColonyRole,
    seatLabel?: string,
    details?: string,
    taskId?: string,
    taskTitle?: string,
  ) => void;
  openSessionForSeat: (colonyId: string, seatId: string) => void;
  createTask: (colonyId: string, title: string, description?: string) => ColonyTask;
  assignTaskToSeat: (colonyId: string, taskId: string, seatId: string | null) => void;
  updateTaskStatus: (
    colonyId: string,
    taskId: string,
    status: ColonyTask["status"],
  ) => void;
  deleteTask: (colonyId: string, taskId: string) => void;
};

const DEFAULT_ROLES: ColonyRole[] = ["planner", "worker", "reviewer"];

export const useColonyStore = create<ColonyStore>((set, get) => ({
  colonies: [],
  activeColonyId: null,
  sentinelMode: "off",
  events: [],

  getActiveColony: () => {
    const { colonies, activeColonyId } = get();
    return colonies.find((c) => c.id === activeColonyId) ?? null;
  },

  setActiveColony: (colonyId) => {
    set({ activeColonyId: colonyId });
  },

  createColony: (title, intent) => {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const seats: ColonySeat[] = DEFAULT_ROLES.map((role) => ({
      id: crypto.randomUUID(),
      role,
      label: role.charAt(0).toUpperCase() + role.slice(1),
      binding: "unbound",
      status: "idle",
      lastUpdate: now,
    }));
    const colony: ColonySession = {
      id,
      title,
      intent,
      seats,
      tasks: [],
      sentinelMode: "off",
      createdAt: now,
      updatedAt: now,
    };
    const newEvent: ColonyEvent = {
      id: crypto.randomUUID(),
      type: "colony_created",
      timestamp: now,
      details: title,
    };
    set({
      colonies: [colony],
      activeColonyId: id,
      events: [newEvent],
    });
    return colony;
  },

  updateColony: (colonyId, updates) => {
    const now = new Date().toISOString();
    set((state) => ({
      colonies: state.colonies.map((c) =>
        c.id === colonyId ? { ...c, ...updates, updatedAt: now } : c,
      ),
    }));
  },

  deleteColony: (colonyId) => {
    set((state) => {
      const newColonies = state.colonies.filter((c) => c.id !== colonyId);
      return {
        colonies: newColonies,
        activeColonyId:
          state.activeColonyId === colonyId
            ? (newColonies[0]?.id ?? null)
            : state.activeColonyId,
      };
    });
  },

  setSentinelMode: (mode) => {
    const { activeColonyId, colonies, sentinelMode: oldMode } = get();
    if (!activeColonyId) {
      set({ sentinelMode: mode });
      return;
    }
    const now = new Date().toISOString();
    const events = [...get().events];
    const oldLabel = oldMode === "dax_open" ? "open" : oldMode;
    const newLabel = mode === "dax_open" ? "open" : mode;
    if (mode !== oldMode) {
      events.push({
        id: crypto.randomUUID(),
        type: "sentinel_mode_changed",
        timestamp: now,
        details: `${oldLabel} → ${newLabel}`,
      });
    }
    set({
      sentinelMode: mode,
      colonies: colonies.map((c) =>
        c.id === activeColonyId
          ? { ...c, sentinelMode: mode, updatedAt: now }
          : c,
      ),
      events,
    });
  },

  addSeat: (colonyId, role, label) => {
    const now = new Date().toISOString();
    const seat: ColonySeat = {
      id: crypto.randomUUID(),
      role,
      label,
      binding: "unbound",
      status: "idle",
      lastUpdate: now,
    };
    set((state) => ({
      colonies: state.colonies.map((c) =>
        c.id === colonyId
          ? { ...c, seats: [...c.seats, seat], updatedAt: now }
          : c,
      ),
    }));
  },

  updateSeat: (colonyId, seatId, updates) => {
    const now = new Date().toISOString();
    set((state) => ({
      colonies: state.colonies.map((c) =>
        c.id === colonyId
          ? {
              ...c,
              seats: c.seats.map((s) =>
                s.id === seatId ? { ...s, ...updates, lastUpdate: now } : s,
              ),
              updatedAt: now,
            }
          : c,
      ),
    }));
  },

  removeSeat: (colonyId, seatId) => {
    const now = new Date().toISOString();
    set((state) => ({
      colonies: state.colonies.map((c) => {
        if (c.id !== colonyId) return c;
        return {
          ...c,
          seats: c.seats.filter((s) => s.id !== seatId),
          activeSeatId: c.activeSeatId === seatId ? undefined : c.activeSeatId,
          updatedAt: now,
        };
      }),
    }));
  },

  setActiveSeat: (colonyId, seatId) => {
    const colony = get().colonies.find((c) => c.id === colonyId);
    if (colony?.activeSeatId === seatId) return;

    const seat = seatId
      ? colony?.seats.find((s) => s.id === seatId)
      : null;
    const now = new Date().toISOString();
    const events = [...get().events];
    if (seatId && seat) {
      events.push({
        id: crypto.randomUUID(),
        type: "active_seat_changed",
        seatRole: seat.role,
        seatLabel: seat.label,
        timestamp: now,
      });
    }
    set({
      colonies: get().colonies.map((c) => {
        if (c.id !== colonyId) return c;
        return {
          ...c,
          activeSeatId: seatId ?? undefined,
        };
      }),
      events,
    });
  },

  bindSeatToSession: (colonyId, seatId, session) => {
    const seat = get()
      .colonies.find((c) => c.id === colonyId)
      ?.seats.find((s) => s.id === seatId);
    const now = new Date().toISOString();
    const events = [...get().events];
    if (seat) {
      events.push({
        id: crypto.randomUUID(),
        type: "seat_linked",
        seatRole: seat.role,
        seatLabel: seat.label,
        timestamp: now,
        details: session.sessionId.slice(0, 8),
      });
    }
    set({
      colonies: get().colonies.map((c) => {
        if (c.id !== colonyId) return c;
        return {
          ...c,
          seats: c.seats.map((s) =>
            s.id === seatId
              ? {
                  ...s,
                  sessionId: session.sessionId,
                  acpSessionId: session.acpSessionId,
                  providerId: session.providerId,
                  projectId: session.projectId,
                  binding: "linked",
                  lastUpdate: now,
                }
              : s,
          ),
          updatedAt: now,
        };
      }),
      events,
    });
  },

  unbindSeat: (colonyId, seatId) => {
    const seat = get()
      .colonies.find((c) => c.id === colonyId)
      ?.seats.find((s) => s.id === seatId);
    const now = new Date().toISOString();
    const events = [...get().events];
    if (seat) {
      events.push({
        id: crypto.randomUUID(),
        type: "seat_unlinked",
        seatRole: seat.role,
        seatLabel: seat.label,
        timestamp: now,
      });
    }
    set({
      colonies: get().colonies.map((c) => {
        if (c.id !== colonyId) return c;
        return {
          ...c,
          seats: c.seats.map((s) =>
            s.id === seatId
              ? {
                  ...s,
                  sessionId: undefined,
                  acpSessionId: undefined,
                  providerId: undefined,
                  projectId: undefined,
                  binding: "unbound",
                  lastUpdate: now,
                }
              : s,
          ),
          activeSeatId: c.activeSeatId === seatId ? undefined : c.activeSeatId,
          updatedAt: now,
        };
      }),
      events,
    });
  },

  logEvent: (type, seatRole, seatLabel, details, taskId, taskTitle) => {
    const event: ColonyEvent = {
      id: crypto.randomUUID(),
      type,
      seatRole,
      seatLabel,
      timestamp: new Date().toISOString(),
      details,
      taskId,
      taskTitle,
    };
    set((state) => ({
      events: [...state.events, event],
    }));
  },

  openSessionForSeat: (colonyId, seatId) => {
    const seat = get()
      .colonies.find((c) => c.id === colonyId)
      ?.seats.find((s) => s.id === seatId);
    if (seat?.sessionId) {
      get().logEvent(
        "session_opened",
        seat.role,
        seat.label,
        seat.sessionId.slice(0, 8),
      );
    }
  },

  createTask: (colonyId, title, description) => {
    const now = new Date().toISOString();
    const task: ColonyTask = {
      id: crypto.randomUUID(),
      title,
      description,
      status: "todo",
      createdAt: now,
      updatedAt: now,
    };
    set((state) => ({
      colonies: state.colonies.map((c) =>
        c.id !== colonyId
          ? c
          : { ...c, tasks: [...c.tasks, task], updatedAt: now },
      ),
    }));
    get().logEvent("task_created", undefined, undefined, title, task.id, title);
    return task;
  },

  assignTaskToSeat: (colonyId, taskId, seatId) => {
    const colony = get().colonies.find((c) => c.id === colonyId);
    const task = colony?.tasks.find((t) => t.id === taskId);
    const seat = seatId ? colony?.seats.find((s) => s.id === seatId) : null;
    if (!task || !colony) return;

    const now = new Date().toISOString();
    const newSeatId = seatId ?? null;
    const willAssign = !!seatId;

    set((state) => ({
      colonies: state.colonies.map((c) =>
        c.id !== colonyId
          ? c
          : {
              ...c,
              tasks: c.tasks.map((t) => {
                if (t.id !== taskId) {
                  if (
                    willAssign &&
                    t.assignedSeatId === newSeatId &&
                    t.status !== "done" &&
                    t.status !== "inProgress" &&
                    t.status !== "blocked"
                  ) {
                    return { ...t, assignedSeatId: undefined, status: "todo", updatedAt: now };
                  }
                  return t;
                }
                let newStatus = t.status;
                if (!newSeatId && t.status === "assigned") {
                  newStatus = "todo";
                } else if (newSeatId && t.status === "todo") {
                  newStatus = "assigned";
                }
                return {
                  ...t,
                  assignedSeatId: newSeatId ?? undefined,
                  status: newStatus,
                  updatedAt: now,
                };
              }),
              updatedAt: now,
            },
      ),
    }));

    if (seat) {
      get().logEvent(
        "task_assigned",
        seat.role,
        seat.label,
        task.title,
        task.id,
        task.title,
      );
    } else {
      get().logEvent(
        "task_assigned",
        undefined,
        undefined,
        task.title,
        task.id,
        task.title,
      );
    }
  },

  updateTaskStatus: (colonyId, taskId, status) => {
    const colony = get().colonies.find((c) => c.id === colonyId);
    const task = colony?.tasks.find((t) => t.id === taskId);
    if (!task) return;

    const now = new Date().toISOString();
    set((state) => ({
      colonies: state.colonies.map((c) =>
        c.id !== colonyId
          ? c
          : {
              ...c,
              tasks: c.tasks.map((t) =>
                t.id !== taskId ? t : { ...t, status, updatedAt: now },
              ),
              updatedAt: now,
            },
      ),
    }));
    get().logEvent(
      "task_status_changed",
      undefined,
      undefined,
      `${task.title}: ${status}`,
      task.id,
      task.title,
    );
  },

  deleteTask: (colonyId, taskId) => {
    const task = get()
      .colonies.find((c) => c.id === colonyId)
      ?.tasks.find((t) => t.id === taskId);
    if (!task) return;

    set((state) => ({
      colonies: state.colonies.map((c) =>
        c.id !== colonyId
          ? c
          : {
              ...c,
              tasks: c.tasks.filter((t) => t.id !== taskId),
              updatedAt: new Date().toISOString(),
            },
      ),
    }));
    get().logEvent(
      "task_deleted",
      undefined,
      undefined,
      task.title,
      task.id,
      task.title,
    );
  },
}));
