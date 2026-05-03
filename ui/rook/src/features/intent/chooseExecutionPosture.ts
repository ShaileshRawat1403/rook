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
    return "review_required";
  }

  if (signalMatchesAny(text, intentSignalSets.destructive)) {
    return context.hasWorkingDirectory ? "dry_run" : "hard_stop";
  }

  if (classification.mode === "execution") {
    if (!context.hasWorkingDirectory) return "ask_minimum_clarification";
    if (risk === "critical") return "review_required";
    if (risk === "high") return "experimental_branch";
    return "approval_once";
  }

  if (classification.mode === "planning") {
    return context.hasPrdReview ? "direct" : "safe_draft";
  }

  if (classification.executionPosture === "direct") {
    return "direct";
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
