import { openPath, revealItemInDir } from "@tauri-apps/plugin-opener";
import { invokeTauri, isTauriRuntimeAvailable } from "./tauri";

export type EditorId = "vscode" | "cursor";

function requireTauri(name: string): void {
  if (!isTauriRuntimeAvailable()) {
    throw new Error(`${name} is only available in the desktop app`);
  }
}

export async function revealInFileManager(path: string): Promise<void> {
  requireTauri("revealInFileManager");
  await revealItemInDir(path);
}

export async function openInDefaultApp(path: string): Promise<void> {
  requireTauri("openInDefaultApp");
  await openPath(path);
}

export async function openInTerminal(path: string): Promise<void> {
  requireTauri("openInTerminal");
  await invokeTauri<void>("open_in_terminal", { path });
}

export async function openInEditor(
  workspacePath: string,
  targetPath: string,
  editor: EditorId,
): Promise<void> {
  requireTauri("openInEditor");
  await invokeTauri<void>("open_in_editor", {
    workspacePath,
    targetPath,
    editor,
  });
}
