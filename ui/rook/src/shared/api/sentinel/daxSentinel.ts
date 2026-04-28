import {
  GOVERNANCE_SCHEMA_VERSION,
  type GovernanceDecision,
  type ProposedAction,
} from "@/shared/types/governance";
import { invokeTauri, isTauriRuntimeAvailable } from "@/shared/api/tauri";
import type { Sentinel } from "./types";

/**
 * Sentinel implementation that delegates to `dax governance evaluate` via a
 * Tauri command. Browser-only contexts (no Tauri runtime) cannot reach the
 * subprocess, so the caller is expected to fall back to a noop sentinel
 * before constructing this one.
 */
export const daxSentinel: Sentinel = {
  mode: "dax",
  judge: async (action: ProposedAction): Promise<GovernanceDecision> => {
    if (!isTauriRuntimeAvailable()) {
      return failOpen(action, "Tauri runtime unavailable in browser context");
    }

    let raw: string;
    try {
      raw = await invokeTauri<string>("sentinel_evaluate", {
        actionJson: JSON.stringify(action),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return failOpen(action, `dax governance evaluate failed: ${message}`);
    }

    try {
      const parsed = JSON.parse(raw) as GovernanceDecision;
      if (parsed.schemaVersion !== GOVERNANCE_SCHEMA_VERSION) {
        return failOpen(
          action,
          `unexpected schemaVersion '${parsed.schemaVersion}' (expected '${GOVERNANCE_SCHEMA_VERSION}')`,
        );
      }
      return parsed;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return failOpen(action, `failed to parse decision JSON: ${message}`);
    }
  },
};

function failOpen(
  action: ProposedAction,
  reason: string,
): GovernanceDecision {
  console.warn("[sentinel] fail-open:", reason);
  return {
    schemaVersion: GOVERNANCE_SCHEMA_VERSION,
    actionId: action.id,
    source: "dax",
    decision: "allow",
    risk: "low",
    reason: `Sentinel unavailable; fail-open. ${reason}`,
    reversible: true,
  };
}
