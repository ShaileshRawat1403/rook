import type { RookContextSnapshot } from "./contextSnapshot";
import type {
  ExecutionPosture,
  IntentClassification,
  ReadinessState,
  RequestMode,
  RequestRisk,
  ResponseMode,
} from "./types";

const CONVERSATION_SIGNALS = [
  "what is",
  "what are",
  "explain",
  "define",
  "compare",
  "why",
  "how does",
  "what does",
  "meaning of",
];

const ANALYSIS_SIGNALS = [
  "review",
  "analyze",
  "analyse",
  "inspect",
  "check",
  "debug",
  "find",
  "look at",
  "read this",
  "explain this repo",
  "explain this file",
];

const PLANNING_SIGNALS = [
  "plan",
  "roadmap",
  "implementation plan",
  "break this down",
  "create tasks",
  "architecture",
  "sprint plan",
  "design",
];

const EXECUTION_SIGNALS = [
  "implement",
  "modify",
  "apply",
  "run",
  "create file",
  "update file",
  "change file",
  "move to done",
  "commit",
  "push",
  "merge",
  "install",
  "execute",
  "force",
  "cleanup",
  "fix",
  "build",
];

const EXTERNAL_WRITE_SIGNALS = [
  "create jira",
  "update jira",
  "move jira",
  "send slack",
  "post comment",
  "create ticket",
  "change status",
  "move ticket",
];

const DESTRUCTIVE_SIGNALS = [
  "delete",
  "remove files",
  "wipe",
  "reset",
  "force push",
  "overwrite",
  "drop",
  "purge",
  "rm -rf",
];

function includesAny(text: string, signals: string[]): boolean {
  return signals.some((signal) => text.includes(signal));
}

function baseClassification(
  mode: RequestMode,
  risk: RequestRisk,
  readiness: ReadinessState,
  executionPosture: ExecutionPosture,
  responseMode: ResponseMode,
  reasons: string[],
): IntentClassification {
  return {
    mode,
    risk,
    readiness,
    executionPosture,
    tonePosture: "neutral",
    responseMode,
    confidence: "medium",
    reasons,
    blockingGaps: [],
    safeActions: [],
    blockedActions: [],
    assumptions: [],
  };
}

export function classifyRequest(
  request: string,
  context: RookContextSnapshot,
): IntentClassification {
  const text = request.toLowerCase().replace(/\s+/g, " ").trim();

  if (!text && !context.hasAttachments) {
    return baseClassification(
      "conversation",
      "low",
      "needs_clarification",
      "ask_minimum_clarification",
      "ask_clarifying_question",
      ["No request text or attachment context was provided."],
    );
  }

  if (includesAny(text, EXTERNAL_WRITE_SIGNALS)) {
    return baseClassification(
      "execution",
      "critical",
      "execution_needs_review",
      "review_required",
      "request_approval",
      ["The request writes to an external or shared system."],
    );
  }

  if (includesAny(text, DESTRUCTIVE_SIGNALS)) {
    return baseClassification(
      "execution",
      "critical",
      "execution_needs_review",
      "dry_run",
      "recommend_safe_lane",
      ["The request includes destructive or hard-to-reverse wording."],
    );
  }

  if (includesAny(text, PLANNING_SIGNALS)) {
    return baseClassification(
      "planning",
      "medium",
      context.hasPrdReview ? "ready" : "safe_draft_only",
      context.hasPrdReview ? "direct" : "safe_draft",
      context.hasPrdReview ? "analyze" : "create_safe_draft",
      ["The request asks for a plan or decomposition."],
    );
  }

  if (includesAny(text, EXECUTION_SIGNALS)) {
    return baseClassification(
      "execution",
      "high",
      context.hasWorkingDirectory ? "execution_needs_review" : "needs_context",
      context.hasWorkingDirectory ? "experimental_branch" : "hard_stop",
      context.hasWorkingDirectory
        ? "recommend_safe_lane"
        : "ask_clarifying_question",
      ["The request asks Rook to change state or perform work."],
    );
  }

  if (includesAny(text, ANALYSIS_SIGNALS)) {
    return baseClassification(
      "analysis",
      context.hasWorkingDirectory || context.hasAttachments ? "medium" : "low",
      context.hasWorkingDirectory || context.hasAttachments
        ? "ready"
        : "needs_context",
      context.hasWorkingDirectory || context.hasAttachments
        ? "direct"
        : "ask_minimum_clarification",
      context.hasWorkingDirectory || context.hasAttachments
        ? "analyze"
        : "ask_clarifying_question",
      ["The request asks for inspection or analysis."],
    );
  }

  if (includesAny(text, CONVERSATION_SIGNALS)) {
    return {
      ...baseClassification(
        "conversation",
        "low",
        "ready",
        "direct",
        "answer_directly",
        ["The request is a low-risk conceptual question."],
      ),
      confidence: "high",
    };
  }

  return {
    ...baseClassification(
      "conversation",
      "low",
      "ready",
      "direct",
      "answer_directly",
      ["No execution or shared-system write signal was detected."],
    ),
    confidence: "low",
  };
}

export const intentSignalSets = {
  conversation: CONVERSATION_SIGNALS,
  analysis: ANALYSIS_SIGNALS,
  planning: PLANNING_SIGNALS,
  execution: EXECUTION_SIGNALS,
  externalWrite: EXTERNAL_WRITE_SIGNALS,
  destructive: DESTRUCTIVE_SIGNALS,
};
