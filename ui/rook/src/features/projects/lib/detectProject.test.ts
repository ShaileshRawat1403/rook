import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/shared/api/system", () => ({
  listDirectoryEntries: vi.fn(),
  readWorkspaceManifest: vi.fn(),
}));

import {
  classifyCommandRisk,
  classifyScript,
  detectDocumentationFiles,
  detectFrameworks,
  detectProject,
  detectTestFrameworks,
  extractDependencyNames,
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
      {
        name: "dev",
        command: "pnpm dev",
        source: "package.json",
        kind: "dev",
        risk: "review",
      },
      {
        name: "build",
        command: "pnpm build",
        source: "package.json",
        kind: "build",
        risk: "review",
      },
      {
        name: "test",
        command: "pnpm test",
        source: "package.json",
        kind: "test",
        risk: "safe",
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
      frameworks: [],
      testFrameworks: [],
      documentationFiles: [],
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
      frameworks: [],
      testFrameworks: [],
      documentationFiles: [],
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

  it("classifies cargo suggestions with body-based risk", () => {
    const result = suggestedCommandsFor(new Set(["Cargo.toml"]));
    const byCommand = Object.fromEntries(
      result.map((s) => [s.command, s.risk]),
    );
    expect(byCommand["cargo test"]).toBe("safe");
    expect(byCommand["cargo build"]).toBe("review");
    expect(byCommand["cargo run"]).toBe("review");
    expect(byCommand["cargo check"]).toBe("review");
  });
});

describe("classifyCommandRisk", () => {
  it("returns safe for vitest/jest/test/lint/typecheck/playwright bodies", () => {
    expect(classifyCommandRisk("vitest run")).toBe("safe");
    expect(classifyCommandRisk("jest --runInBand")).toBe("safe");
    expect(classifyCommandRisk("tsc --noEmit")).toBe("review");
    expect(classifyCommandRisk("pnpm typecheck")).toBe("safe");
    expect(classifyCommandRisk("biome lint .")).toBe("safe");
    expect(classifyCommandRisk("playwright test")).toBe("safe");
  });

  it("treats dev/serve/watch/start/build/install/upgrade as review", () => {
    expect(classifyCommandRisk("vite")).toBe("review");
    expect(classifyCommandRisk("vite build")).toBe("review");
    expect(classifyCommandRisk("pnpm dev")).toBe("review");
    expect(classifyCommandRisk("pnpm serve")).toBe("review");
    expect(classifyCommandRisk("pnpm watch")).toBe("review");
    expect(classifyCommandRisk("pnpm start")).toBe("review");
    expect(classifyCommandRisk("pnpm install")).toBe("review");
    expect(classifyCommandRisk("pnpm upgrade")).toBe("review");
    expect(classifyCommandRisk("tauri build")).toBe("review");
  });

  it("blocks rm, force-push, --force, deploy, publish, release", () => {
    expect(classifyCommandRisk("rm -rf node_modules")).toBe("blocked");
    expect(classifyCommandRisk("git push --force")).toBe("blocked");
    expect(classifyCommandRisk("force-push origin main")).toBe("blocked");
    expect(classifyCommandRisk("force push")).toBe("blocked");
    expect(classifyCommandRisk("pnpm deploy")).toBe("blocked");
    expect(classifyCommandRisk("npm publish")).toBe("blocked");
    expect(classifyCommandRisk("semantic-release")).toBe("blocked");
  });

  it("body wins over name — script named test running rm classifies as blocked", () => {
    // Reproduces the user's adversarial case: scripts.test = "rm -rf node_modules"
    expect(classifyCommandRisk("rm -rf node_modules")).toBe("blocked");
  });

  it("compound bodies pick the highest severity hit", () => {
    expect(classifyCommandRisk("pnpm install && pnpm test")).toBe("review");
    expect(classifyCommandRisk("pnpm test && pnpm build")).toBe("review");
    expect(classifyCommandRisk("pnpm test && rm -rf foo")).toBe("blocked");
  });

  it("defaults unknown bodies to review, including bare 'cargo run'", () => {
    expect(classifyCommandRisk("")).toBe("review");
    expect(classifyCommandRisk("cargo run")).toBe("review");
    expect(classifyCommandRisk("./scripts/something")).toBe("review");
  });
});

describe("detectFrameworks", () => {
  it("detects react, vite, tailwind, tauri, typescript", () => {
    const deps = [
      "react",
      "vite",
      "tailwindcss",
      "@tauri-apps/api",
      "typescript",
    ];
    const frameworks = detectFrameworks(deps, false);
    expect(frameworks).toEqual(
      expect.arrayContaining(["react", "vite", "tailwindcss", "tauri", "typescript"]),
    );
  });

  it("detects tauri via plugin packages too", () => {
    expect(detectFrameworks(["@tauri-apps/plugin-opener"], false)).toContain(
      "tauri",
    );
  });

  it("adds rust when Cargo.toml is present", () => {
    expect(detectFrameworks([], true)).toContain("rust");
  });

  it("ignores unrelated packages", () => {
    expect(detectFrameworks(["lodash", "axios"], false)).toEqual([]);
  });

  it("matches radix scoped packages", () => {
    expect(detectFrameworks(["@radix-ui/react-dialog"], false)).toContain(
      "radix",
    );
  });
});

describe("detectTestFrameworks", () => {
  it("detects vitest, jest, playwright, cypress", () => {
    expect(
      detectTestFrameworks(["vitest", "jest", "@playwright/test", "cypress"]),
    ).toEqual(expect.arrayContaining(["vitest", "jest", "playwright", "cypress"]));
  });

  it("returns [] when no test deps present", () => {
    expect(detectTestFrameworks(["react", "vite"])).toEqual([]);
  });
});

describe("extractDependencyNames", () => {
  it("returns names from dependencies, devDependencies, and peerDependencies", () => {
    const json = JSON.stringify({
      dependencies: { react: "^19.0.0" },
      devDependencies: { vitest: "^4.0.0" },
      peerDependencies: { typescript: "^5.0.0" },
    });
    expect(extractDependencyNames(json).sort()).toEqual(
      ["react", "typescript", "vitest"].sort(),
    );
  });

  it("returns [] for invalid JSON", () => {
    expect(extractDependencyNames("not json")).toEqual([]);
  });

  it("dedupes when the same dep appears in multiple groups", () => {
    const json = JSON.stringify({
      dependencies: { react: "^19.0.0" },
      devDependencies: { react: "^19.0.0" },
    });
    expect(extractDependencyNames(json)).toEqual(["react"]);
  });
});

describe("detectDocumentationFiles", () => {
  it("returns the subset of well-known doc files present", () => {
    expect(
      detectDocumentationFiles(
        new Set(["README.md", "AGENTS.md", "package.json"]),
      ),
    ).toEqual(["README.md", "AGENTS.md"]);
  });

  it("returns [] when no doc files exist", () => {
    expect(detectDocumentationFiles(new Set(["package.json"]))).toEqual([]);
  });
});
