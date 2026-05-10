import { create } from "zustand";
import { setConfiguredSentinelMode } from "@/shared/api/sentinel";
import type { AcceptanceCriterion } from "@/features/work-items/types";
import type {
  ColonySession,
  ColonySeat,
  ColonyRole,
  ColonyEvent,
  ColonyEventType,
  ColonyTask,
  ColonyHandoff,
  ColonyScope,
  ColonyMemory,
  ColonyArtifact,
  ColonyOutputContract,
  ColonyOutputReview,
} from "./types";
import {
  loadPersistedColonyState,
  persistColonyState,
} from "./colonyPersistence";
import { getSwarmRecipe } from "./swarm/recipes";

interface ColonyStoreState {
  colonies: ColonySession[];
  activeColonyId: string | null;
  sentinelMode: "off" | "dax_open";
  events: ColonyEvent[];
  preparedHandoff: {
    fromSeatId?: string;
    toSeatId?: string;
    taskId?: string;
    summary?: string;
    prompt?: string;
  } | null;
}

type ColonyStore = ColonyStoreState & {
  getActiveColony: () => ColonySession | null;
  setActiveColony: (colonyId: string | null) => void;
  createColony: (
    title: string,
    intent: string,
    workItemId?: string,
  ) => ColonySession;
  createColonyFromRecipe: (args: {
    title: string;
    intent: string;
    workItemId: string;
    recipeId: string;
    acceptanceCriteria?: AcceptanceCriterion[];
  }) => ColonySession;
  closeColony: (colonyId: string, reason?: string) => void;
  markOutputReviewed: (colonyId: string, note?: string) => void;
  requestOutputChanges: (colonyId: string, note?: string) => void;
  updateColony: (colonyId: string, updates: Partial<ColonySession>) => void;
  deleteColony: (colonyId: string) => void;
  setSentinelMode: (mode: "off" | "dax_open") => void;
  syncSentinelMode: (mode: "off" | "dax_open") => void;
  setColonyScope: (colonyId: string, scope: ColonyScope) => void;
  clearColonyScope: (colonyId: string) => void;
  updateColonyMemory: (colonyId: string, patch: Partial<ColonyMemory>) => void;
  addMemoryItem: (
    colonyId: string,
    section: keyof Omit<ColonyMemory, "updatedAt">,
    text: string,
  ) => void;
  removeMemoryItem: (
    colonyId: string,
    section: keyof Omit<ColonyMemory, "updatedAt">,
    index: number,
  ) => void;
  createArtifact: (
    colonyId: string,
    artifact: Omit<ColonyArtifact, "id" | "createdAt" | "updatedAt">,
  ) => void;
  updateArtifact: (
    colonyId: string,
    artifactId: string,
    patch: Partial<Omit<ColonyArtifact, "id" | "createdAt" | "updatedAt">>,
  ) => void;
  deleteArtifact: (colonyId: string, artifactId: string) => void;
  prepareHandoff: (data: {
    fromSeatId?: string;
    toSeatId?: string;
    taskId?: string;
    summary?: string;
    prompt?: string;
  }) => void;
  clearPreparedHandoff: () => void;
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
      modelName?: string;
      projectId?: string;
    },
  ) => void;
  unbindSeat: (colonyId: string, seatId: string) => void;
  updateSeatModel: (
    colonyId: string,
    seatId: string,
    modelName: string,
  ) => void;
  logEvent: (
    type: ColonyEventType,
    seatRole?: ColonyRole,
    seatLabel?: string,
    details?: string,
    taskId?: string,
    taskTitle?: string,
    handoffId?: string,
  ) => void;
  openSessionForSeat: (colonyId: string, seatId: string) => void;
  createTask: (
    colonyId: string,
    title: string,
    description?: string,
  ) => ColonyTask;
  assignTaskToSeat: (
    colonyId: string,
    taskId: string,
    seatId: string | null,
  ) => void;
  updateTaskStatus: (
    colonyId: string,
    taskId: string,
    status: ColonyTask["status"],
  ) => void;
  deleteTask: (colonyId: string, taskId: string) => void;
  createHandoff: (
    colonyId: string,
    fromSeatId: string,
    toSeatId: string,
    taskId?: string,
    summary?: string,
  ) => ColonyHandoff;
  updateHandoff: (
    colonyId: string,
    handoffId: string,
    updates: Partial<ColonyHandoff>,
  ) => void;
  markHandoffStaged: (colonyId: string, handoffId: string) => void;
  markHandoffCopied: (colonyId: string, handoffId: string) => void;
  deleteHandoff: (colonyId: string, handoffId: string) => void;
  reviewHandoff: (
    colonyId: string,
    handoffId: string,
    reviewStatus: "approved" | "rejected",
    reviewNote?: string,
  ) => void;
};

