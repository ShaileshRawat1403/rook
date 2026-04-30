/**
 * Joins a workspace root with a relative path using the root's separator
 * style. A root containing `\` and no `/` keeps backslashes; everything
 * else uses forward slashes. Redundant separators at the join point are
 * collapsed and a leading `./` on the relative segment is trimmed.
 *
 * This is a frontend-only helper for display and for handing paths to
 * Tauri/system openers. Final canonicalization belongs in the backend.
 */
export function pathJoin(root: string, relative: string): string {
  if (!root) return relative;
  if (!relative) return root;

  const sep = root.includes("\\") && !root.includes("/") ? "\\" : "/";
  const trimmedRoot = stripTrailingSeparators(root);
  const trimmedRelative = stripLeadingSeparators(stripLeadingDotSlash(relative));
  if (!trimmedRelative) return trimmedRoot;
  const lastChar = trimmedRoot[trimmedRoot.length - 1];
  const rootEndsWithSeparator = lastChar === "/" || lastChar === "\\";
  return rootEndsWithSeparator
    ? `${trimmedRoot}${trimmedRelative}`
    : `${trimmedRoot}${sep}${trimmedRelative}`;
}

function stripTrailingSeparators(value: string): string {
  let end = value.length;
  while (end > 0 && (value[end - 1] === "/" || value[end - 1] === "\\")) {
    if (end === 1) break;
    if (end === 3 && /^[a-zA-Z]:[\\/]$/.test(value)) break;
    end -= 1;
  }
  return value.slice(0, end);
}

function stripLeadingSeparators(value: string): string {
  let start = 0;
  while (
    start < value.length &&
    (value[start] === "/" || value[start] === "\\")
  ) {
    start += 1;
  }
  return value.slice(start);
}

function stripLeadingDotSlash(value: string): string {
  if (value.startsWith("./") || value.startsWith(".\\")) {
    return value.slice(2);
  }
  return value;
}
