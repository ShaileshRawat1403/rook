import { listDirectoryEntries, type FileTreeEntry } from "@/shared/api/system";
import {
  readWorkspaceManifest,
  type WorkspaceManifestName,
} from "@/shared/api/system";

export type PackageManager =
  | "pnpm"
  | "npm"
  | "yarn"
  | "bun"
  | "cargo"
  | "python"
  | "make";

export type ScriptKind = "dev" | "build" | "test" | "lint" | "format" | "other";

export type CommandRisk = "safe" | "review" | "blocked";

export interface DetectedScript {
  name: string;
  command: string;
  source: string;
  kind: ScriptKind;
  /** Body-based classification. Advisory only — Slice 3 does not execute. */
  risk: CommandRisk;
}

export interface ProjectDetection {
  packageManager: PackageManager | null;
  manifests: string[];
  scripts: DetectedScript[];
  suggested: DetectedScript[];
  frameworks: string[];
  testFrameworks: string[];
  documentationFiles: string[];
}

const CARGO_SUGGESTED: ReadonlyArray<{ name: string; kind: ScriptKind }> = [
  { name: "check", kind: "lint" },
  { name: "test", kind: "test" },
  { name: "build", kind: "build" },
  { name: "run", kind: "dev" },
  { name: "fmt", kind: "format" },
  { name: "clippy", kind: "lint" },
];

const MANIFEST_FILES: ReadonlySet<string> = new Set([
  "package.json",
  "pnpm-lock.yaml",
  "yarn.lock",
  "package-lock.json",
  "bun.lockb",
  "Cargo.toml",
  "pyproject.toml",
  "requirements.txt",
  "Makefile",
]);

const DOCUMENTATION_FILES: ReadonlyArray<string> = [
  "README.md",
  "AGENTS.md",
  "CONTRIBUTING.md",
  "ARCHITECTURE.md",
  "CHANGELOG.md",
];

interface FrameworkPattern {
  /** Display name shown in UI and context pack. */
  name: string;
  /** Any of these dependency names triggers detection (substring match on the dep map keys). */
  match: ReadonlyArray<string>;
}

const FRAMEWORK_PATTERNS: ReadonlyArray<FrameworkPattern> = [
  { name: "react", match: ["react"] },
  { name: "vite", match: ["vite"] },
  { name: "tailwindcss", match: ["tailwindcss"] },
  { name: "tauri", match: ["@tauri-apps/api", "@tauri-apps/plugin-"] },
  { name: "typescript", match: ["typescript"] },
  { name: "tanstack-query", match: ["@tanstack/react-query"] },
  { name: "zustand", match: ["zustand"] },
  { name: "radix", match: ["@radix-ui/"] },
  { name: "motion", match: ["framer-motion", "motion"] },
  { name: "shiki", match: ["shiki"] },
];

const TEST_FRAMEWORK_PATTERNS: ReadonlyArray<FrameworkPattern> = [
  { name: "vitest", match: ["vitest"] },
  { name: "jest", match: ["jest"] },
  { name: "playwright", match: ["@playwright/test", "playwright"] },
  { name: "cypress", match: ["cypress"] },
];

// ---------------------------------------------------------------------------
// Risk classification — body-based, word-boundary matching.
// Severity: blocked > review > safe. Unknown bodies default to review.
// ---------------------------------------------------------------------------

const BLOCKED_PHRASES: ReadonlyArray<RegExp> = [
  /\bforce[- ]push\b/,
  /(^|\s)--force(\s|$)/,
  /\brm\s+(?:-[rRfF]+\s+)?/,
];

