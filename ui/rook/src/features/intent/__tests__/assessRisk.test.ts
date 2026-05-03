import { describe, expect, it } from "vitest";
import { assessRisk } from "../assessRisk";
import { classifyRequest } from "../classifyRequest";
import { context } from "./testContext";

describe("assessRisk", () => {
  it("keeps explanation low risk", () => {
    const snapshot = context();
    const classification = classifyRequest(
      "Explain acceptance criteria",
      snapshot,
    );

    expect(
      assessRisk("Explain acceptance criteria", snapshot, classification),
    ).toBe("low");
  });

  it("keeps broad code execution without a directory high, not critical", () => {
    const snapshot = context();
    const classification = classifyRequest("Modify the auth flow", snapshot);

    expect(assessRisk("Modify the auth flow", snapshot, classification)).toBe(
      "high",
    );
  });

  it("treats safe local commands as medium risk", () => {
    const snapshot = context({
      workingDirs: ["/repo"],
      hasWorkingDirectory: true,
    });
    const classification = classifyRequest("Run tests", snapshot);

    expect(assessRisk("Run tests", snapshot, classification)).toBe("medium");
  });

  it("marks external write-back as critical", () => {
    const snapshot = context({ hasJiraIssue: true });
    const classification = classifyRequest(
      "Update Jira with this status",
      snapshot,
    );

    expect(
      assessRisk("Update Jira with this status", snapshot, classification),
    ).toBe("critical");
  });

  it("keeps weak planning medium instead of blocking", () => {
    const snapshot = context({ hasPrd: true });
    const classification = classifyRequest(
      "Create an implementation plan",
      snapshot,
    );

    expect(
      assessRisk("Create an implementation plan", snapshot, classification),
    ).toBe("medium");
  });
});
