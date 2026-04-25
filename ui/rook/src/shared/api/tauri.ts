import {
  convertFileSrc as tauriConvertFileSrc,
  invoke as tauriInvoke,
} from "@tauri-apps/api/core";

type TauriWindow = Window & {
  __TAURI_INTERNALS__?: unknown;
};

export function isTauriRuntimeAvailable(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof tauriInvoke === "function" &&
    Boolean((window as TauriWindow).__TAURI_INTERNALS__)
  );
}

export async function invokeTauri<T>(
  command: string,
  args?: Record<string, unknown>,
): Promise<T> {
  if (!isTauriRuntimeAvailable()) {
    throw new Error(`${command} is only available in the desktop app`);
  }

  return tauriInvoke<T>(command, args);
}

export function toFileSrc(path: string): string {
  if (!isTauriRuntimeAvailable() || typeof tauriConvertFileSrc !== "function") {
    return path;
  }

  return tauriConvertFileSrc(path);
}
