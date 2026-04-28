import type {
  PermissionOption,
  PermissionOptionKind,
  RequestPermissionRequest,
  RequestPermissionResponse,
} from "@agentclientprotocol/sdk";
import {
  GOVERNANCE_SCHEMA_VERSION,
  type GovernanceDecision,
  type ProposedAction,
} from "@/shared/types/governance";

/**
 * Convert an ACP permission request into the ProposedAction shape DAX
 * understands. Best-effort — fields not present on the ACP side are
 * simply omitted.
 */
export function toProposedAction(
  args: RequestPermissionRequest,
  sourceAgent: string = "unknown",
): ProposedAction {
  const tool = args.toolCall.kind ?? "other";
  const target = args.toolCall.locations?.[0]?.path ?? undefined;
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `act_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

  return {
    schemaVersion: GOVERNANCE_SCHEMA_VERSION,
    id,
    runId: args.sessionId,
    source: "rook",
    sourceAgent,
    tool,
    target,
  };
}

const ALLOW_KINDS: PermissionOptionKind[] = ["allow_once", "allow_always"];
const REJECT_KINDS: PermissionOptionKind[] = ["reject_once", "reject_always"];

function pickByKind(
  options: PermissionOption[],
  preferred: PermissionOptionKind[],
): PermissionOption | undefined {
  for (const kind of preferred) {
    const match = options.find((o) => o.kind === kind);
    if (match) return match;
  }
  return undefined;
}

/**
 * Map a GovernanceDecision back to an ACP permission response.
 *
 *  allow           → first allow_once / allow_always option
 *  deny            → first reject_once / reject_always option (or 'cancelled')
 *  needs_approval  → fall back to existing auto-pick behavior (first option)
 *  modify          → treated as needs_approval; we do not auto-apply modifications
 *  persist_rule    → treated as needs_approval; rules are not persisted yet
 *
 *  When a decision can't find a matching option, fall back to the legacy
 *  auto-approve behavior so we never leave the agent hanging.
 */
export function decisionToResponse(
  decision: GovernanceDecision,
  args: RequestPermissionRequest,
): RequestPermissionResponse {
  if (decision.decision === "deny") {
    const reject = pickByKind(args.options, REJECT_KINDS);
    if (reject) {
      return { outcome: { outcome: "selected", optionId: reject.optionId } };
    }
    return { outcome: { outcome: "cancelled" } };
  }

  if (decision.decision === "allow") {
    const allow = pickByKind(args.options, ALLOW_KINDS);
    if (allow) {
      return { outcome: { outcome: "selected", optionId: allow.optionId } };
    }
  }

  // needs_approval / modify / persist_rule / unmatched allow:
  // preserve existing auto-pick behavior. UI-driven approval lands in a later phase.
  const optionId = args.options?.[0]?.optionId ?? "approve";
  return { outcome: { outcome: "selected", optionId } };
}
