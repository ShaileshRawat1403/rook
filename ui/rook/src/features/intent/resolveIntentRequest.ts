import type { RookContextSnapshot } from "./contextSnapshot";
import { assessRisk } from "./assessRisk";
import {
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

export type IntentRequestResolution =
  | { kind: "send"; promptOverride?: string; notice?: string }
  | { kind: "guidance"; message: string; notificationType: "info" | "warning" };

function readinessForPosture(posture: ExecutionPosture): ReadinessState {
  if (posture === "direct") return "ready";
  if (posture === "ask_minimum_clarification") {
    return "needs_clarification";
  }
  if (posture === "safe_draft") return "safe_draft_only";
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

export function resolveIntentRequest(
  text: string,
  context: RookContextSnapshot,
): {
  intent: IntentClassification;
  resolution: IntentRequestResolution;
} {
  const classified = classifyRequest(text, context);
  const risk = assessRisk(text, context, classified);
  const requestedFastLane = /\b(fast lane|just do it|just build)\b/i.test(text);
  const chosenPosture = chooseExecutionPosture(text, classified, risk, context);
  const executionPosture =
    requestedFastLane &&
    chosenPosture !== "hard_stop" &&
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

  if (executionPosture === "direct") {
    return { intent, resolution: { kind: "send" } };
  }

  if (executionPosture === "safe_draft") {
    return {
      intent,
      resolution: {
        kind: "send",
        promptOverride: buildSafeDraftPrompt(text, intent, context),
        notice: buildSafeDraftNotice(intent, tonePosture),
      },
    };
  }

  if (executionPosture === "dry_run") {
    return {
      intent,
      resolution: {
        kind: "send",
        promptOverride: buildDryRunPrompt(text, intent, context),
        notice: buildSafeDraftNotice(intent, tonePosture),
      },
    };
  }

  if (executionPosture === "ask_minimum_clarification") {
    return {
      intent,
      resolution: {
        kind: "guidance",
        notificationType: "info",
        message: buildClarificationMessage(intent, context, tonePosture),
      },
    };
  }

  if (executionPosture === "experimental_branch") {
    return {
      intent,
      resolution: {
        kind: "guidance",
        notificationType: "warning",
        message: buildExperimentalBranchRecommendation(
          intent,
          context,
          tonePosture,
        ),
      },
    };
  }

  if (executionPosture === "review_required") {
    return {
      intent,
      resolution: {
        kind: "guidance",
        notificationType: "warning",
        message: buildReviewRequiredMessage(intent, context, tonePosture),
      },
    };
  }

  if (executionPosture === "override_with_warnings") {
    return {
      intent,
      resolution: {
        kind: "send",
        promptOverride: buildSafeDraftPrompt(text, intent, context),
        notice: buildSafeDraftNotice(intent, tonePosture),
      },
    };
  }

  return {
    intent,
    resolution: {
      kind: "guidance",
      notificationType: "warning",
      message: buildHardStopMessage(intent, context, tonePosture),
    },
  };
}
