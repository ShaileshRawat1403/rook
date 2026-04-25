import { invokeTauri, isTauriRuntimeAvailable } from "./tauri";

export interface ResolvePathParams {
  parts: string[];
}

export interface ResolvedPath {
  path: string;
}

export async function resolvePath({
  parts,
}: ResolvePathParams): Promise<ResolvedPath> {
  if (!isTauriRuntimeAvailable()) {
    return {
      path: parts.join("/").replace(/\/{2,}/g, "/"),
    };
  }

  return invokeTauri("resolve_path", {
    request: { parts },
  });
}
