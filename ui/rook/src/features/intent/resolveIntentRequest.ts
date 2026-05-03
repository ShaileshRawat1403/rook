import type { RookContextSnapshot } from "./contextSnapshot";
import { assessRisk } from "./assessRisk";
import {
  buildApprovalOnceMessage,
  buildClarificationMessage,
  buildExperimentalBranchRecommendation,
  buildHardStopMessage,
  buildReviewRequiredMessage,
  buildSafeDraftNotice,
} from "./buildResponse";
import { chooseExecutionPosture } from "./chooseExecutionPosture";
import { chooseTonePosture } from "./chooseTonePosture";
import { classifyRequest } from "./classifyRequest";
import { buildDryRunPrompt, buildSafeDraftPrompt } from "./promptContracts";
import type {
  ExecutionPosture,
  IntentClassification,
  ReadinessState,
  ResponseMode,
} from "./types";

export type IntentResolutionAction = {
  id: "allow_once" | "deny" | "dry_run" | "select_workdir";
  label: string;
  style: "primary" | "secondary" | "danger";
};

export type IntentRequestResolution =
  | { kind: "send"; promptOverride?: string; notice?: string }
  | {
      kind: "guidance";
      message: string;
      notificationType: "info" | "warning";
      actions?: IntentResolutionAction[];
      promptOverride?: string;
    };

function readinessForPosture(posture: ExecutionPosture): ReadinessState {
  if (posture === "direct") return "ready";
  if (posture === "ask_minimum_clarification") {
    return "needs_clarification";
  }
  if (posture === "safe_draft") return "safe_draft_only";
  if (posture === "approval_once") return "ready";
  if (
    posture === "dry_run" ||
    posture === "experimental_branch" ||
    posture === "review_required"
  ) {
    return "execution_needs_review";
  }
  if (posture === "override_with_warnings") return "override_available";
  return "hard_stop";
}

function responseModeForPosture(
  posture: ExecutionPosture,
  classification: IntentClassification,
): ResponseMode {
  if (posture === "direct") {
    return classification.mode === "conversation"
      ? "answer_directly"
      : "analyze";
  }
  if (posture === "ask_minimum_clarification" || posture === "hard_stop") {
    return "ask_clarifying_question";
  }
  if (posture === "safe_draft") return "create_safe_draft";
  if (posture === "approval_once") return "request_approval";
  if (posture === "review_required") return "request_approval";
  if (posture === "override_with_warnings") return "execute";
  return "recommend_safe_lane";
}

function gapsForPosture(
  posture: ExecutionPosture,
  hasWorkingDirectory: boolean,
): string[] {
  if (posture === "hard_stop" && !hasWorkingDirectory) {
    return ["A working directory is required before file-changing execution."];
  }
  if (posture === "ask_minimum_clarification") {
    return ["Attach context or specify the target to inspect."];
  }
  if (posture === "safe_draft") {
    return ["Execution readiness has not been established yet."];
  }
  return [];
}

function safeActionsForPosture(posture: ExecutionPosture): string[] {
  if (posture === "safe_draft") {
    return ["Create an assumption-marked draft", "List blocking gaps"];
  }
  if (posture === "dry_run") {
    return ["Preview affected files", "List candidate actions"];
  }
  if (posture === "approval_once") {
    return ["Proceed after lightweight approval", "Keep changes reviewable"];
  }
  if (posture === "experimental_branch") {
    return ["Use an experimental branch", "Summarize affected files"];
  }
  if (posture === "review_required") {
    return ["Prepare the proposed update", "Show evidence before writing"];
  }
  if (posture === "hard_stop") {
    return ["Select a working directory", "Ask for a safe draft"];
  }
  return ["Proceed directly"];
}

/** Explicit override token. Casual phrases like "just build it" must NOT trigger
 * the fast lane — only this leading sentinel does. Stripped before classification
 * so the rest of the request is scored on its merits. */
const OVERRIDE_TOKEN_RE = /^\s*\/!override\b\s*/i;

function stripOverrideToken(text: string): {
  text: string;
  explicitFastLane: boolean;
} {
  const match = text.match(OVERRIDE_TOKEN_RE);
  if (!match) return { text, explicitFastLane: false };
  return { text: text.slice(match[0].length), explicitFastLane: true };
}

export interface IntentResolvedEvent {
  text: string;
  context: RookContextSnapshot;
  intent: IntentClassification;
  resolution: IntentRequestResolution;
}

