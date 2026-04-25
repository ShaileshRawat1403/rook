import { invokeTauri, isTauriRuntimeAvailable } from "@/shared/api/tauri";
import type { ExtensionConfig, ExtensionEntry } from "../types";

export function nameToKey(name: string): string {
  return name
    .replace(/\s/g, "")
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .toLowerCase();
}

export async function listExtensions(): Promise<ExtensionEntry[]> {
  if (!isTauriRuntimeAvailable()) {
    return [];
  }
  return invokeTauri("list_extensions");
}

export async function addExtension(
  name: string,
  extensionConfig: ExtensionConfig,
  enabled: boolean,
): Promise<void> {
  return invokeTauri("add_extension", {
    name,
    extensionConfig,
    enabled,
  });
}

export async function removeExtension(configKey: string): Promise<void> {
  return invokeTauri("remove_extension", { configKey });
}

export async function toggleExtension(
  configKey: string,
  enabled: boolean,
): Promise<void> {
  return invokeTauri("toggle_extension", { configKey, enabled });
}
