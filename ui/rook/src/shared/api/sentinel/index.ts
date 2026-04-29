import { invokeTauri, isTauriRuntimeAvailable } from "@/shared/api/tauri";
import { daxSentinel } from "./daxSentinel";
import { noopSentinel } from "./noopSentinel";
import type { Sentinel, SentinelMode } from "./types";

export type { Sentinel, SentinelMode } from "./types";

const SENTINEL_MODE_STORAGE_KEY = "rook:sentinel-mode";

let testSentinel: Sentinel | null = null;

function parseMode(value: string | null | undefined): SentinelMode | null {
  const normalized = value?.trim().toLowerCase();
  if (normalized === "off") return "off";
  if (normalized === "dax" || normalized === "dax_open") return "dax_open";
  return null;
}

function readStoredMode(): SentinelMode | null {
  if (typeof window === "undefined") return null;
  try {
    return parseMode(window.localStorage.getItem(SENTINEL_MODE_STORAGE_KEY));
  } catch {
    return null;
  }
}

async function resolveMode(): Promise<SentinelMode> {
  const storedMode = readStoredMode();
  if (storedMode) return storedMode;
  if (!isTauriRuntimeAvailable()) return "off";
  try {
    const raw = await invokeTauri<string>("get_sentinel_mode");
    return parseMode(raw) ?? "off";
  } catch {
    return "off";
  }
}

export async function getConfiguredSentinelMode(): Promise<SentinelMode> {
  return resolveMode();
}

export function setConfiguredSentinelMode(mode: SentinelMode): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SENTINEL_MODE_STORAGE_KEY, mode);
  } catch {
    // localStorage may be unavailable.
  }
}

/**
 * Resolve the active sentinel. The mode is resolved on every permission
 * request so the UI switch takes effect without reconnecting ACP.
 *
 * Local UI setting wins. When no UI setting exists, ROOK_SENTINEL=dax still
 * enables DAX Open for dev and smoke-test compatibility.
 */
export async function getSentinel(): Promise<Sentinel> {
  if (testSentinel) return testSentinel;
  const mode = await resolveMode();
  return mode === "dax_open" ? daxSentinel : noopSentinel;
}

/** Test/dev seam — replace the cached sentinel. */
export function __setSentinelForTesting(sentinel: Sentinel | null): void {
  testSentinel = sentinel;
}

/** Mode currently in effect. Returns 'off' before getSentinel() resolves. */
export function getSentinelMode(): SentinelMode {
  return testSentinel?.mode ?? readStoredMode() ?? "off";
}
