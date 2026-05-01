import type { ChangedFile, GitState } from "@/shared/types/git";
import type {
  CommandRisk,
  DetectedScript,
  ProjectDetection,
} from "./detectProject";

export interface BuildContextPackInput {
  workspacePath: string | null;
  detection: ProjectDetection | undefined;
  gitState: GitState | undefined;
  changedFiles: ChangedFile[] | undefined;
}

const RISK_HEADINGS: Record<CommandRisk, string> = {
  safe: "Likely safe",
  review: "Review first",
  blocked: "Do not run blindly",
};

const RISK_ORDER: CommandRisk[] = ["safe", "review", "blocked"];

function joinOrPlaceholder(values: string[], placeholder = "—"): string {
  if (values.length === 0) return placeholder;
  return values.join(", ");
}

function sectionHeader(title: string): string {
  return `${title}\n${"-".repeat(title.length)}`;
}

function formatScriptLine(script: DetectedScript): string {
  return `  - ${script.command}`;
}

function groupByRisk(
  scripts: DetectedScript[],
): Map<CommandRisk, DetectedScript[]> {
  const grouped = new Map<CommandRisk, DetectedScript[]>();
  for (const risk of RISK_ORDER) grouped.set(risk, []);
  for (const script of scripts) {
    grouped.get(script.risk)?.push(script);
  }
  return grouped;
}

/**
 * Builds a copyable, human-readable summary of the workspace state. Pure
 * function — no IO, no side effects. The output explicitly states that no
 * commands were executed and no files were modified, so it is safe to paste
 * into prompts or notes.
 */
export function buildContextPack({
  workspacePath,
  detection,
  gitState,
  changedFiles,
}: BuildContextPackInput): string {
  const lines: string[] = [];

  lines.push("Workspace Context Pack");
  lines.push("Generated from read-only project metadata.");
  lines.push("No commands were executed. No files were modified.");
  lines.push("");

  lines.push(sectionHeader("Workspace"));
  lines.push(`  Path: ${workspacePath ?? "(not set)"}`);
  if (gitState?.isGitRepo) {
    lines.push(`  Branch: ${gitState.currentBranch ?? "(detached)"}`);
  } else {
    lines.push("  Git: not a repository");
  }
  if (changedFiles && changedFiles.length > 0) {
    const additions = changedFiles.reduce((acc, f) => acc + f.additions, 0);
    const deletions = changedFiles.reduce((acc, f) => acc + f.deletions, 0);
    lines.push(
      `  Changes: ${changedFiles.length} file(s) (+${additions} -${deletions})`,
    );
  } else {
    lines.push("  Changes: clean");
  }
  lines.push("");

  if (detection) {
    lines.push(sectionHeader("Stack"));
    lines.push(`  Frameworks: ${joinOrPlaceholder(detection.frameworks)}`);
    lines.push(
      `  Test frameworks: ${joinOrPlaceholder(detection.testFrameworks)}`,
    );
    lines.push(`  Package manager: ${detection.packageManager ?? "unknown"}`);
    lines.push(`  Manifests: ${joinOrPlaceholder(detection.manifests)}`);
    lines.push(
      `  Documentation: ${joinOrPlaceholder(detection.documentationFiles)}`,
    );
    lines.push("");

    const allScripts = [...detection.scripts, ...detection.suggested];
    if (allScripts.length > 0) {
      lines.push(sectionHeader("Commands by risk (advisory)"));
      const grouped = groupByRisk(allScripts);
      for (const risk of RISK_ORDER) {
        const items = grouped.get(risk) ?? [];
        if (items.length === 0) continue;
        lines.push(`  ${RISK_HEADINGS[risk]}:`);
        for (const item of items) lines.push(formatScriptLine(item));
      }
      lines.push("");
    }
  }

  lines.push(sectionHeader("Trust boundary"));
  lines.push("  Rook does not run commands or modify files in this slice.");
  lines.push("  Risk labels are classifications, not approvals.");

  return lines.join("\n");
}