type IntentResolvedListener = (event: IntentResolvedEvent) => void;
let intentResolvedListener: IntentResolvedListener | null = null;

/** Optional telemetry/observability hook. Pass `null` to clear. The listener
 * is fired exactly once per resolveIntentRequest call, after the resolution
 * is computed. Listener errors are swallowed so observation cannot break
 * routing. */
export function onIntentResolved(fn: IntentResolvedListener | null): void {
  intentResolvedListener = fn;
}

function emitResolved(event: IntentResolvedEvent): void {
  const listener = intentResolvedListener;
  if (!listener) return;
  try {
    listener(event);
  } catch {
    // ignore listener faults
  }
}

export function resolveIntentRequest(
  rawText: string,
  context: RookContextSnapshot,
): {
  intent: IntentClassification;
  resolution: IntentRequestResolution;
} {
  const { text, explicitFastLane } = stripOverrideToken(rawText);
  const classified = classifyRequest(text, context);
  const risk = assessRisk(text, context, classified);
  const requestedFastLane = explicitFastLane;
  const chosenPosture = chooseExecutionPosture(text, classified, risk, context);
  const executionPosture =
    requestedFastLane &&
    chosenPosture !== "hard_stop" &&
    chosenPosture !== "ask_minimum_clarification" &&
    chosenPosture !== "review_required"
      ? "override_with_warnings"
      : chosenPosture;
  const tonePosture = chooseTonePosture(text, executionPosture, context);
  const intent: IntentClassification = {
    ...classified,
    risk,
    readiness: readinessForPosture(executionPosture),
    executionPosture,
    tonePosture,
    responseMode: responseModeForPosture(executionPosture, classified),
    blockingGaps: gapsForPosture(executionPosture, context.hasWorkingDirectory),
    safeActions: safeActionsForPosture(executionPosture),
    blockedActions:
      executionPosture === "hard_stop"
        ? ["File-changing execution"]
        : executionPosture === "review_required"
          ? ["Shared-system write without review"]
          : [],
    assumptions:
      executionPosture === "safe_draft"
        ? ["The output is exploratory until readiness is reviewed."]
        : [],
  };

  const finalize = (
    resolution: IntentRequestResolution,
  ): { intent: IntentClassification; resolution: IntentRequestResolution } => {
    const result = { intent, resolution };
    emitResolved({ text, context, intent, resolution });
    return result;
  };

  if (executionPosture === "direct") {
    return finalize({ kind: "send" });
  }

  if (executionPosture === "safe_draft") {
    return finalize({
      kind: "send",
      promptOverride: buildSafeDraftPrompt(text, intent, context),
      notice: buildSafeDraftNotice(intent, tonePosture),
    });
  }

  if (executionPosture === "dry_run") {
    return finalize({
      kind: "guidance",
      notificationType: "warning",
      message: `This may remove or overwrite work.

Dry run first?

Reason:
${intent.reasons.join(" ")}`,
      promptOverride: buildDryRunPrompt(text, intent, context),
      actions: [
        { id: "dry_run", label: "Preview only", style: "primary" },
        { id: "deny", label: "Do not allow", style: "secondary" },
      ],
    });
  }

  if (executionPosture === "approval_once") {
    return finalize({
      kind: "guidance",
      notificationType: "info",
      message: buildApprovalOnceMessage(intent),
      actions: [
        { id: "allow_once", label: "Allow once", style: "primary" },
        { id: "deny", label: "Do not allow", style: "secondary" },
      ],
    });
  }

  if (executionPosture === "ask_minimum_clarification") {
    return finalize({
      kind: "guidance",
      notificationType: "info",
      message: buildClarificationMessage(intent, context, tonePosture),
    });
  }

  if (executionPosture === "experimental_branch") {
    return finalize({
      kind: "guidance",
      notificationType: "warning",
      message: buildExperimentalBranchRecommendation(
        intent,
        context,
        tonePosture,
      ),
    });
  }

  if (executionPosture === "review_required") {
    return finalize({
      kind: "guidance",
      notificationType: "warning",
      message: buildReviewRequiredMessage(intent, context, tonePosture),
    });
  }

  if (executionPosture === "override_with_warnings") {
    return finalize({
      kind: "send",
      promptOverride: buildSafeDraftPrompt(text, intent, context),
      notice: buildSafeDraftNotice(intent, tonePosture),
    });
  }

  return finalize({
    kind: "guidance",
    notificationType: "warning",
    message: buildHardStopMessage(intent, context, tonePosture),
  });
}
