import { invokeTauri, isTauriRuntimeAvailable } from "./tauri";

export interface FileTreeEntry {
  name: string;
  path: string;
  kind: "file" | "directory";
}

export interface AttachmentPathInfo {
  name: string;
  path: string;
  kind: "file" | "directory";
  mimeType?: string | null;
}

export interface ImageAttachmentPayload {
  base64: string;
  mimeType: string;
}

export async function getHomeDir(): Promise<string> {
  if (!isTauriRuntimeAvailable()) {
    return "~";
  }
  return invokeTauri("get_home_dir");
}

export async function saveExportedSessionFile(
  defaultFilename: string,
  contents: string,
): Promise<string | null> {
  if (!isTauriRuntimeAvailable()) {
    return null;
  }
  return invokeTauri("save_exported_session_file", { defaultFilename, contents });
}

export async function pathExists(path: string): Promise<boolean> {
  if (!isTauriRuntimeAvailable()) {
    return false;
  }
  return invokeTauri("path_exists", { path });
}

export async function listFilesForMentions(
  roots: string[],
  maxResults = 1500,
): Promise<string[]> {
  if (!isTauriRuntimeAvailable()) {
    return [];
  }
  return invokeTauri("list_files_for_mentions", { roots, maxResults });
}

export async function listDirectoryEntries(
  path: string,
): Promise<FileTreeEntry[]> {
  if (!isTauriRuntimeAvailable()) {
    return [];
  }
  return invokeTauri("list_directory_entries", { path });
}

export async function inspectAttachmentPaths(
  paths: string[],
): Promise<AttachmentPathInfo[]> {
  if (!isTauriRuntimeAvailable()) {
    return [];
  }
  return invokeTauri("inspect_attachment_paths", { paths });
}

export async function readImageAttachment(
  path: string,
): Promise<ImageAttachmentPayload> {
  return invokeTauri("read_image_attachment", { path });
}
