import { describe, expect, it } from "vitest";
import {
  resolveAgentProviderCatalogId,
  resolveModelProviderCatalogIdStrict,
} from "./providerCatalog";

describe("resolveAgentProviderCatalogId", () => {
  it("matches direct catalog ids", () => {
    expect(resolveAgentProviderCatalogId("cursor-agent", "Cursor Agent")).toBe(
      "cursor-agent",
    );
  });

  it("matches common agent aliases", () => {
    expect(resolveAgentProviderCatalogId("codex-cli", "Codex CLI")).toBe(
      "codex-acp",
    );
    expect(resolveAgentProviderCatalogId("claude-code", "Claude Code")).toBe(
      "claude-acp",
    );
  });

  it("does not treat model providers as agents", () => {
    expect(
      resolveAgentProviderCatalogId("databricks", "Databricks"),
    ).toBeNull();
  });

  it("does not treat agent providers as Rook Native model providers", () => {
    expect(resolveModelProviderCatalogIdStrict("codex-acp")).toBeNull();
    expect(resolveModelProviderCatalogIdStrict("cursor-agent")).toBeNull();
    expect(resolveModelProviderCatalogIdStrict("chatgpt_codex")).toBe(
      "chatgpt_codex",
    );
  });

  it("matches fuzzy agent labels with extra suffixes", () => {
    expect(
      resolveAgentProviderCatalogId("custom-id", "Claude Code (ACP)"),
    ).toBe("claude-acp");
    expect(resolveAgentProviderCatalogId("custom-id", "Codex CLI (ACP)")).toBe(
      "codex-acp",
    );
    expect(
      resolveAgentProviderCatalogId("custom-id", "Cursor Agent Stable"),
    ).toBe("cursor-agent");
  });
});
