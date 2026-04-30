import type { RookContextSnapshot } from "./contextSnapshot";
import type { IntentClassification } from "./types";

function lines(items: string[]): string {
  return items.length ? items.map((item) => `- ${item}`).join("\n") : "- None";
}

export function buildSafeDraftPrompt(
  userRequest: string,
  classification: IntentClassification,
  context: RookContextSnapshot,
): string {
  return `Create a safe draft, not an execution-ready plan.

Original request:
${userRequest}

Separate:
- confirmed facts
- assumptions
- blocking gaps
- safe next steps
- risks
- review points

Do not pretend unresolved items are solved.

Current context:
- project: ${context.projectName ?? "none"}
- working directories: ${context.workingDirs.length ? context.workingDirs.join(", ") : "none"}
- attachments: ${context.attachmentKinds.length ? context.attachmentKinds.join(", ") : "none"}
- readiness: ${classification.readiness}
- risk: ${classification.risk}`;
}

export function buildDryRunPrompt(
  userRequest: string,
  classification: IntentClassification,
  context: RookContextSnapshot,
): string {
  return `Perform a dry run only. Do not modify files, delete files, run destructive commands, or write to external systems.

Original request:
${userRequest}

Return:
- intended target
- candidate actions
- affected files or systems
- risks
- exact review needed before execution
- recovery path

Context:
- project: ${context.projectName ?? "none"}
- working directories: ${context.workingDirs.length ? context.workingDirs.join(", ") : "none"}
- reasons: ${lines(classification.reasons)}`;
}

export function buildOverridePrompt(
  userRequest: string,
  classification: IntentClassification,
  context: RookContextSnapshot,
): string {
  return `The user chose to proceed despite warnings. Continue in experimental mode.

Original request:
${userRequest}

Preserve:
- assumptions
- risk notes
- affected areas
- verification gaps
- recovery path

Avoid:
- destructive operations
- external writes
- silent assumptions
- overstated certainty

Context:
- project: ${context.projectName ?? "none"}
- working directories: ${context.workingDirs.length ? context.workingDirs.join(", ") : "none"}
- risk: ${classification.risk}`;
}

export const ambiguousIntentClassifierPrompt = `You classify the user's request for Rook.

Classify into:
conversation, analysis, planning, execution.

Assess:
risk: low, medium, high, critical
context needed
whether execution should be direct, safe draft, dry run, experimental branch, review required, or hard stop.

Return JSON only.
Do not answer the user.
Do not generate a plan.
Do not perform the task.`;
