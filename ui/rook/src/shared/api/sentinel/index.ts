import { invokeTauri, isTauriRuntimeAvailable } from "@/shared/api/tauri";
import { daxSentinel } from "./daxSentinel";
import { noopSentinel } from "./noopSentinel";
import type { Sentinel, SentinelMode } from "./types";

export type { Sentinel, SentinelMode } from "./types";

let cached: Sentinel | null = null;

async function resolveMode(): Promise<SentinelMode> {
  if (!isTauriRuntimeAvailable()) return "off";
  try {
    const raw = await invokeTauri<string>("get_sentinel_mode");
    return raw === "dax" ? "dax" : "off";
  } catch {
    return "off";
  }
}

/**
 * Resolve the active sentinel. Memoized — call sites can request it on
 * every permission event without re-querying the backend.
 *
 * Mode is driven by the ROOK_SENTINEL env var read by the Rust side
 * (off | dax). Default is off; existing auto-approve behavior is
 * preserved unless the user explicitly opts in.
 */
export async function getSentinel(): Promise<Sentinel> {
  if (cached) return cached;
  const mode = await resolveMode();
  cached = mode === "dax" ? daxSentinel : noopSentinel;
  return cached;
}

/** Test/dev seam — replace the cached sentinel. */
export function __setSentinelForTesting(sentinel: Sentinel | null): void {
  cached = sentinel;
}

/** Mode currently in effect. Returns 'off' before getSentinel() resolves. */
export function getSentinelMode(): SentinelMode {
  return cached?.mode ?? "off";
}
