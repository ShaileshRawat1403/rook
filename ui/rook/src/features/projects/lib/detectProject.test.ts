import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/shared/api/system", () => ({
  listDirectoryEntries: vi.fn(),
  readWorkspaceManifest: vi.fn(),
}));

import {
  classifyScript,
  detectProject,
  parsePackageJsonScripts,
  selectPackageManager,
  suggestedCommandsFor,
} from "./detectProject";
import {
  listDirectoryEntries,
  readWorkspaceManifest,
} from "@/shared/api/system";

const listMock = vi.mocked(listDirectoryEntries);
const readMock = vi.mocked(readWorkspaceManifest);

function fileEntry(name: string) {
  return { name, path: `/work/${name}`, kind: "file" as const };
}

describe("classifyScript", () => {
  it("recognises dev, build, test, lint, format", () => {
    expect(classifyScript("dev")).toBe("dev");
    expect(classifyScript("start")).toBe("dev");
    expect(classifyScript("build")).toBe("build");
    expect(classifyScript("test")).toBe("test");
    expect(classifyScript("test:e2e")).toBe("test");
    expect(classifyScript("lint")).toBe("lint");
    expect(classifyScript("typecheck")).toBe("lint");
    expect(classifyScript("format")).toBe("format");
  });

  it("falls back to other for unknown names", () => {
    expect(classifyScript("release")).toBe("other");
  });
});

describe("selectPackageManager", () => {
  it("prefers pnpm over a package.json fallback", () => {
    expect(selectPackageManager(new Set(["package.json", "pnpm-lock.yaml"]))).toBe(
      "pnpm",
    );
  });

  it("falls back to npm when only package.json is present", () => {
    expect(selectPackageManager(new Set(["package.json"]))).toBe("npm");
  });

  it("detects cargo, python, and make projects", () => {
    expect(selectPackageManager(new Set(["Cargo.toml"]))).toBe("cargo");
    expect(selectPackageManager(new Set(["pyproject.toml"]))).toBe("python");
    expect(selectPackageManager(new Set(["requirements.txt"]))).toBe("python");
    expect(selectPackageManager(new Set(["Makefile"]))).toBe("make");
  });

  it("returns null when no manifest is recognised", () => {
    expect(selectPackageManager(new Set(["README.md"]))).toBeNull();
  });
});

describe("parsePackageJsonScripts", () => {
  it("emits runner-prefixed commands and classified kinds", () => {
    const json = JSON.stringify({
      scripts: { dev: "vite", build: "vite build", test: "vitest run" },
    });
    const scripts = parsePackageJsonScripts(json, "pnpm");
    expect(scripts).toEqual([
      { name: "dev", command: "pnpm dev", source: "package.json", kind: "dev" },
      {
        name: "build",
        command: "pnpm build",
        source: "package.json",
        kind: "build",
      },
      {
        name: "test",
        command: "pnpm test",
        source: "package.json",
        kind: "test",
      },
    ]);
  });

  it("uses 'npm run' prefix for npm", () => {
    const json = JSON.stringify({ scripts: { dev: "vite" } });
    expect(parsePackageJsonScripts(json, "npm")[0].command).toBe("npm run dev");
  });

  it("returns [] for invalid JSON", () => {
    expect(parsePackageJsonScripts("not-json", "pnpm")).toEqual([]);
  });

  it("returns [] when scripts field is missing or non-object", () => {
    expect(parsePackageJsonScripts(JSON.stringify({}), "pnpm")).toEqual([]);
    expect(
      parsePackageJsonScripts(JSON.stringify({ scripts: "nope" }), "pnpm"),
    ).toEqual([]);
  });

  it("ignores non-string script values", () => {
    const json = JSON.stringify({
      scripts: { dev: "vite", broken: 42, empty: null },
    });
    const scripts = parsePackageJsonScripts(json, "pnpm");
    expect(scripts.map((s) => s.name)).toEqual(["dev"]);
  });
});

describe("detectProject", () => {
  beforeEach(() => {
    listMock.mockReset();
    readMock.mockReset();
  });

  it("returns the empty detection for an empty path", async () => {
    const result = await detectProject("");
    expect(result).toEqual({
      packageManager: null,
      manifests: [],
      scripts: [],
      suggested: [],
    });
    expect(listMock).not.toHaveBeenCalled();
  });

  it("returns the empty detection when listing fails", async () => {
    listMock.mockRejectedValue(new Error("nope"));
    const result = await detectProject("/work");
    expect(result).toEqual({
      packageManager: null,
      manifests: [],
      scripts: [],
      suggested: [],
    });
  });

  it("detects a pnpm project and parses package.json scripts", async () => {
    listMock.mockResolvedValue([
      fileEntry("package.json"),
      fileEntry("pnpm-lock.yaml"),
      fileEntry("README.md"),
    ]);
    readMock.mockResolvedValue(
      JSON.stringify({ scripts: { dev: "vite", build: "vite build" } }),
    );

    const result = await detectProject("/work");

    expect(result.packageManager).toBe("pnpm");
    expect(result.manifests.sort()).toEqual(
      ["package.json", "pnpm-lock.yaml"].sort(),
    );
    expect(result.scripts.map((s) => s.command)).toEqual([
      "pnpm dev",
      "pnpm build",
    ]);
    expect(result.suggested).toEqual([]);
  });

  it("returns no scripts but suggests cargo commands when only Cargo.toml is present", async () => {
    listMock.mockResolvedValue([fileEntry("Cargo.toml")]);
    const result = await detectProject("/work");
    expect(result.packageManager).toBe("cargo");
    expect(result.scripts).toEqual([]);
    expect(result.suggested.map((s) => s.command)).toEqual([
      "cargo check",
      "cargo test",
      "cargo build",
      "cargo run",
      "cargo fmt",
      "cargo clippy",
    ]);
    expect(readMock).not.toHaveBeenCalled();
  });

  it("falls back gracefully when manifest read errors", async () => {
    listMock.mockResolvedValue([fileEntry("package.json")]);
    readMock.mockRejectedValue(new Error("io"));
    const result = await detectProject("/work");
    expect(result.scripts).toEqual([]);
  });
});

describe("suggestedCommandsFor", () => {
  it("returns the cargo suggestion set when Cargo.toml is present", () => {
    const result = suggestedCommandsFor(new Set(["Cargo.toml"]));
    expect(result.map((s) => s.command)).toEqual([
      "cargo check",
      "cargo test",
      "cargo build",
      "cargo run",
      "cargo fmt",
      "cargo clippy",
    ]);
    expect(result.every((s) => s.source === "Cargo.toml")).toBe(true);
  });

  it("returns no suggestions when Cargo.toml is absent", () => {
    expect(suggestedCommandsFor(new Set(["package.json"]))).toEqual([]);
    expect(suggestedCommandsFor(new Set(["pyproject.toml"]))).toEqual([]);
    expect(suggestedCommandsFor(new Set())).toEqual([]);
  });
});
