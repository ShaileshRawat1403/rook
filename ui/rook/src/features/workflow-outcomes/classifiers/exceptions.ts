import { getColonyOutputReadiness } from "@/features/colony/outputReadiness";
import type { ColonySession } from "@/features/colony/types";
import type { RookEvent, JsonValue } from "@/features/events";
import type { WorkflowException } from "../types";

function asRecord(value: JsonValue): Record<string, JsonValue> | null {
  if (!value || Array.isArray(value) || typeof value !== "object") {
    return null;
  }

  return value;
}

function stringField(
  data: Record<string, JsonValue> | null,
  field: string,
): string | null {
  const value = data?.[field];
  return typeof value === "string" ? value : null;
}

function booleanField(
  data: Record<string, JsonValue> | null,
  field: string,
): boolean {
  return data?.[field] === true;
}

function governanceExceptions(events: RookEvent[]): WorkflowException[] {
  return events.flatMap((event) => {
    if (event.type !== "governance.evaluated") return [];

    const data = asRecord(event.data);
    const decision = stringField(data, "decision");
    const approvalResolution = stringField(data, "approvalResolution");
    const denied =
      decision === "deny" ||
      // v0.2: reserved for the future human approval-resolution flow.
      (decision === "needs_approval" && approvalResolution === "denied");

    if (!denied) return [];

    return [
      {
        id: `policy:${event.eventId}`,
        class: "policy_exception",
        severity: "high",
        source: "dax",
        message: stringField(data, "reason") ?? "DAX denied the action.",
        raisedAt: event.timestamp,
        recoverable: true,
      },
    ];
  });
}

function toolExceptions(events: RookEvent[]): WorkflowException[] {
  return events.flatMap((event) => {
    if (event.type !== "tool.executed") return [];

    const data = asRecord(event.data);
    const failed =
      stringField(data, "status") === "failed" || booleanField(data, "isError");

    if (!failed) return [];

    return [
      {
        id: `tool:${event.eventId}`,
        class: "tool_exception",
        severity: "medium",
        source: "tool",
        message:
          stringField(data, "message") ??
          stringField(data, "toolName") ??
          "Tool execution failed.",
        raisedAt: event.timestamp,
        recoverable: true,
      },
    ];
  });
}

function reviewException(colony: ColonySession): WorkflowException[] {
  if (colony.outputReview?.status !== "changes_requested") {
    return [];
  }

  return [
    {
      id: `review:${colony.id}:${colony.outputReview.reviewedAt}`,
      class: "review_exception",
      severity: "medium",
      source: "human",
      message: colony.outputReview.note ?? "Reviewer requested changes.",
      raisedAt: colony.outputReview.reviewedAt,
      recoverable: true,
    },
  ];
}

function evidenceException(colony: ColonySession): WorkflowException[] {
  if (!colony.outputContract?.evidenceRequired) {
    return [];
  }

  const readiness = getColonyOutputReadiness(colony);
  if (readiness.evidenceSatisfied) {
    return [];
  }

  return [
    {
      id: `evidence:${colony.id}:${colony.closedAt ?? colony.updatedAt}`,
      class: "evidence_exception",
      severity: "medium",
      source: "rook",
      message: "Required evidence is missing.",
      raisedAt: colony.closedAt ?? colony.updatedAt,
      recoverable: true,
    },
  ];
}

export function classifyWorkflowExceptions(
  colony: ColonySession,
  events: RookEvent[],
): WorkflowException[] {
  return [
    ...governanceExceptions(events),
    ...toolExceptions(events),
    ...reviewException(colony),
    ...evidenceException(colony),
  ];
}
