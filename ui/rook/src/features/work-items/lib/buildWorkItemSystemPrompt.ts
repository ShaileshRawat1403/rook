import type { WorkItem } from "../types";

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function trimValue(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function buildWorkItemSystemPrompt(
  workItem: WorkItem | null | undefined,
): string | undefined {
  if (!workItem) return undefined;

  const lines: string[] = ["<work-item>"];
  lines.push(`  <source>${escapeXml(workItem.source)}</source>`);

  const key = trimValue(workItem.key);
  if (key) lines.push(`  <key>${escapeXml(key)}</key>`);

  lines.push(`  <title>${escapeXml(workItem.title)}</title>`);

  const url = trimValue(workItem.url);
  if (url) lines.push(`  <url>${escapeXml(url)}</url>`);

  const description = trimValue(workItem.description);
  if (description) {
    lines.push(`  <description>${escapeXml(description)}</description>`);
  }

  if (workItem.acceptanceCriteria.length > 0) {
    lines.push("  <acceptance-criteria>");
    for (const criterion of workItem.acceptanceCriteria) {
      const text = escapeXml(criterion.text);
      const id = escapeXml(criterion.id);
      const status = criterion.status
        ? ` status="${escapeXml(criterion.status)}"`
        : "";
      lines.push(`    <criterion id="${id}"${status}>${text}</criterion>`);
    }
    lines.push("  </acceptance-criteria>");
  }

  lines.push("</work-item>");
  return lines.join("\n");
}