function makeWordBoundary(tokens: ReadonlyArray<string>): RegExp[] {
  return tokens.map((tok) => new RegExp(`\\b${escapeRegex(tok)}\\b`));
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const BLOCKED_TOKENS = makeWordBoundary([
  "rm",
  "drop",
  "wipe",
  "purge",
  "deploy",
  "publish",
  "release",
  "prepublish",
  "postpublish",
]);

const REVIEW_TOKENS = makeWordBoundary([
  "dev",
  "serve",
  "watch",
  "start",
  "build",
  "bundle",
  "package",
  "install",
  "update",
  "upgrade",
  "sync",
  "ci",
]);

const SAFE_TOKENS = makeWordBoundary([
  "typecheck",
  "lint",
  "format-check",
  "test",
  "vitest",
  "jest",
  "playwright",
]);

export function classifyCommandRisk(body: string): CommandRisk {
  const lower = body.toLowerCase().trim();
  if (!lower) return "review";

  if (BLOCKED_PHRASES.some((re) => re.test(lower))) return "blocked";
  if (BLOCKED_TOKENS.some((re) => re.test(lower))) return "blocked";
  if (REVIEW_TOKENS.some((re) => re.test(lower))) return "review";
  if (SAFE_TOKENS.some((re) => re.test(lower))) return "safe";
  return "review";
}

// ---------------------------------------------------------------------------
// Script kind classification — name-based, used for grouping in the UI only.
// ---------------------------------------------------------------------------

export function classifyScript(name: string): ScriptKind {
  const lower = name.toLowerCase();
  if (/^(dev|start|serve|watch)/.test(lower)) return "dev";
  if (/^(build|compile|bundle|package)/.test(lower)) return "build";
  if (/(test|spec|vitest|jest|playwright|e2e)/.test(lower)) return "test";
  if (/^(lint|typecheck|check)/.test(lower)) return "lint";
  if (/^(format|fmt|prettier|biome:format)/.test(lower)) return "format";
  return "other";
}

/** Pure helper, exported for tests. Selects the runner based on lockfiles. */
export function selectPackageManager(
  filenames: ReadonlySet<string>,
): PackageManager | null {
  if (filenames.has("pnpm-lock.yaml")) return "pnpm";
  if (filenames.has("bun.lockb")) return "bun";
  if (filenames.has("yarn.lock")) return "yarn";
  if (filenames.has("package-lock.json")) return "npm";
  if (filenames.has("package.json")) return "npm";
  if (filenames.has("Cargo.toml")) return "cargo";
  if (filenames.has("pyproject.toml") || filenames.has("requirements.txt")) {
    return "python";
  }
  if (filenames.has("Makefile")) return "make";
  return null;
}

/** Pure helper, exported for tests. Parses npm-style scripts from package.json. */
export function parsePackageJsonScripts(
  json: string,
  runner: "pnpm" | "npm" | "yarn" | "bun",
): DetectedScript[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return [];
  }
  if (!parsed || typeof parsed !== "object") return [];
  const scripts = (parsed as { scripts?: unknown }).scripts;
  if (!scripts || typeof scripts !== "object") return [];

  const entries = Object.entries(scripts as Record<string, unknown>);
  return entries
    .filter(
      (entry): entry is [string, string] =>
        typeof entry[1] === "string" && entry[0].length > 0,
    )
    .map(([name, body]) => ({
      name,
      command: `${runner} ${runner === "npm" ? "run " : ""}${name}`.trim(),
      source: "package.json",
      kind: classifyScript(name),
      risk: classifyCommandRisk(body),
    }));
}

/** Pure helper, exported for tests. Cargo conventions are read-only or builds. */
export function suggestedCommandsFor(
  filenames: ReadonlySet<string>,
): DetectedScript[] {
  if (!filenames.has("Cargo.toml")) return [];
  return CARGO_SUGGESTED.map(({ name, kind }) => {
    const command = `cargo ${name}`;
    return {
      name: command,
      command,
      source: "Cargo.toml",
      kind,
      risk: classifyCommandRisk(command),
    };
  });
}

/** Pure helper, exported for tests. Detects frontend/runtime frameworks from a dep map. */
export function detectFrameworks(
  deps: ReadonlyArray<string>,
  hasCargoToml: boolean,
): string[] {
  const found = new Set<string>();
  for (const pattern of FRAMEWORK_PATTERNS) {
    if (depsContainAny(deps, pattern.match)) {
      found.add(pattern.name);
    }
  }
  if (hasCargoToml) found.add("rust");
  return Array.from(found);
}

