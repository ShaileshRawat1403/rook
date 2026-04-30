import { create } from "zustand";
import type { IntentClassification } from "./types";

interface IntentState {
  currentBySession: Record<string, IntentClassification | undefined>;
  setCurrent: (sessionId: string, intent: IntentClassification) => void;
  clearCurrent: (sessionId: string) => void;
}

export const useIntentStore = create<IntentState>((set) => ({
  currentBySession: {},
  setCurrent: (sessionId, intent) =>
    set((state) => ({
      currentBySession: {
        ...state.currentBySession,
        [sessionId]: intent,
      },
    })),
  clearCurrent: (sessionId) =>
    set((state) => {
      const next = { ...state.currentBySession };
      delete next[sessionId];
      return { currentBySession: next };
    }),
}));
