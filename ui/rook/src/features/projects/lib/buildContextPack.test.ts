import { describe, it, expect } from "vitest";
import type { GitState, ChangedFile } from "@/shared/types/git";
import type { ProjectDetection } from "./detectProject";
import { buildContextPack } from "./buildContextPack";

const RICH_DETECTION: ProjectDetection = {
  packageManager: "pnpm",
  manifests: ["package.json", "pnpm-lock.yaml", "Cargo.toml"],
  scripts: [
    {
      name: "test",
      command: "pnpm test",
      source: "package.json",
      kind: "test",
      risk: "safe",
    },
    {
      name: "build",
      command: "pnpm build",
      source: "package.json",
      kind: "build",
      risk: "review",
    },
    {
      name: "release",
      command: "pnpm release",
      source: "package.json",
      kind: "other",
      risk: "blocked",
    },
  ],
  suggested: [
    {
      name: "cargo test",
      command: "cargo test",
      source: "Cargo.toml",
      kind: "test",
      risk: "safe",
    },
  ],
  frameworks: ["react", "vite", "tauri", "rust"],
  testFrameworks: ["vitest", "playwright"],
  documentationFiles: ["README.md", "AGENTS.md"],
};

const GIT_STATE: GitState = {
  isGitRepo: true,
  currentBranch: "feat/workspace-summary",
  dirtyFileCount: 0,
  incomingCommitCount: 0,
  worktrees: [],
  isWorktree: false,
  mainWorktreePath: "/work",
  localBranches: [],
};

const CHANGED: ChangedFile[] = [
  { path: "src/foo.ts", status: "modified", additions: 3, deletions: 1 },
  { path: "src/bar.ts", status: "added", additions: 10, deletions: 0 },
];

describe("buildContextPack", () => {
  it("includes a read-only header on every output", () => {
    const pack = buildContextPack({
      workspacePath: null,
      detection: undefined,
      gitState: undefined,
      changedFiles: undefined,
    });
    expect(pack).toContain("Workspace Context Pack");
    expect(pack).toContain("Generated from read-only project metadata.");
    expect(pack).toContain("No commands were executed.");
    expect(pack).toContain("No files were modified.");
    expect(pack).toContain("Trust boundary");
    expect(pack).toContain(
      "Rook does not run commands or modify files in this slice.",
    );
  });

  it("renders a rich detection with grouped commands by risk", () => {
    const pack = buildContextPack({
      workspacePath: "/Users/test/work",
      detection: RICH_DETECTION,
      gitState: GIT_STATE,
      changedFiles: CHANGED,
    });

    // Workspace section
    expect(pack).toContain("Path: /Users/test/work");
    expect(pack).toContain("Branch: feat/workspace-summary");
    expect(pack).toContain("Changes: 2 file(s) (+13 -1)");

    // Stack section
    expect(pack).toMatch(/Frameworks: react, vite, tauri, rust/);
    expect(pack).toMatch(/Test frameworks: vitest, playwright/);
    expect(pack).toContain("Package manager: pnpm");
    expect(pack).toMatch(/Manifests: .*Cargo\.toml/);
    expect(pack).toContain("Documentation: README.md, AGENTS.md");

    // Commands grouped by risk
    expect(pack).toContain("Likely safe");
    expect(pack).toContain("Review first");
    expect(pack).toContain("Do not run blindly");
    expect(pack).toMatch(/- pnpm test/);
    expect(pack).toMatch(/- pnpm build/);
    expect(pack).toMatch(/- pnpm release/);
    expect(pack).toMatch(/- cargo test/);
  });

  it("handles a non-git workspace and missing detection gracefully", () => {
    const pack = buildContextPack({
      workspacePath: "/work",
      detection: undefined,
      gitState: undefined,
      changedFiles: undefined,
    });
    expect(pack).toContain("Path: /work");
    expect(pack).toContain("Git: not a repository");
    expect(pack).toContain("Changes: clean");
    // No Stack section when detection is missing
    expect(pack).not.toContain("Frameworks:");
  });
});
