import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const STORAGE_KEY = "rook:editor-preference";

async function freshStore() {
  vi.resetModules();
  return import("./editorPreferenceStore");
}

describe("editorPreferenceStore", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it("defaults to vscode when no preference is stored", async () => {
    const { useEditorPreferenceStore } = await freshStore();
    expect(useEditorPreferenceStore.getState().editor).toBe("vscode");
  });

  it("persists changes to localStorage", async () => {
    const { useEditorPreferenceStore } = await freshStore();
    useEditorPreferenceStore.getState().setEditor("cursor");
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe("cursor");
    expect(useEditorPreferenceStore.getState().editor).toBe("cursor");
  });

  it("loads previously stored preference on init", async () => {
    window.localStorage.setItem(STORAGE_KEY, "cursor");
    const { useEditorPreferenceStore } = await freshStore();
    expect(useEditorPreferenceStore.getState().editor).toBe("cursor");
  });

  it("ignores invalid stored values and falls back to the default", async () => {
    window.localStorage.setItem(STORAGE_KEY, "notepad");
    const { useEditorPreferenceStore } = await freshStore();
    expect(useEditorPreferenceStore.getState().editor).toBe("vscode");
  });

  it("isEditorId rejects non-editor strings", async () => {
    const { __testing } = await freshStore();
    expect(__testing.isEditorId("vscode")).toBe(true);
    expect(__testing.isEditorId("cursor")).toBe(true);
    expect(__testing.isEditorId("nano")).toBe(false);
    expect(__testing.isEditorId(42)).toBe(false);
  });
});