const DEFAULT_ROLES: ColonyRole[] = ["planner", "worker", "reviewer"];

export function isColonyClosed(colony?: ColonySession | null): boolean {
  return (
    colony?.lifecycleStatus === "closed" ||
    colony?.lifecycleStatus === "archived"
  );
}

const persisted = loadPersistedColonyState();

export const colonyStore = create<ColonyStore>((set, get) => ({
  colonies: persisted?.colonies ?? [],
  activeColonyId: persisted?.activeColonyId ?? null,
  sentinelMode: persisted?.sentinelMode ?? "off",
  events: persisted?.events ?? [],
  preparedHandoff: null,

  getActiveColony: () => {
    const { colonies, activeColonyId } = get();
    return colonies.find((c) => c.id === activeColonyId) ?? null;
  },

  setActiveColony: (colonyId) => {
    set({ activeColonyId: colonyId });
    const state = get();
    persistColonyState({
      colonies: state.colonies,
      activeColonyId: state.activeColonyId,
      sentinelMode: state.sentinelMode,
      events: state.events,
    });
  },

  prepareHandoff: (data) => {
    set({ preparedHandoff: data });
  },

  clearPreparedHandoff: () => {
    set({ preparedHandoff: null });
  },

  setColonyScope: (colonyId, scope) => {
    if (isColonyClosed(get().colonies.find((c) => c.id === colonyId))) return;
    const now = new Date().toISOString();
    const details = `${scope.locked ? "locked" : "editable"} ${scope.kind}: ${
      scope.path || scope.label
    }`;
    set((state) => ({
      colonies: state.colonies.map((c) =>
        c.id === colonyId ? { ...c, scope, updatedAt: now } : c,
      ),
      events: [
        ...state.events,
        {
          id: crypto.randomUUID(),
          type: "scope_updated",
          timestamp: now,
          details,
        },
      ],
    }));
    const state = get();
    persistColonyState({
      colonies: state.colonies,
      activeColonyId: state.activeColonyId,
      sentinelMode: state.sentinelMode,
      events: state.events,
    });
  },

  clearColonyScope: (colonyId) => {
    if (isColonyClosed(get().colonies.find((c) => c.id === colonyId))) return;
    const now = new Date().toISOString();
    set((state) => ({
      colonies: state.colonies.map((c) =>
        c.id === colonyId ? { ...c, scope: undefined, updatedAt: now } : c,
      ),
      events: [
        ...state.events,
        {
          id: crypto.randomUUID(),
          type: "scope_updated",
          timestamp: now,
          details: "cleared",
        },
      ],
    }));
    const state = get();
    persistColonyState({
      colonies: state.colonies,
      activeColonyId: state.activeColonyId,
      sentinelMode: state.sentinelMode,
      events: state.events,
    });
  },

  updateColonyMemory: (colonyId, patch) => {
    if (isColonyClosed(get().colonies.find((c) => c.id === colonyId))) return;
    const now = new Date().toISOString();
    set((state) => ({
      colonies: state.colonies.map((c) =>
        c.id === colonyId
          ? {
              ...c,
              memory: {
                projectSummary:
                  patch.projectSummary ?? c.memory?.projectSummary ?? "",
                repoNotes: patch.repoNotes ?? c.memory?.repoNotes ?? [],
                decisions: patch.decisions ?? c.memory?.decisions ?? [],
                constraints: patch.constraints ?? c.memory?.constraints ?? [],
                risks: patch.risks ?? c.memory?.risks ?? [],
                openQuestions:
                  patch.openQuestions ?? c.memory?.openQuestions ?? [],
                updatedAt: now,
              },
              updatedAt: now,
            }
          : c,
      ),
    }));
    const state = get();
    persistColonyState({
      colonies: state.colonies,
      activeColonyId: state.activeColonyId,
      sentinelMode: state.sentinelMode,
      events: state.events,
    });
  },

  addMemoryItem: (colonyId, section, text) => {
    if (isColonyClosed(get().colonies.find((c) => c.id === colonyId))) return;
    const trimmed = text.trim();
    if (!trimmed) return;
    const now = new Date().toISOString();
    set((state) => ({
      colonies: state.colonies.map((c) => {
        if (c.id !== colonyId) return c;
        const memory = c.memory ?? {
          projectSummary: "",
          repoNotes: [],
          decisions: [],
          constraints: [],
          risks: [],
          openQuestions: [],
          updatedAt: now,
        };
        const existing = memory[section];
        if (!Array.isArray(existing)) return c;
        return {
          ...c,
          memory: {
            ...memory,
            [section]: [...existing, trimmed],
            updatedAt: now,
          },
          updatedAt: now,
        };
      }),
    }));
    const state = get();
    persistColonyState({
      colonies: state.colonies,
      activeColonyId: state.activeColonyId,
      sentinelMode: state.sentinelMode,
      events: state.events,
    });
  },

  removeMemoryItem: (colonyId, section, index) => {
    if (isColonyClosed(get().colonies.find((c) => c.id === colonyId))) return;
    const now = new Date().toISOString();
    set((state) => ({
      colonies: state.colonies.map((c) => {
        if (c.id !== colonyId) return c;
        if (!c.memory) return c;
        const existing = c.memory[section];
        if (!Array.isArray(existing)) return c;
        if (index < 0 || index >= existing.length) return c;
        const updated = existing.filter((_, i) => i !== index);
        return {
          ...c,
          memory: {
            ...c.memory,
            [section]: updated,
            updatedAt: now,
          },
          updatedAt: now,
        };
      }),
    }));
    const state = get();
    persistColonyState({
      colonies: state.colonies,
      activeColonyId: state.activeColonyId,
      sentinelMode: state.sentinelMode,
      events: state.events,
    });
  },

  createArtifact: (colonyId, artifact) => {
    if (isColonyClosed(get().colonies.find((c) => c.id === colonyId))) return;
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const newArtifact: ColonyArtifact = {
      ...artifact,
      id,
      createdAt: now,
      updatedAt: now,
    };
    set((state) => ({
      colonies: state.colonies.map((c) => {
        if (c.id !== colonyId) return c;
        return {
          ...c,
          artifacts: [...(c.artifacts ?? []), newArtifact],
          updatedAt: now,
        };
      }),
    }));
    const state = get();
    persistColonyState({
      colonies: state.colonies,
      activeColonyId: state.activeColonyId,
      sentinelMode: state.sentinelMode,
      events: state.events,
    });
  },

  updateArtifact: (colonyId, artifactId, patch) => {
    if (isColonyClosed(get().colonies.find((c) => c.id === colonyId))) return;
    const now = new Date().toISOString();
    set((state) => ({
      colonies: state.colonies.map((c) => {
        if (c.id !== colonyId) return c;
        return {
          ...c,
          artifacts: (c.artifacts ?? []).map((a) =>
            a.id === artifactId ? { ...a, ...patch, updatedAt: now } : a,
          ),
          updatedAt: now,
        };
      }),
    }));
    const state = get();
    persistColonyState({
      colonies: state.colonies,
      activeColonyId: state.activeColonyId,
      sentinelMode: state.sentinelMode,
      events: state.events,
    });
  },

  deleteArtifact: (colonyId, artifactId) => {
    if (isColonyClosed(get().colonies.find((c) => c.id === colonyId))) return;
    const now = new Date().toISOString();
    set((state) => ({
      colonies: state.colonies.map((c) => {
        if (c.id !== colonyId) return c;
        return {
          ...c,
          artifacts: (c.artifacts ?? []).filter((a) => a.id !== artifactId),
          updatedAt: now,
        };
      }),
    }));
    const state = get();
    persistColonyState({
      colonies: state.colonies,
      activeColonyId: state.activeColonyId,
      sentinelMode: state.sentinelMode,
      events: state.events,
    });
  },

  createColony: (title, intent, workItemId) => {
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
      workItemId,
      lifecycleStatus: "active",
      seats,
      tasks: [],
      handoffs: [],
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
    const state = get();
    persistColonyState({
      colonies: state.colonies,
      activeColonyId: state.activeColonyId,
      sentinelMode: state.sentinelMode,
      events: state.events,
    });
    return colony;
  },

  createColonyFromRecipe: ({
    title,
    intent,
    workItemId,
    recipeId,
    acceptanceCriteria,
  }) => {
    const recipe = getSwarmRecipe(recipeId);
    if (!recipe) {
      throw new Error(`Unknown recipe: ${recipeId}`);
    }
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const specialistCount = recipe.specialists.length;
    const seats: ColonySeat[] = recipe.specialists.map((specialist, index) => {
      let role: ColonyRole = "worker";
      if (specialistCount > 1) {
        if (index === 0) role = "planner";
        else if (index === specialistCount - 1) role = "reviewer";
      }
      return {
        id: crypto.randomUUID(),
        role,
        label: specialist.role,
        binding: "unbound",
        status: "idle",
        lastUpdate: now,
      };
    });
    const tasks: ColonyTask[] = (acceptanceCriteria ?? []).map((ac) => ({
      id: crypto.randomUUID(),
      title: ac.text,
      status: "todo",
      sourceAcceptanceCriterionId: ac.id,
      createdAt: now,
      updatedAt: now,
    }));
    const outputContract: ColonyOutputContract = {
      source: "recipe",
      recipeId: recipe.id,
      recipeVersion: recipe.version,
      artifactType: recipe.finalArtifact.artifactType,
      format: recipe.finalArtifact.format,
      requiredSections: [...recipe.finalArtifact.requiredSections],
      evidenceRequired: recipe.finalArtifact.evidenceRequired,
      reviewerRequired: recipe.finalArtifact.reviewerRequired,
    };
    const colony: ColonySession = {
      id,
      title,
      intent,
      workItemId,
      recipeId: recipe.id,
      recipeVersion: recipe.version,
      outputContract,
      lifecycleStatus: "active",
      seats,
      tasks,
      handoffs: [],
      sentinelMode: "off",
      createdAt: now,
      updatedAt: now,
    };
    const newEvent: ColonyEvent = {
      id: crypto.randomUUID(),
      type: "colony_created",
      timestamp: now,
      details: `${title} (${recipe.id} v${recipe.version})`,
    };
    set({
      colonies: [colony],
      activeColonyId: id,
      events: [newEvent],
    });
    const state = get();
    persistColonyState({
      colonies: state.colonies,
      activeColonyId: state.activeColonyId,
      sentinelMode: state.sentinelMode,
      events: state.events,
    });
    return colony;
  },

  closeColony: (colonyId, reason) => {
    const colony = get().colonies.find((c) => c.id === colonyId);
    if (!colony || isColonyClosed(colony)) return;
    const now = new Date().toISOString();
    set((state) => ({
      colonies: state.colonies.map((c) =>
        c.id !== colonyId
          ? c
          : {
              ...c,
              lifecycleStatus: "closed" as const,
              closedAt: now,
              closedReason: reason,
              updatedAt: now,
            },
      ),
      events: [
        ...state.events,
        {
          id: crypto.randomUUID(),
          type: "colony_closed",
          timestamp: now,
          details: reason ?? colony.title,
        },
      ],
    }));
    const state = get();
    persistColonyState({
      colonies: state.colonies,
      activeColonyId: state.activeColonyId,
      sentinelMode: state.sentinelMode,
      events: state.events,
    });
  },

  markOutputReviewed: (colonyId, note) => {
    const colony = get().colonies.find((c) => c.id === colonyId);
    if (!colony || isColonyClosed(colony)) return;
    const now = new Date().toISOString();
    const review: ColonyOutputReview = {
      status: "approved",
      reviewedAt: now,
      note,
    };
    set((state) => ({
      colonies: state.colonies.map((c) =>
        c.id !== colonyId
          ? c
          : { ...c, outputReview: review, updatedAt: now },
      ),
      events: [
        ...state.events,
        {
          id: crypto.randomUUID(),
          type: "output_reviewed",
          timestamp: now,
          details: note ?? colony.title,
        },
      ],
    }));
    const state = get();
    persistColonyState({
      colonies: state.colonies,
      activeColonyId: state.activeColonyId,
      sentinelMode: state.sentinelMode,
      events: state.events,
    });
  },

  requestOutputChanges: (colonyId, note) => {
    const colony = get().colonies.find((c) => c.id === colonyId);
    if (!colony || isColonyClosed(colony)) return;
    const now = new Date().toISOString();
    const review: ColonyOutputReview = {
      status: "changes_requested",
      reviewedAt: now,
      note,
    };
    set((state) => ({
      colonies: state.colonies.map((c) =>
        c.id !== colonyId
          ? c
          : { ...c, outputReview: review, updatedAt: now },
      ),
      events: [
        ...state.events,
        {
          id: crypto.randomUUID(),
          type: "output_changes_requested",
          timestamp: now,
          details: note ?? colony.title,
        },
      ],
    }));
    const state = get();
    persistColonyState({
      colonies: state.colonies,
      activeColonyId: state.activeColonyId,
      sentinelMode: state.sentinelMode,
      events: state.events,
    });
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

    if (mode === oldMode) return;

    // Sync with global sentinel mode
    setConfiguredSentinelMode(mode);

    // Dispatch a custom event to sync other components (like SentinelBadge)
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("sentinel-mode-changed"));
    }

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
    const state = get();
    persistColonyState({
      colonies: state.colonies,
      activeColonyId: state.activeColonyId,
      sentinelMode: state.sentinelMode,
      events: state.events,
    });
  },

  syncSentinelMode: (mode) => {
    const { activeColonyId, colonies, sentinelMode: oldMode } = get();
    if (mode === oldMode) return;

    const now = new Date().toISOString();
    set({
      sentinelMode: mode,
      colonies: activeColonyId
        ? colonies.map((c) =>
            c.id === activeColonyId
              ? { ...c, sentinelMode: mode, updatedAt: now }
              : c,
          )
        : colonies,
    });
    const state = get();
    persistColonyState({
      colonies: state.colonies,
      activeColonyId: state.activeColonyId,
      sentinelMode: state.sentinelMode,
      events: state.events,
    });
  },

  addSeat: (colonyId, role, label) => {
    if (isColonyClosed(get().colonies.find((c) => c.id === colonyId))) return;
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
    if (isColonyClosed(get().colonies.find((c) => c.id === colonyId))) return;
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
    if (isColonyClosed(get().colonies.find((c) => c.id === colonyId))) return;
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

    const seat = seatId ? colony?.seats.find((s) => s.id === seatId) : null;
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
    const colony = get().colonies.find((c) => c.id === colonyId);
    if (isColonyClosed(colony)) return;
    const seat = colony?.seats.find((s) => s.id === seatId);
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
                  modelName: session.modelName ?? s.modelName,
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
    const state = get();
    persistColonyState({
      colonies: state.colonies,
      activeColonyId: state.activeColonyId,
      sentinelMode: state.sentinelMode,
      events: state.events,
    });
  },

  unbindSeat: (colonyId, seatId) => {
    const colony = get().colonies.find((c) => c.id === colonyId);
    if (isColonyClosed(colony)) return;
    const seat = colony?.seats.find((s) => s.id === seatId);
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

  updateSeatModel: (colonyId, seatId, modelName) => {
    if (!modelName) return;
    const colony = get().colonies.find((c) => c.id === colonyId);
    if (isColonyClosed(colony)) return;
    const seat = colony?.seats.find((s) => s.id === seatId);
    set((state) => ({
      colonies: state.colonies.map((c) =>
        c.id !== colonyId
          ? c
          : {
              ...c,
              seats: c.seats.map((s) =>
                s.id === seatId
                  ? { ...s, modelName, lastUpdate: new Date().toISOString() }
                  : s,
              ),
              updatedAt: new Date().toISOString(),
            },
      ),
    }));
    if (seat?.sessionId) {
      import("@/features/chat/stores/chatSessionStore")
        .then(({ useChatSessionStore }) => {
          const sessionId = seat.sessionId;
          if (sessionId) {
            useChatSessionStore.getState().updateSession(sessionId, {
              modelName,
              updatedAt: new Date().toISOString(),
            });
          }
        })
        .catch((err) => {
          console.warn("[colony] Failed to sync model to session:", err);
        });
    }
    if (seat) {
      get().logEvent("seat_model_changed", seat.role, seat.label, modelName);
    }
  },

  logEvent: (
    type,
    seatRole,
    seatLabel,
    details,
    taskId,
    taskTitle,
    handoffId,
  ) => {
    const event: ColonyEvent = {
      id: crypto.randomUUID(),
      type,
      seatRole,
      seatLabel,
      timestamp: new Date().toISOString(),
      details,
      taskId,
      taskTitle,
      handoffId,
    };
    set((state) => ({
      events: [...state.events, event],
    }));
    const state = get();
    persistColonyState({
      colonies: state.colonies,
      activeColonyId: state.activeColonyId,
      sentinelMode: state.sentinelMode,
      events: state.events,
    });
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
    const colony = get().colonies.find((c) => c.id === colonyId);
    if (isColonyClosed(colony)) {
      throw new Error("Cannot create task: Colony is closed");
    }
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
    const state = get();
    persistColonyState({
      colonies: state.colonies,
      activeColonyId: state.activeColonyId,
      sentinelMode: state.sentinelMode,
      events: state.events,
    });
    return task;
  },

  assignTaskToSeat: (colonyId, taskId, seatId) => {
    const colony = get().colonies.find((c) => c.id === colonyId);
    if (isColonyClosed(colony)) return;
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
                    return {
                      ...t,
                      assignedSeatId: undefined,
                      status: "todo",
                      updatedAt: now,
                    };
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
    if (isColonyClosed(colony)) return;
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
    const colony = get().colonies.find((c) => c.id === colonyId);
    if (isColonyClosed(colony)) return;
    const task = colony?.tasks.find((t) => t.id === taskId);
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

  createHandoff: (colonyId, fromSeatId, toSeatId, taskId, summary = "") => {
    const colony = get().colonies.find((c) => c.id === colonyId);
    if (isColonyClosed(colony)) {
      throw new Error("Cannot create handoff: Colony is closed");
    }
    const fromSeat = colony?.seats.find((s) => s.id === fromSeatId);
    const toSeat = colony?.seats.find((s) => s.id === toSeatId);
    if (!colony || !fromSeat || !toSeat) {
      throw new Error("Invalid colony or seat");
    }
    const now = new Date().toISOString();
    const isReady = summary.trim().length > 0;
    const handoff: ColonyHandoff = {
      id: crypto.randomUUID(),
      fromSeatId,
      toSeatId,
      taskId,
      summary,
      status: isReady ? "ready" : "draft",
      createdAt: now,
      updatedAt: now,
    };
    set((state) => ({
      colonies: state.colonies.map((c) =>
        c.id !== colonyId
          ? c
          : { ...c, handoffs: [...c.handoffs, handoff], updatedAt: now },
      ),
    }));
    get().logEvent(
      "handoff_created",
      fromSeat.role,
      fromSeat.label,
      `to ${toSeat.label}`,
      taskId,
      undefined,
      handoff.id,
    );
    const state = get();
    persistColonyState({
      colonies: state.colonies,
      activeColonyId: state.activeColonyId,
      sentinelMode: state.sentinelMode,
      events: state.events,
    });
    return handoff;
  },

  updateHandoff: (colonyId, handoffId, updates) => {
    const colony = get().colonies.find((c) => c.id === colonyId);
    if (isColonyClosed(colony)) return;
    const handoff = colony?.handoffs.find((h) => h.id === handoffId);
    if (!handoff || !colony) return;

    const now = new Date().toISOString();
    set((state) => ({
      colonies: state.colonies.map((c) =>
        c.id !== colonyId
          ? c
          : {
              ...c,
              handoffs: c.handoffs.map((h) =>
                h.id !== handoffId ? h : { ...h, ...updates, updatedAt: now },
              ),
              updatedAt: now,
            },
      ),
    }));
    get().logEvent(
      "handoff_updated",
      undefined,
      undefined,
      updates.status ?? "updated",
      handoff.taskId,
      undefined,
      handoff.id,
    );
  },

  markHandoffStaged: (colonyId, handoffId) => {
    const colony = get().colonies.find((c) => c.id === colonyId);
    if (isColonyClosed(colony)) return;
    const handoff = colony?.handoffs.find((h) => h.id === handoffId);
    const toSeat = colony?.seats.find((s) => s.id === handoff?.toSeatId);
    if (!handoff || !colony) return;

    const now = new Date().toISOString();
    set((state) => ({
      colonies: state.colonies.map((c) =>
        c.id !== colonyId
          ? c
          : {
              ...c,
              handoffs: c.handoffs.map((h) =>
                h.id !== handoffId
                  ? h
                  : { ...h, status: "copied" as const, updatedAt: now },
              ),
              updatedAt: now,
            },
      ),
    }));
    get().logEvent(
      "handoff_staged",
      toSeat?.role,
      toSeat?.label,
      "draft staged in chat input",
      handoff.taskId,
      undefined,
      handoff.id,
    );
  },

  markHandoffCopied: (colonyId, handoffId) => {
    const colony = get().colonies.find((c) => c.id === colonyId);
    if (isColonyClosed(colony)) return;
    const handoff = colony?.handoffs.find((h) => h.id === handoffId);
    const fromSeat = colony?.seats.find((s) => s.id === handoff?.fromSeatId);
    if (!handoff || !colony) return;

    const now = new Date().toISOString();
    set((state) => ({
      colonies: state.colonies.map((c) =>
        c.id !== colonyId
          ? c
          : {
              ...c,
              handoffs: c.handoffs.map((h) =>
                h.id !== handoffId
                  ? h
                  : { ...h, status: "copied" as const, updatedAt: now },
              ),
              updatedAt: now,
            },
      ),
    }));
    get().logEvent(
      "handoff_copied",
      fromSeat?.role,
      fromSeat?.label,
      "copied",
      handoff.taskId,
      undefined,
      handoff.id,
    );
  },

  deleteHandoff: (colonyId, handoffId) => {
    const colony = get().colonies.find((c) => c.id === colonyId);
    if (isColonyClosed(colony)) return;
    const handoff = colony?.handoffs.find((h) => h.id === handoffId);
    if (!handoff) return;

    set((state) => ({
      colonies: state.colonies.map((c) =>
        c.id !== colonyId
          ? c
          : {
              ...c,
              handoffs: c.handoffs.filter((h) => h.id !== handoffId),
              updatedAt: new Date().toISOString(),
            },
      ),
    }));
    get().logEvent(
      "handoff_deleted",
      undefined,
      undefined,
      "deleted",
      handoff.id,
      "deleted",
    );
  },

  reviewHandoff: (colonyId, handoffId, reviewStatus, reviewNote) => {
    if (isColonyClosed(get().colonies.find((c) => c.id === colonyId))) return;
    set((state) => ({
      colonies: state.colonies.map((c) =>
        c.id !== colonyId
          ? c
          : {
              ...c,
              handoffs: c.handoffs.map((h) =>
                h.id !== handoffId
                  ? h
                  : {
                      ...h,
                      reviewStatus,
                      reviewNote: reviewNote ?? h.reviewNote,
                      updatedAt: new Date().toISOString(),
                    },
              ),
              updatedAt: new Date().toISOString(),
            },
      ),
    }));
    get().logEvent(
      "handoff_updated",
      undefined,
      undefined,
      reviewNote ? `${reviewStatus}: ${reviewNote}` : reviewStatus,
      undefined,
      undefined,
      handoffId,
    );
  },
}));

export const useColonyStore = colonyStore;
