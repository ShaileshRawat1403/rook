import type { RookContextSnapshot } from "./contextSnapshot";
import { intentSignalSets, signalMatchesAny } from "./classifyRequest";
import type {
  ExecutionPosture,
  IntentClassification,
  RequestRisk,
} from "./types";

export function chooseExecutionPosture(
  request: string,
  classification: IntentClassification,
  risk: RequestRisk,
  context: RookContextSnapshot,
): ExecutionPosture {
  const text = request.toLowerCase().replace(/\s+/g, " ").trim();

  if (signalMatchesAny(text, intentSignalSets.externalWrite)) {
    return context.hasJiraIssue ? "review_required" : "hard_stop";
  }

  if (signalMatchesAny(text, intentSignalSets.destructive)) {
    return context.hasWorkingDirectory ? "dry_run" : "hard_stop";
  }

  if (classification.mode === "execution") {
    if (!context.hasWorkingDirectory) return "hard_stop";
    if (risk === "critical") return "review_required";
    return "experimental_branch";
  }

  if (classification.mode === "planning") {
    return context.hasPrdReview ? "direct" : "safe_draft";
  }

  if (
    classification.mode === "analysis" &&
    !context.hasWorkingDirectory &&
    !context.hasAttachments
  ) {
    return "ask_minimum_clarification";
  }

  return "direct";
}
