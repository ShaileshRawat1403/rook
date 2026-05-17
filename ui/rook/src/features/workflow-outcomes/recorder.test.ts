import { describe, expect, it } from "vitest";
import { deriveTrust } from "./recorder";
import type { WorkflowException, WorkflowRunTelemetry } from "./types";

function makeException(
  exceptionClass: WorkflowException["class"],
  severity: WorkflowException["severity"] = "medium",
): WorkflowException {
  return {
    id: `ex-${exceptionClass}-${severity}`,
    class: exceptionClass,
    severity,
    source: "rook",
    message: `${exceptionClass} test fixture`,
    raisedAt: "2026-05-16T09:30:00.000Z",
    recoverable: true,
  };
}

function quality(
  overrides: Partial<WorkflowRunTelemetry["quality"]> = {},
): WorkflowRunTelemetry["quality"] {
  return {
    outputContractSatisfied: false,
    evidenceSatisfied: false,
    reviewerApproved: false,
    ...overrides,
  };
}

describe("deriveTrust", () => {
  it("returns blocked when a high policy_exception is present", () => {
    const trust = deriveTrust(
      [makeException("policy_exception", "high")],
      quality({ reviewerApproved: true, evidenceSatisfied: true }),
    );

    expect(trust.posture).toBe("blocked");
    expect(trust.reasons.join(" ")).toContain("policy");
  });

  it("returns guarded when any non-critical exception is present", () => {
    const trust = deriveTrust(
      [makeException("evidence_exception"), makeException("review_exception")],
      quality(),
    );

    expect(trust.posture).toBe("guarded");
    expect(trust.reasons[0]).toContain("evidence_exception");
    expect(trust.reasons[0]).toContain("review_exception");
  });

  it("returns guarded when no exceptions but evidence is missing", () => {
    const trust = deriveTrust([], quality({ evidenceSatisfied: false }));

    expect(trust.posture).toBe("guarded");
    expect(trust.reasons[0]).toContain("evidence");
  });

  it("returns verified when reviewer approved and evidence satisfied with no exceptions", () => {
    const trust = deriveTrust(
      [],
      quality({ reviewerApproved: true, evidenceSatisfied: true }),
    );

    expect(trust.posture).toBe("verified");
  });

  it("returns open when no exceptions and no positive signals either", () => {
    const trust = deriveTrust(
      [],
      quality({
        reviewerApproved: false,
        evidenceSatisfied: true, // no missing evidence
      }),
    );

    expect(trust.posture).toBe("open");
    expect(trust.reasons).toEqual([]);
  });

  it("critical policy beats reviewer approval", () => {
    const trust = deriveTrust(
      [makeException("policy_exception", "critical")],
      quality({ reviewerApproved: true, evidenceSatisfied: true }),
    );

    expect(trust.posture).toBe("blocked");
  });

  it("non-critical policy exception does not block", () => {
    const trust = deriveTrust(
      [makeException("policy_exception", "low")],
      quality(),
    );

    expect(trust.posture).toBe("guarded");
  });
});
