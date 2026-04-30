import { describe, expect, it } from "vitest";
import { classifyRequest } from "../classifyRequest";
import { context } from "./testContext";

describe("classifyRequest", () => {
  it("routes conceptual questions directly", () => {
    const result = classifyRequest("What is acceptance criteria?", context());

    expect(result.mode).toBe("conversation");
    expect(result.risk).toBe("low");
    expect(result.executionPosture).toBe("direct");
    expect(result.responseMode).toBe("answer_directly");
  });

  it("routes PRD review as analysis", () => {
    const result = classifyRequest(
      "Review this PRD",
      context({ hasAttachments: true, hasPrd: true }),
    );

    expect(result.mode).toBe("analysis");
    expect(result.risk).toBe("medium");
    expect(result.responseMode).toBe("analyze");
  });

  it("routes implementation plans to safe draft before readiness exists", () => {
    const result = classifyRequest("Create implementation plan", context());

    expect(result.mode).toBe("planning");
    expect(result.risk).toBe("medium");
    expect(result.executionPosture).toBe("safe_draft");
    expect(result.readiness).toBe("safe_draft_only");
  });

  it("routes implementation requests as execution", () => {
    const result = classifyRequest(
      "Implement this now",
      context({ workingDirs: ["/repo"], hasWorkingDirectory: true }),
    );

    expect(result.mode).toBe("execution");
    expect(result.risk).toBe("high");
    expect(result.executionPosture).toBe("experimental_branch");
  });

  it("routes destructive file requests to dry run", () => {
    const result = classifyRequest(
      "Delete unused files",
      context({ workingDirs: ["/repo"], hasWorkingDirectory: true }),
    );

    expect(result.mode).toBe("execution");
    expect(result.risk).toBe("critical");
    expect(result.executionPosture).toBe("dry_run");
  });

  it("routes Jira status changes to review required", () => {
    const result = classifyRequest(
      "Move Jira ticket to Done",
      context({ hasJiraIssue: true }),
    );

    expect(result.mode).toBe("execution");
    expect(result.risk).toBe("critical");
    expect(result.executionPosture).toBe("review_required");
  });
});
