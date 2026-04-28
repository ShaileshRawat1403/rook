import { noopSentinel } from "./noopSentinel";
import type { Sentinel, SentinelMode } from "./types";

export type { Sentinel, SentinelMode } from "./types";

let cached: Sentinel | null = null;

/**
 * Resolve the active sentinel. v0.1: always noop. The DAX-backed
 * sentinel and runtime mode resolution land in the next commit.
 */
export async function getSentinel(): Promise<Sentinel> {
  if (cached) return cached;
  cached = noopSentinel;
  return cached;
}

/** Test/dev seam — replace the cached sentinel. */
export function __setSentinelForTesting(sentinel: Sentinel | null): void {
  cached = sentinel;
}

/** Mode currently in effect. v0.1: always 'off'. */
export function getSentinelMode(): SentinelMode {
  return cached?.mode ?? "off";
}
