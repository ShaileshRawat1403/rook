const COLONY_STORAGE_KEY = "rook:colony-state:v1";

import type { ColonySession, ColonyEvent } from "./types";

export type PersistedColonyState = {
  colonies: ColonySession[];
  activeColonyId: string | null;
  sentinelMode: "off" | "dax_open";
  events: ColonyEvent[];
};

export function loadPersistedColonyState(): PersistedColonyState | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = localStorage.getItem(COLONY_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedColonyState;

    if (!Array.isArray(parsed.colonies)) return null;

    return {
      colonies: parsed.colonies,
      activeColonyId: parsed.activeColonyId ?? null,
      sentinelMode: parsed.sentinelMode ?? "off",
      events: Array.isArray(parsed.events) ? parsed.events : [],
    };
  } catch {
    return null;
  }
}

export function persistColonyState(state: {
  colonies: ColonySession[];
  activeColonyId: string | null;
  sentinelMode: "off" | "dax_open";
  events: ColonyEvent[];
}): void {
  if (typeof window === "undefined") return;

  const payload: PersistedColonyState = {
    colonies: state.colonies,
    activeColonyId: state.activeColonyId,
    sentinelMode: state.sentinelMode,
    events: state.events,
  };

  try {
    localStorage.setItem(COLONY_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // localStorage unavailable or full
  }
}