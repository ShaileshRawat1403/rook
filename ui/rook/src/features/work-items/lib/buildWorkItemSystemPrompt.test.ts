import { describe, it, expect } from "vitest";
import type { WorkItem } from "../types";
import { buildWorkItemSystemPrompt } from "./buildWorkItemSystemPrompt";

function workItem(overrides: Partial<WorkItem> = {}): WorkItem {
  return {
    id: "wi-test",
    title: "Test work item",
    source: "manual",
    acceptanceCriteria: [],
    createdAt: "2026-05-01T00:00:00Z",
    updatedAt: "2026-05-01T00:00:00Z",
    ...overrides,
  };
}

describe("buildWorkItemSystemPrompt", () => {
  it("returns undefined when no work item is provided", () => {
    expect(buildWorkItemSystemPrompt(null)).toBeUndefined();
    expect(buildWorkItemSystemPrompt(undefined)).toBeUndefined();
  });

  it("emits source and title for a minimal manual work item", () => {
    const result = buildWorkItemSystemPrompt(workItem());
    expect(result).toContain("<work-item>");
    expect(result).toContain("<source>manual</source>");
    expect(result).toContain("<title>Test work item</title>");
    expect(result).toContain("</work-item>");
    expect(result).not.toContain("<acceptance-criteria>");
    expect(result).not.toContain("<key>");
    expect(result).not.toContain("<url>");
  });

  it("includes key, url, and description when present", () => {
    const result = buildWorkItemSystemPrompt(
      workItem({
        key: "PROJ-123",
        title: "Improve provider setup",
        source: "jira",
        url: "https://example.atlassian.net/browse/PROJ-123",
        description: "Stakeholders want a clearer flow.",
      }),
    );
    expect(result).toContain("<key>PROJ-123</key>");
    expect(result).toContain("<source>jira</source>");
    expect(result).toContain(
      "<url>https://example.atlassian.net/browse/PROJ-123</url>",
    );
    expect(result).toContain(
      "<description>Stakeholders want a clearer flow.</description>",
    );
  });

  it("emits acceptance criteria with id and optional status", () => {
    const result = buildWorkItemSystemPrompt(
      workItem({
        acceptanceCriteria: [
          { id: "AC-1", text: "User can see configured providers." },
          {
            id: "AC-2",
            text: "User can switch provider without losing context.",
            status: "covered",
          },
        ],
      }),
    );
    expect(result).toContain("<acceptance-criteria>");
    expect(result).toContain(
      '<criterion id="AC-1">User can see configured providers.</criterion>',
    );
    expect(result).toContain(
      '<criterion id="AC-2" status="covered">User can switch provider without losing context.</criterion>',
    );
    expect(result).toContain("</acceptance-criteria>");
  });

  it("escapes XML metacharacters in user-supplied text", () => {
    const result = buildWorkItemSystemPrompt(
      workItem({
        title: "Fix <strong> tag rendering & escaping",
        description: "Quotes are \"tricky\" and so is 'this'.",
        acceptanceCriteria: [
          { id: "AC-1", text: "Render <code> blocks correctly." },
        ],
      }),
    );
    expect(result).toContain(
      "<title>Fix &lt;strong&gt; tag rendering &amp; escaping</title>",
    );
    expect(result).toContain(
      "<description>Quotes are &quot;tricky&quot; and so is &apos;this&apos;.</description>",
    );
    expect(result).toContain(
      '<criterion id="AC-1">Render &lt;code&gt; blocks correctly.</criterion>',
    );
  });

  it("trims whitespace-only optional fields and omits them", () => {
    const result = buildWorkItemSystemPrompt(
      workItem({
        key: "   ",
        url: "",
        description: "   ",
      }),
    );
    expect(result).not.toContain("<key>");
    expect(result).not.toContain("<url>");
    expect(result).not.toContain("<description>");
  });
});
