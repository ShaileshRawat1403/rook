import { create } from "zustand";
import type { ColonySession, ColonySeat, ColonyRole } from "./types";

interface ColonyStoreState {
  colonies: ColonySession[];
  activeColonyId: string | null;
  sentinelMode: "off" | "dax_open";
}

type ColonyStore = ColonyStoreState & {
  getActiveColony: () => ColonySession | null;
  setActiveColony: (colonyId: string | null) => void;
  createColony: (title: string, intent: string) => ColonySession;
  updateColony: (colonyId: string, updates: Partial<ColonySession>) => void;
  deleteColony: (colonyId: string) => void;
  setSentinelMode: (mode: "off" | "dax_open") => void;
  addSeat: (colonyId: string, role: ColonyRole, label: string) => void;
  updateSeat: (colonyId: string, seatId: string, updates: Partial<ColonySeat>) => void;
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
};

const DEFAULT_ROLES: ColonyRole[] = ["planner", "worker", "reviewer"];

export const useColonyStore = create<ColonyStore>((set, get) => ({
  colonies: [],
  activeColonyId: null,
  sentinelMode: "off",

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
      sentinelMode: "off",
      createdAt: now,
      updatedAt: now,
    };
    set((state) => ({
      colonies: [...state.colonies, colony],
      activeColonyId: id,
    }));
    return colony;
  },

  updateColony: (colonyId, updates) => {
    set((state) => ({
      colonies: state.colonies.map((c) =>
        c.id === colonyId
          ? { ...c, ...updates, updatedAt: new Date().toISOString() }
          : c,
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
            ? newColonies[0]?.id ?? null
            : state.activeColonyId,
      };
    });
  },

  setSentinelMode: (mode) => {
    const { activeColonyId, colonies } = get();
    if (!activeColonyId) {
      set({ sentinelMode: mode });
      return;
    }
    set({
      sentinelMode: mode,
      colonies: colonies.map((c) =>
        c.id === activeColonyId
          ? { ...c, sentinelMode: mode, updatedAt: new Date().toISOString() }
          : c,
      ),
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
    set((state) => ({
      colonies: state.colonies.map((c) =>
        c.id === colonyId
          ? {
              ...c,
              seats: c.seats.map((s) =>
                s.id === seatId
                  ? { ...s, ...updates, lastUpdate: new Date().toISOString() }
                  : s,
              ),
              updatedAt: new Date().toISOString(),
            }
          : c,
      ),
    }));
  },

  removeSeat: (colonyId, seatId) => {
    set((state) => ({
      colonies: state.colonies.map((c) =>
        c.id === colonyId
          ? {
              ...c,
              seats: c.seats.filter((s) => s.id !== seatId),
              activeSeatId:
                c.activeSeatId === seatId ? undefined : c.activeSeatId,
              updatedAt: new Date().toISOString(),
            }
          : c,
      ),
    }));
  },

  setActiveSeat: (colonyId, seatId) => {
    set((state) => ({
      colonies: state.colonies.map((c) =>
        c.id === colonyId
          ? {
              ...c,
              activeSeatId: seatId ?? undefined,
              seats: c.seats.map((s) => ({
                ...s,
                binding: s.id === seatId ? "active" : s.binding,
              })),
            }
          : c,
      ),
    }));
  },

  bindSeatToSession: (colonyId, seatId, session) => {
    const now = new Date().toISOString();
    set((state) => ({
      colonies: state.colonies.map((c) =>
        c.id === colonyId
          ? {
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
            }
          : c,
      ),
    }));
  },

  unbindSeat: (colonyId, seatId) => {
    const now = new Date().toISOString();
    set((state) => ({
      colonies: state.colonies.map((c) =>
        c.id === colonyId
          ? {
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
              activeSeatId:
                c.activeSeatId === seatId ? undefined : c.activeSeatId,
              updatedAt: now,
            }
          : c,
      ),
    }));
  },
}));