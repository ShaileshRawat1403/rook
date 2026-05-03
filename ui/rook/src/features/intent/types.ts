export type RequestMode =
  | "conversation"
  | "analysis"
  | "planning"
  | "execution";

export type RequestRisk = "low" | "medium" | "high" | "critical";

export type ReadinessState =
  | "ready"
  | "needs_context"
  | "needs_clarification"
  | "safe_draft_only"
  | "execution_needs_review"
  | "override_available"
  | "hard_stop";

export type ExecutionPosture =
  | "direct"
  | "ask_minimum_clarification"
  | "safe_draft"
  | "approval_once"
  | "dry_run"
  | "sandbox"
  | "experimental_branch"
  | "review_required"
  | "override_with_warnings"
  | "hard_stop";

export type TonePosture =
  | "neutral"
  | "light_wit"
  | "calm_reset"
  | "recovery"
  | "firm_boundary"
  | "compressed_fast_lane";

export type ResponseMode =
  | "answer_directly"
  | "analyze"
  | "ask_clarifying_question"
  | "run_readiness_review"
  | "create_safe_draft"
  | "recommend_safe_lane"
  | "request_approval"
  | "execute"
  | "recover";

export interface IntentClassification {
  mode: RequestMode;
  risk: RequestRisk;
  readiness: ReadinessState;
  executionPosture: ExecutionPosture;
  tonePosture: TonePosture;
  responseMode: ResponseMode;
  confidence: "low" | "medium" | "high";
  reasons: string[];
  blockingGaps: string[];
  safeActions: string[];
  blockedActions: string[];
  assumptions: string[];
}
