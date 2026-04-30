import { describe, expect, it } from "vitest";
import { assessRisk } from "../assessRisk";
import { chooseExecutionPosture } from "../chooseExecutionPosture";
import { classifyRequest } from "../classifyRequest";
import { context } from "./testContext";

function posture(request: string, snapshot = context()) {
  const classification = classifyRequest(request, snapshot);
  const risk = assessRisk(request, snapshot, classification);
  return chooseExecutionPosture(request, classification, risk, snapshot);
}

describe("chooseExecutionPosture", () => {
  it("uses direct posture for low-risk questions", () => {
    expect(posture("What is a PRD?")).toBe("direct");
  });

  it("asks for context when analysis has no target", () => {
    expect(posture("Inspect this")).toBe("ask_minimum_clarification");
  });

  it("hard-stops file execution without a directory", () => {
    expect(posture("Implement this feature")).toBe("hard_stop");
  });

  it("uses an experimental branch posture for code changes with a directory", () => {
    expect(
      posture(
        "Implement this feature",
        context({ workingDirs: ["/repo"], hasWorkingDirectory: true }),
      ),
    ).toBe("experimental_branch");
  });

  it("uses dry run for destructive work with a directory", () => {
    expect(
      posture(
        "Delete unused files",
        context({ workingDirs: ["/repo"], hasWorkingDirectory: true }),
      ),
    ).toBe("dry_run");
  });
});
