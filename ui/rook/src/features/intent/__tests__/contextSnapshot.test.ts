import { describe, it, expect } from "vitest";
import type { ChatAttachmentDraft } from "@/shared/types/messages";
import { buildContextSnapshot } from "../contextSnapshot";

function makeAttachment(name: string): ChatAttachmentDraft {
  return {
    id: `att-${name}`,
    kind: "file",
    name,
    path: `/tmp/${name}`,
  };
}

function snapshot(attachments: ChatAttachmentDraft[] = []) {
  return buildContextSnapshot({
    sessionId: "s1",
    attachments,
    isStreaming: false,
  });
}

describe("buildContextSnapshot — attachment heuristics", () => {
  it("treats PRD- and requirements-named files as PRDs", () => {
    expect(snapshot([makeAttachment("PRD-v1.md")]).hasPrd).toBe(true);
    expect(snapshot([makeAttachment("requirements.md")]).hasPrd).toBe(true);
    expect(snapshot([makeAttachment("spec.md")]).hasPrd).toBe(true);
    expect(snapshot([makeAttachment("product-spec-v2.pdf")]).hasPrd).toBe(true);
  });

  it("does not treat 'specimen' as a spec/PRD", () => {
    expect(snapshot([makeAttachment("specimen.txt")]).hasPrd).toBe(false);
  });

  it("does not treat 'prdx-config.json' as a PRD", () => {
    expect(snapshot([makeAttachment("prdx-config.json")]).hasPrd).toBe(false);
  });

  it("matches Jira-style identifiers in attachment names", () => {
    expect(snapshot([makeAttachment("INGEST-123-notes.md")]).hasJiraIssue).toBe(
      true,
    );
    expect(snapshot([makeAttachment("PROJ-7.txt")]).hasJiraIssue).toBe(true);
  });

  it("does not flag arbitrary filenames as Jira", () => {
    expect(snapshot([makeAttachment("transcript.pdf")]).hasJiraIssue).toBe(
      false,
    );
    expect(snapshot([makeAttachment("notes-2026.md")]).hasJiraIssue).toBe(
      false,
    );
  });

  it("hasPrdReview is hard-coded false (slice-prd-readiness pending)", () => {
    expect(snapshot([makeAttachment("PRD-v1.md")]).hasPrdReview).toBe(false);
  });
});
