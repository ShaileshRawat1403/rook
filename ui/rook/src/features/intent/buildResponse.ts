import type { RookContextSnapshot } from "./contextSnapshot";
import { SAFE_LANES } from "./safeLanes";
import type { IntentClassification, TonePosture } from "./types";

function introForTone(tone: TonePosture): string {
  if (tone === "calm_reset") {
    return "You are right. I over-expanded the frame.";
  }
  if (tone === "recovery") {
    return "That failed. Recovery first.";
  }
  if (tone === "compressed_fast_lane") {
    return "Fast lane. I will proceed only where the risk is contained.";
  }
  if (tone === "firm_boundary") {
    return "Speed is fine. Blind impact is not.";
  }
  if (tone === "light_wit") {
    return "Fair. The caution dial was a bit high.";
  }
  return "I can help with this.";
}

function bulletList(items: string[]): string {
  return items.length ? items.map((item) => `- ${item}`).join("\n") : "- None";
}

export function buildClarificationMessage(
  classification: IntentClassification,
  _context: RookContextSnapshot,
  tone: TonePosture,
): string {
  return `${introForTone(tone)}

I need one missing piece before this becomes useful:
${bulletList(classification.blockingGaps)}

Safe next step:
${bulletList(classification.safeActions)}`;
}

export function buildExperimentalBranchRecommendation(
  classification: IntentClassification,
  context: RookContextSnapshot,
  tone: TonePosture,
): string {
  const lane = SAFE_LANES.experimental_branch;
  return `${introForTone(tone)}

Risk:
${classification.reasons.join(" ")}

Recommended safer lane:
${lane.label}. ${lane.description}

I will preserve:
- assumptions
- affected files
- review notes
- recovery path

Context:
- branch: ${context.currentBranch ?? "unknown"}
- changed files present: ${context.hasChangedFiles ? "yes" : "no"}

Proceeding options:
1. Ask me to create or use an experimental branch.
2. Say "fast lane" to continue with warnings and containment.`;
}

export function buildApprovalOnceMessage(
  classification: IntentClassification,
): string {
  const reason = classification.reasons.join(" ");
  const isCommand = reason.toLowerCase().includes("local project command");

  if (isCommand) {
    return `This will run a local command and may read project files or produce output.

Reason:
${reason}`;
  }

  return `This may change workspace files.

I will show the diff before anything is committed.

Reason:
${reason}`;
}

export function buildReviewRequiredMessage(
  classification: IntentClassification,
  _context: RookContextSnapshot,
  tone: TonePosture,
): string {
  return `${introForTone(tone)}

This affects a shared or high-impact system of record.

I can prepare the update, but writing it requires review.

I will first show:
- target item
- proposed change
- reason
- evidence
- rollback or follow-up path

Risk:
${classification.reasons.join(" ")}`;
}

export function buildHardStopMessage(
  classification: IntentClassification,
  context: RookContextSnapshot,
  tone: TonePosture,
): string {
  return `${introForTone(tone)}

I cannot execute this safely from the current context.

Blocking gap:
${bulletList(classification.blockingGaps)}

Safe recovery:
- attach or select the working directory
- provide the exact target
- ask for a safe draft or dry run first

Current context:
- project: ${context.projectName ?? "none"}
- working directory: ${context.hasWorkingDirectory ? "available" : "missing"}`;
}

export function buildSafeDraftNotice(
  classification: IntentClassification,
  tone: TonePosture,
): string {
  return `${introForTone(tone)}

I will treat this as a safe draft, not execution-ready work.

That means:
- assumptions stay visible
- blocking gaps stay explicit
- implementation claims need review before action

Why:
${classification.reasons.join(" ")}`;
}
