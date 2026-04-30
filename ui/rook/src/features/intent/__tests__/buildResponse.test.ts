import { describe, expect, it } from "vitest";
import {
  buildExperimentalBranchRecommendation,
  buildHardStopMessage,
  buildSafeDraftNotice,
} from "../buildResponse";
import { classifyRequest } from "../classifyRequest";
import { context } from "./testContext";

describe("buildResponse", () => {
  it("frames safe drafts without pretending gaps are solved", () => {
    const classification = classifyRequest(
      "Create an implementation plan",
      context(),
    );
    const response = buildSafeDraftNotice(classification, "neutral");

    expect(response).toContain("safe draft");
    expect(response).toContain("assumptions stay visible");
    expect(response).not.toContain("blocked");
  });

  it("recommends experimental branches with recovery support", () => {
    const snapshot = context({
      workingDirs: ["/repo"],
      hasWorkingDirectory: true,
      currentBranch: "main",
    });
    const classification = classifyRequest("Implement this feature", snapshot);
    const response = buildExperimentalBranchRecommendation(
      classification,
      snapshot,
      "neutral",
    );

    expect(response).toContain("Recommended safer lane");
    expect(response).toContain("experimental branch");
    expect(response).toContain("recovery path");
  });

  it("hard stop still offers a recovery path", () => {
    const snapshot = context();
    const classification = {
      ...classifyRequest("Implement this feature", snapshot),
      blockingGaps: [
        "A working directory is required before file-changing execution.",
      ],
    };
    const response = buildHardStopMessage(
      classification,
      snapshot,
      "firm_boundary",
    );

    expect(response).toContain("I cannot execute this safely");
    expect(response).toContain("Safe recovery");
    expect(response).toContain("working directory");
  });
});
