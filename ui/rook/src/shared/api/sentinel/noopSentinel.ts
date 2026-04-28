import {
  GOVERNANCE_SCHEMA_VERSION,
  type GovernanceDecision,
  type ProposedAction,
} from "@/shared/types/governance";
import type { Sentinel } from "./types";

/**
 * Passthrough sentinel — always allows. Lets callers compose a sentinel
 * pipeline uniformly without branching on whether one is configured.
 */
export const noopSentinel: Sentinel = {
  mode: "off",
  judge: async (action: ProposedAction): Promise<GovernanceDecision> => ({
    schemaVersion: GOVERNANCE_SCHEMA_VERSION,
    actionId: action.id,
    source: "dax",
    decision: "allow",
    risk: "low",
    reason: "Sentinel disabled.",
    reversible: true,
  }),
};
