/**
 * Boundary types shared with DAX (and any other governance backend).
 * Versioned independently of internal Rook types.
 *
 * Mirrors dax/packages/dax/src/governance/rook-bridge-types.ts and the
 * schemas in docs/integrations/dax-agent-and-sentinel.md (Section 6).
 */

export const GOVERNANCE_SCHEMA_VERSION = "0.1.0" as const;

export type RiskLevel = "low" | "medium" | "high" | "critical";

export type GovernanceDecisionKind =
  | "allow"
  | "deny"
  | "modify"
  | "needs_approval"
  | "persist_rule";

export interface ProposedAction {
  schemaVersion: typeof GOVERNANCE_SCHEMA_VERSION;
  id: string;
  runId: string;
  source: "rook";
  sourceAgent: string;
  tool: string;
  target?: string;
  command?: string;
  reason?: string;
  diffPreview?: string;
  riskHint?: RiskLevel;
}

export interface GovernanceDecision {
  schemaVersion: typeof GOVERNANCE_SCHEMA_VERSION;
  actionId: string;
  source: "dax";
  decision: GovernanceDecisionKind;
  risk: RiskLevel;
  reason: string;
  requiredEvidence?: string[];
  modifiedAction?: ProposedAction;
  reversible: boolean;
}
