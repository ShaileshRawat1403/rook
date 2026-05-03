import type { RookContextSnapshot } from "./contextSnapshot";
import { intentSignalSets, signalMatchesAny } from "./classifyRequest";
import type { IntentClassification, RequestRisk } from "./types";

const RISK_SCORE: Record<RequestRisk, number> = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

const SCORE_RISK: Record<number, RequestRisk> = {
  1: "low",
  2: "medium",
  3: "high",
  4: "critical",
};

export function assessRisk(
  request: string,
  context: RookContextSnapshot,
  classification: IntentClassification,
): RequestRisk {
  const text = request.toLowerCase().replace(/\s+/g, " ").trim();
  let score = RISK_SCORE[classification.risk];

  if (signalMatchesAny(text, intentSignalSets.externalWrite)) {
    score = Math.max(score, RISK_SCORE.critical);
  }

  if (signalMatchesAny(text, intentSignalSets.destructive)) {
    score = Math.max(score, RISK_SCORE.critical);
  }

  if (classification.mode === "execution") {
    if (signalMatchesAny(text, intentSignalSets.broadRepoChange)) {
      score = Math.max(score, RISK_SCORE.high);
    } else {
      score = Math.max(score, RISK_SCORE.medium);
    }
  }

  if (classification.mode === "planning" && !context.hasPrdReview) {
    score = Math.max(score, RISK_SCORE.medium);
  }

  if (
    classification.mode === "execution" &&
    !context.hasWorkingDirectory &&
    !context.hasAttachments
  ) {
    score = Math.max(score, RISK_SCORE.medium);
  }

  if (context.hasChangedFiles && classification.mode === "execution") {
    score = Math.max(score, RISK_SCORE.high);
  }

  return SCORE_RISK[Math.min(score, RISK_SCORE.critical)];
}
