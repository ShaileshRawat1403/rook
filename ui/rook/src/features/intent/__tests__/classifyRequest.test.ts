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

  it("routes summarize last commit as direct read-only analysis", () => {
    const result = classifyRequest("Summarize last commit", context());

    expect(result.mode).toBe("analysis");
    expect(result.executionPosture).toBe("direct");
    expect(result.responseMode).toBe("analyze");
  });

  it("routes check my commit and summarize as direct read-only analysis", () => {
    const result = classifyRequest("Check my commit and summarize", context());

    expect(result.mode).toBe("analysis");
    expect(result.executionPosture).toBe("direct");
  });

  it("routes read-only diff review as analysis", () => {
    const result = classifyRequest("Review the diff", context());

    expect(result.mode).toBe("analysis");
    expect(result.executionPosture).toBe("direct");
  });

  it("routes PR change questions as read-only analysis", () => {
    const result = classifyRequest("What changed in this PR?", context());

    expect(result.mode).toBe("analysis");
    expect(result.executionPosture).toBe("direct");
  });

  it("routes safe local commands to lightweight approval", () => {
    const result = classifyRequest(
      "Run tests",
      context({ workingDirs: ["/repo"], hasWorkingDirectory: true }),
    );

    expect(result.mode).toBe("execution");
    expect(result.risk).toBe("medium");
    expect(result.executionPosture).toBe("approval_once");
  });

  it("routes explicit commit creation as execution", () => {
    const result = classifyRequest(
      "Commit these changes",
      context({ workingDirs: ["/repo"], hasWorkingDirectory: true }),
    );

    expect(result.mode).toBe("execution");
    expect(result.executionPosture).toBe("approval_once");
  });

  it("routes commit and push as review required", () => {
    const result = classifyRequest(
      "Commit and push this change",
      context({ workingDirs: ["/repo"], hasWorkingDirectory: true }),
    );

    expect(result.mode).toBe("execution");
    expect(result.risk).toBe("critical");
    expect(result.executionPosture).toBe("review_required");
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

  it("escalates 'plan to delete X' to destructive even though planning hits first", () => {
    const result = classifyRequest(
      "Plan how to delete the old generated files",
      context({ workingDirs: ["/repo"], hasWorkingDirectory: true }),
    );
    expect(result.mode).toBe("execution");
    expect(result.risk).toBe("critical");
    expect(result.executionPosture).toBe("dry_run");
  });

  it("does not flag 'specimen' as a destructive 'spec' or PRD-anything", () => {
    // The classifyRequest module doesn't have spec/specimen signals, but
    // exercising it here guards against future overreach.
    const result = classifyRequest("Look at this specimen", context());
    expect(result.mode).toBe("analysis");
  });

  it("multi-hit execution requests get high confidence", () => {
    const result = classifyRequest(
      "Implement, commit these changes, and push this change",
      context({ workingDirs: ["/repo"], hasWorkingDirectory: true }),
    );
    expect(result.mode).toBe("execution");
    expect(result.confidence).toBe("high");
  });
});
