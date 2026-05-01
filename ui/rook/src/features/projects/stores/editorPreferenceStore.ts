import { create } from "zustand";
import type { EditorId } from "@/shared/api/openActions";

const STORAGE_KEY = "rook:editor-preference";
const DEFAULT_EDITOR: EditorId = "vscode";

function isEditorId(value: unknown): value is EditorId {
  return value === "vscode" || value === "cursor";
}

function loadStored(): EditorId {
  if (typeof window === "undefined") return DEFAULT_EDITOR;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored && isEditorId(stored)) return stored;
  } catch {
    // ignore storage errors and fall through to default
  }
  return DEFAULT_EDITOR;
}

function persist(editor: EditorId): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, editor);
  } catch {
    // best-effort persistence
  }
}

interface EditorPreferenceState {
  editor: EditorId;
  setEditor: (editor: EditorId) => void;
}

export const useEditorPreferenceStore = create<EditorPreferenceState>(
  (set) => ({
    editor: loadStored(),
    setEditor: (editor) => {
      persist(editor);
      set({ editor });
    },
  }),
);

export const __testing = { STORAGE_KEY, DEFAULT_EDITOR, isEditorId };
