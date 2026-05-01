import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { onIntentResolved, resolveIntentRequest } from "../resolveIntentRequest";
import { context } from "./testContext";

afterEach(() => {
  onIntentResolved(null);
});

describe("resolveIntentRequest — explicit override token", () => {
  it("activates fast lane for /!override prefix when otherwise allowed", () => {
    const { intent } = resolveIntentRequest(
      "/!override Implement this feature",
      context({ workingDirs: ["/repo"], hasWorkingDirectory: true }),
    );
    expect(intent.executionPosture).toBe("override_with_warnings");
  });

  it("does NOT activate fast lane on casual phrases like 'just build'", () => {
    const { intent } = resolveIntentRequest(
      "Just build me a quick draft of the plan",
      context({ workingDirs: ["/repo"], hasWorkingDirectory: true }),
    );
    expect(intent.executionPosture).not.toBe("override_with_warnings");
  });

  it("does not let override bypass hard_stop or review_required", () => {
    // No working dir → hard_stop should hold even with override
    const { intent: noDir } = resolveIntentRequest(
      "/!override Implement this feature",
      context(),
    );
    expect(noDir.executionPosture).toBe("hard_stop");

    // External write with Jira issue → review_required should hold
    const { intent: jira } = resolveIntentRequest(
      "/!override Move Jira ticket to Done",
      context({ hasJiraIssue: true }),
    );
    expect(jira.executionPosture).toBe("review_required");
  });

  it("strips the override token before classification", () => {
    // Without the strip, "/!override " characters could pollute matching;
    // verify that the underlying classifier still picks the right bucket.
    const { intent } = resolveIntentRequest(
      "/!override What is acceptance criteria?",
      context(),
    );
    expect(intent.mode).toBe("conversation");
  });
});

describe("resolveIntentRequest — telemetry hook", () => {
  let listener: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    listener = vi.fn();
    onIntentResolved(listener as unknown as Parameters<typeof onIntentResolved>[0]);
  });

  it("fires the listener once per resolve call", () => {
    resolveIntentRequest("What is a PRD?", context());
    expect(listener).toHaveBeenCalledTimes(1);
    const event = listener.mock.calls[0][0];
    expect(event.intent.mode).toBe("conversation");
    expect(event.resolution.kind).toBe("send");
  });

  it("clears when set to null", () => {
    onIntentResolved(null);
    resolveIntentRequest("What is a PRD?", context());
    expect(listener).not.toHaveBeenCalled();
  });

  it("swallows listener errors so observation cannot break routing", () => {
    onIntentResolved(() => {
      throw new Error("listener fault");
    });
    expect(() =>
      resolveIntentRequest("What is a PRD?", context()),
    ).not.toThrow();
  });
});
