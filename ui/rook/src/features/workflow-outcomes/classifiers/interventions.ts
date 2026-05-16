import type { ColonySession } from "@/features/colony/types";
import type { RookEvent, JsonValue } from "@/features/events";
import type {
  WorkflowIntervention,
  WorkflowInterventionReason,
} from "../types";

const interventionReasons = new Set<WorkflowInterventionReason>([
  "clarify_intent",
  "adjust_scope",
  "approve_risk",
  "request_more_evidence",
  "request_output_changes",
  "approve_final_output",
]);

function asRecord(value: JsonValue): Record<string, JsonValue> | null {
  if (!value || Array.isArray(value) || typeof value !== "object") {
    return null;
  }

  return value;
}

function reasonFromEvent(event: RookEvent): WorkflowInterventionReason | null {
  const data = asRecord(event.data);
  const reason = data?.reason;
  if (typeof reason !== "string") return null;

  return interventionReasons.has(reason as WorkflowInterventionReason)
    ? (reason as WorkflowInterventionReason)
    : null;
}

function actorFromEvent(event: RookEvent): WorkflowIntervention["actor"] {
  const data = asRecord(event.data);
  const actor = data?.actor;

  if (
    actor === "human_operator" ||
    actor === "reviewer" ||
    actor === "sentinel"
  ) {
    return actor;
  }

  return "human_operator";
}

function noteFromEvent(event: RookEvent): string | undefined {
  const data = asRecord(event.data);
  return typeof data?.note === "string" ? data.note : undefined;
}

export function classifyWorkflowInterventions(
  events: RookEvent[],
  colony: ColonySession,
): WorkflowIntervention[] {
  const interventions = events.flatMap((event) => {
    if (event.type !== "operator.intervened") return [];

    const reason = reasonFromEvent(event);
    if (!reason) return [];

    return [
      {
        id: `intervention:${event.eventId}`,
        reason,
        actor: actorFromEvent(event),
        resolvedAt: event.timestamp,
        note: noteFromEvent(event),
      },
    ];
  });

  const outputReview = colony.outputReview;
  const reviewReason =
    outputReview?.status === "approved"
      ? "approve_final_output"
      : outputReview?.status === "changes_requested"
        ? "request_output_changes"
        : null;

  if (
    !reviewReason ||
    !outputReview ||
    interventions.some(
      (intervention) =>
        intervention.reason === reviewReason &&
        intervention.resolvedAt === outputReview.reviewedAt,
    )
  ) {
    return interventions;
  }

  return [
    ...interventions,
    {
      id: `intervention:review:${colony.id}:${outputReview.reviewedAt}`,
      reason: reviewReason,
      actor: "reviewer",
      resolvedAt: outputReview.reviewedAt,
      note: outputReview.note,
    },
  ];
}