/** Pure helper, exported for tests. Detects test frameworks from a dep map. */
export function detectTestFrameworks(deps: ReadonlyArray<string>): string[] {
  const found = new Set<string>();
  for (const pattern of TEST_FRAMEWORK_PATTERNS) {
    if (depsContainAny(deps, pattern.match)) {
      found.add(pattern.name);
    }
  }
  return Array.from(found);
}

function depsContainAny(
  deps: ReadonlyArray<string>,
  needles: ReadonlyArray<string>,
): boolean {
  return deps.some((dep) =>
    needles.some((needle) => {
      // Suffix `-` (e.g. "@tauri-apps/plugin-") signals a prefix match.
      if (needle.endsWith("-") || needle.endsWith("/")) {
        return dep.startsWith(needle);
      }
      return dep === needle || dep.startsWith(`${needle}/`);
    }),
  );
}

/** Pure helper, exported for tests. Returns a flat list of dependency names from package.json. */
export function extractDependencyNames(json: string): string[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return [];
  }
  if (!parsed || typeof parsed !== "object") return [];
  const obj = parsed as Record<string, unknown>;
  const names = new Set<string>();
  for (const field of ["dependencies", "devDependencies", "peerDependencies"]) {
    const map = obj[field];
    if (map && typeof map === "object") {
      for (const key of Object.keys(map as Record<string, unknown>)) {
        names.add(key);
      }
    }
  }
  return Array.from(names);
}

/** Pure helper, exported for tests. Subset of well-known doc files present in the workspace. */
export function detectDocumentationFiles(
  filenames: ReadonlySet<string>,
): string[] {
  return DOCUMENTATION_FILES.filter((name) => filenames.has(name));
}

function fileNameOf(entry: FileTreeEntry): string {
  return entry.name;
}

const EMPTY_DETECTION: ProjectDetection = {
  packageManager: null,
  manifests: [],
  scripts: [],
  suggested: [],
  frameworks: [],
  testFrameworks: [],
  documentationFiles: [],
};

export async function detectProject(
  workspacePath: string,
): Promise<ProjectDetection> {
  if (!workspacePath) return EMPTY_DETECTION;

  let entries: FileTreeEntry[] = [];
  try {
    entries = await listDirectoryEntries(workspacePath);
  } catch {
    return EMPTY_DETECTION;
  }

  const filenames = new Set(
    entries.filter((e) => e.kind === "file").map(fileNameOf),
  );

  const manifests = Array.from(MANIFEST_FILES).filter((name) =>
    filenames.has(name),
  );
  const packageManager = selectPackageManager(filenames);

  let scripts: DetectedScript[] = [];
  let dependencyNames: string[] = [];
  if (
    filenames.has("package.json") &&
    packageManager !== null &&
    (packageManager === "pnpm" ||
      packageManager === "npm" ||
      packageManager === "yarn" ||
      packageManager === "bun")
  ) {
    const manifestName: WorkspaceManifestName = "package.json";
    try {
      const json = await readWorkspaceManifest(workspacePath, manifestName);
      if (json) {
        scripts = parsePackageJsonScripts(json, packageManager);
        dependencyNames = extractDependencyNames(json);
      }
    } catch {
      // leave scripts/deps empty; widgets render their empty states.
    }
  }

  const frameworks = detectFrameworks(
    dependencyNames,
    filenames.has("Cargo.toml"),
  );
  const testFrameworks = detectTestFrameworks(dependencyNames);
  const documentationFiles = detectDocumentationFiles(filenames);
  const suggested = suggestedCommandsFor(filenames);

  return {
    packageManager,
    manifests,
    scripts,
    suggested,
    frameworks,
    testFrameworks,
    documentationFiles,
  };
}
