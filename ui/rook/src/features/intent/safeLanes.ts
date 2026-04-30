import type { ExecutionPosture } from "./types";

export interface SafeLane {
  posture: ExecutionPosture;
  label: string;
  description: string;
  allowedActions: string[];
  needsReviewBefore: string[];
}

export const SAFE_LANES: Record<ExecutionPosture, SafeLane> = {
  direct: {
    posture: "direct",
    label: "Direct",
    description: "Low-risk work can proceed normally.",
    allowedActions: ["answer", "summarize", "analyze provided context"],
    needsReviewBefore: [],
  },
  ask_minimum_clarification: {
    posture: "ask_minimum_clarification",
    label: "Clarify",
    description: "One missing detail blocks a useful answer.",
    allowedActions: ["ask the smallest clarifying question"],
    needsReviewBefore: ["planning", "execution"],
  },
  safe_draft: {
    posture: "safe_draft",
    label: "Safe draft",
    description: "Produce a draft with assumptions and gaps visible.",
    allowedActions: [
      "draft plan",
      "identify assumptions",
      "list review points",
    ],
    needsReviewBefore: ["implementation", "external writes"],
  },
  dry_run: {
    posture: "dry_run",
    label: "Dry run",
    description: "Preview impact before changing or deleting anything.",
    allowedActions: ["list candidates", "preview commands", "estimate impact"],
    needsReviewBefore: ["destructive changes", "bulk file actions"],
  },
  sandbox: {
    posture: "sandbox",
    label: "Sandbox",
    description: "Explore uncertain work in a contained prototype.",
    allowedActions: ["prototype", "compare options", "verify assumptions"],
    needsReviewBefore: ["shipping", "shared-system updates"],
  },
  experimental_branch: {
    posture: "experimental_branch",
    label: "Experimental branch",
    description: "Keep repo changes isolated and easy to review.",
    allowedActions: ["propose affected files", "make contained changes"],
    needsReviewBefore: ["merge", "push", "release"],
  },
  review_required: {
    posture: "review_required",
    label: "Review required",
    description: "Shared systems or high-impact actions need explicit review.",
    allowedActions: ["prepare proposed update", "show evidence"],
    needsReviewBefore: ["write-back", "status changes", "push/merge"],
  },
  override_with_warnings: {
    posture: "override_with_warnings",
    label: "Fast lane",
    description: "Proceed with visible warnings and tight containment.",
    allowedActions: ["smallest useful change", "summarize touched files"],
    needsReviewBefore: ["destructive operations", "external writes"],
  },
  hard_stop: {
    posture: "hard_stop",
    label: "Blocked",
    description: "The target or permission boundary is not safe enough to act.",
    allowedActions: ["explain blocker", "offer recovery path"],
    needsReviewBefore: ["execution"],
  },
};
