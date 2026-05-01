import type { RookContextSnapshot } from "./contextSnapshot";
import type {
  ExecutionPosture,
  IntentClassification,
  ReadinessState,
  RequestMode,
  RequestRisk,
  ResponseMode,
} from "./types";

// ---------------------------------------------------------------------------
// Signal vocabularies. Kept as string arrays for backward compatibility with
// other consumers; matching is done with word-boundary regex below to avoid
// substring false positives (e.g. "specimen" matching "spec", "fix" inside
// "fixture", "force" inside "forced reset").
// ---------------------------------------------------------------------------

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

export const intentSignalSets = {
  conversation: CONVERSATION_SIGNALS,
  analysis: ANALYSIS_SIGNALS,
  planning: PLANNING_SIGNALS,
  execution: EXECUTION_SIGNALS,
  externalWrite: EXTERNAL_WRITE_SIGNALS,
  destructive: DESTRUCTIVE_SIGNALS,
};

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function compileSignals(signals: ReadonlyArray<string>): RegExp[] {
  return signals.map(
    (signal) => new RegExp(`\\b${escapeRegex(signal.toLowerCase())}\\b`),
  );
}

const COMPILED = {
  conversation: compileSignals(CONVERSATION_SIGNALS),
  analysis: compileSignals(ANALYSIS_SIGNALS),
  planning: compileSignals(PLANNING_SIGNALS),
  execution: compileSignals(EXECUTION_SIGNALS),
  externalWrite: compileSignals(EXTERNAL_WRITE_SIGNALS),
  destructive: compileSignals(DESTRUCTIVE_SIGNALS),
};

/**
 * Returns true when any of the provided signals matches the text on a word
 * boundary. Exported so other intent-module code (e.g. assessRisk) shares
 * the same matcher and avoids substring false positives.
 */
export function signalMatchesAny(
  text: string,
  signals: ReadonlyArray<string>,
): boolean {
  const lower = text.toLowerCase();
  for (const signal of signals) {
    const escaped = escapeRegex(signal.toLowerCase());
    if (new RegExp(`\\b${escaped}\\b`).test(lower)) return true;
  }
  return false;
}

function countMatches(text: string, regexes: ReadonlyArray<RegExp>): number {
  let count = 0;
  for (const re of regexes) {
    if (re.test(text)) count++;
  }
  return count;
}

// ---------------------------------------------------------------------------
// Per-bucket classifications. Behavior unchanged from the original
// substring-based implementation; what changed is *how* the bucket is
// selected (score-based + word-boundary instead of first-match substring).
// ---------------------------------------------------------------------------

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

function emptyRequestClassification(): IntentClassification {
  return baseClassification(
    "conversation",
    "low",
    "needs_clarification",
    "ask_minimum_clarification",
    "ask_clarifying_question",
    ["No request text or attachment context was provided."],
  );
}

function externalWriteClassification(): IntentClassification {
  return baseClassification(
    "execution",
    "critical",
    "execution_needs_review",
    "review_required",
    "request_approval",
    ["The request writes to an external or shared system."],
  );
}

function destructiveClassification(): IntentClassification {
  return baseClassification(
    "execution",
    "critical",
    "execution_needs_review",
    "dry_run",
    "recommend_safe_lane",
    ["The request includes destructive or hard-to-reverse wording."],
  );
}

function planningClassification(
  context: RookContextSnapshot,
): IntentClassification {
  return baseClassification(
    "planning",
    "medium",
    context.hasPrdReview ? "ready" : "safe_draft_only",
    context.hasPrdReview ? "direct" : "safe_draft",
    context.hasPrdReview ? "analyze" : "create_safe_draft",
    ["The request asks for a plan or decomposition."],
  );
}

function executionClassification(
  context: RookContextSnapshot,
): IntentClassification {
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

function analysisClassification(
  context: RookContextSnapshot,
): IntentClassification {
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

function conversationClassification(): IntentClassification {
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

function fallbackClassification(): IntentClassification {
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

function withConfidence(
  classification: IntentClassification,
  hits: number,
): IntentClassification {
  // Critical-severity buckets are unambiguous; keep them at high confidence.
  if (classification.risk === "critical") {
    return { ...classification, confidence: "high" };
  }
  if (hits >= 2) {
    return { ...classification, confidence: "high" };
  }
  return classification;
}

// ---------------------------------------------------------------------------
// Score-based classifier. Severity ordering (highest first):
//   destructive > externalWrite > execution > planning > analysis > conversation
// The first bucket with at least one hit wins. This preserves the original
// precedence intent but no longer hides destructive/externalWrite signals
// behind earlier matches like "plan to delete X".
// ---------------------------------------------------------------------------

export function classifyRequest(
  request: string,
  context: RookContextSnapshot,
): IntentClassification {
  const text = request.toLowerCase().replace(/\s+/g, " ").trim();

  if (!text && !context.hasAttachments) {
    return emptyRequestClassification();
  }

  const hits = {
    conversation: countMatches(text, COMPILED.conversation),
    analysis: countMatches(text, COMPILED.analysis),
    planning: countMatches(text, COMPILED.planning),
    execution: countMatches(text, COMPILED.execution),
    externalWrite: countMatches(text, COMPILED.externalWrite),
    destructive: countMatches(text, COMPILED.destructive),
  };

  if (hits.destructive > 0) {
    return withConfidence(destructiveClassification(), hits.destructive);
  }
  if (hits.externalWrite > 0) {
    return withConfidence(externalWriteClassification(), hits.externalWrite);
  }
  if (hits.execution > 0) {
    return withConfidence(executionClassification(context), hits.execution);
  }
  if (hits.planning > 0) {
    return withConfidence(planningClassification(context), hits.planning);
  }
  if (hits.analysis > 0) {
    return withConfidence(analysisClassification(context), hits.analysis);
  }
  if (hits.conversation > 0) {
    return withConfidence(conversationClassification(), hits.conversation);
  }

  return fallbackClassification();
}
