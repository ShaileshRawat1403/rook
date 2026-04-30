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

export type ScriptKind =
  | "dev"
  | "build"
  | "test"
  | "lint"
  | "format"
  | "other";

export interface DetectedScript {
  name: string;
  command: string;
  source: string;
  kind: ScriptKind;
}

export interface ProjectDetection {
  packageManager: PackageManager | null;
  manifests: string[];
  scripts: DetectedScript[];
  suggested: DetectedScript[];
}

const CARGO_SUGGESTED: ReadonlyArray<{ name: string; kind: ScriptKind }> = [
  { name: "check", kind: "lint" },
  { name: "test", kind: "test" },
  { name: "build", kind: "build" },
  { name: "run", kind: "dev" },
  { name: "fmt", kind: "format" },
  { name: "clippy", kind: "lint" },
];

/** Pure helper, exported for tests. */
export function suggestedCommandsFor(
  filenames: ReadonlySet<string>,
): DetectedScript[] {
  if (!filenames.has("Cargo.toml")) return [];
  return CARGO_SUGGESTED.map(({ name, kind }) => ({
    name: `cargo ${name}`,
    command: `cargo ${name}`,
    source: "Cargo.toml",
    kind,
  }));
}

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
export function selectPackageManager(filenames: ReadonlySet<string>): PackageManager | null {
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
    .map(([name]) => ({
      name,
      command: `${runner} ${runner === "npm" ? "run " : ""}${name}`.trim(),
      source: "package.json",
      kind: classifyScript(name),
    }));
}

function fileNameOf(entry: FileTreeEntry): string {
  return entry.name;
}

export async function detectProject(
  workspacePath: string,
): Promise<ProjectDetection> {
  if (!workspacePath) {
    return { packageManager: null, manifests: [], scripts: [], suggested: [] };
  }

  let entries: FileTreeEntry[] = [];
  try {
    entries = await listDirectoryEntries(workspacePath);
  } catch {
    return { packageManager: null, manifests: [], scripts: [], suggested: [] };
  }

  const filenames = new Set(
    entries.filter((e) => e.kind === "file").map(fileNameOf),
  );

  const manifests = Array.from(MANIFEST_FILES).filter((name) =>
    filenames.has(name),
  );
  const packageManager = selectPackageManager(filenames);

  let scripts: DetectedScript[] = [];
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
      }
    } catch {
      // leave scripts empty; widget renders the "no scripts" state.
    }
  }

  const suggested = suggestedCommandsFor(filenames);
  return { packageManager, manifests, scripts, suggested };
}
