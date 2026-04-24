import { describe, expect, it } from "vitest";
import {
  buildProjectSystemPrompt,
  composeSystemPrompt,
  getProjectArtifactRoots,
  getProjectFolderName,
  getProjectFolderOption,
} from "./chatProjectContext";

describe("chatProjectContext", () => {
  it("builds project instructions from stored project settings", () => {
    const systemPrompt = buildProjectSystemPrompt({
      id: "project-1",
      name: "Rook2",
      description: "Desktop app",
      prompt: "Always read AGENTS.md before editing.",
      icon: "folder",
      color: "#000000",
      preferredProvider: "rook",
      preferredModel: "claude-sonnet-4",
      workingDirs: ["/Users/wesb/dev/rook"],
      artifactsDir: "/Users/wesb/.rook/projects/rook/artifacts",
      useWorktrees: true,
      order: 0,
      archivedAt: null,
      createdAt: "now",
      updatedAt: "now",
    });

    expect(systemPrompt).toContain("<project-settings>");
    expect(systemPrompt).toContain("Project name: Rook2");
    expect(systemPrompt).toContain("Working directories: /Users/wesb/dev/rook");
    expect(systemPrompt).toContain(
      "Artifact directory: /Users/wesb/dev/rook/artifacts",
    );
    expect(systemPrompt).toContain("Preferred provider: rook");
    expect(systemPrompt).toContain(
      "Use git worktrees for branch isolation: yes",
    );
    expect(systemPrompt).toContain("<project-file-policy>");
    expect(systemPrompt).toContain(
      "Write newly generated files to /Users/wesb/dev/rook/artifacts by default.",
    );
    expect(systemPrompt).toContain("<project-instructions>");
    expect(systemPrompt).toContain("Always read AGENTS.md before editing.");
  });

  it("combines persona and project prompts without empty sections", () => {
    expect(
      composeSystemPrompt("Persona prompt", undefined, "Project prompt"),
    ).toBe("Persona prompt\n\nProject prompt");
  });

  it("extracts the folder name from a path", () => {
    expect(getProjectFolderName("/Users/wesb/dev/rook")).toBe("rook");
    expect(getProjectFolderName("C:\\Users\\wesb\\rook\\")).toBe("rook");
  });

  it("creates folder options from the project's working directories", () => {
    expect(
      getProjectFolderOption({
        workingDirs: ["/Users/wesb/dev/rook", "/Users/wesb/dev/other"],
        artifactsDir: "/Users/wesb/.rook/projects/rook/artifacts",
      }),
    ).toEqual([
      {
        id: "/Users/wesb/dev/rook/artifacts",
        name: "artifacts",
        path: "/Users/wesb/dev/rook/artifacts",
      },
      {
        id: "/Users/wesb/dev/other/artifacts",
        name: "artifacts",
        path: "/Users/wesb/dev/other/artifacts",
      },
    ]);
  });

  it("returns an empty array when workingDirs is empty", () => {
    expect(
      getProjectFolderOption({
        workingDirs: [],
        artifactsDir: "/Users/wesb/.rook/projects/sample-project/artifacts",
      }),
    ).toEqual([
      {
        id: "/Users/wesb/.rook/projects/sample-project/artifacts",
        name: "artifacts",
        path: "/Users/wesb/.rook/projects/sample-project/artifacts",
      },
    ]);
  });

  it("returns an empty array when project is null", () => {
    expect(getProjectFolderOption(null)).toEqual([]);
  });

  it("returns only artifact subdirectories for working dirs", () => {
    expect(
      getProjectArtifactRoots({
        workingDirs: ["/Users/wesb/dev/rook", "/Users/wesb/dev/other"],
        artifactsDir: "/Users/wesb/.rook/projects/rook/artifacts",
      }),
    ).toEqual([
      "/Users/wesb/dev/rook/artifacts",
      "/Users/wesb/dev/other/artifacts",
    ]);
  });
});
