import { invoke } from "@tauri-apps/api/core";

export interface ResolvePathParams {
  parts: string[];
}

export interface ResolvedPath {
  path: string;
}

function isTauriRuntimeAvailable(): boolean {
  return typeof window !== "undefined" && Boolean(window.__TAURI_INTERNALS__);
}

export async function resolvePath({
  parts,
}: ResolvePathParams): Promise<ResolvedPath> {
  if (!isTauriRuntimeAvailable()) {
    return {
      path: parts.join("/").replace(/\/{2,}/g, "/"),
    };
  }

  return invoke("resolve_path", {
    request: { parts },
  });
}
