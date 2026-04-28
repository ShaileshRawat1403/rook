import type {
  GovernanceDecision,
  ProposedAction,
} from "@/shared/types/governance";

export type SentinelMode = "off" | "dax";

export interface Sentinel {
  readonly mode: SentinelMode;
  judge(action: ProposedAction): Promise<GovernanceDecision>;
}
