import type { ColonyHandoff } from "./types";

export type ContextLoad = "light" | "medium" | "heavy";

export function getContextLoad(
  handoff: ColonyHandoff,
  handoffsForTask: ColonyHandoff[] = [],
): ContextLoad {
  let score = 0;

  const summaryLength = handoff.summary.trim().length;
  const reviewNoteLength = handoff.reviewNote?.trim().length ?? 0;

  if (summaryLength > 500) score += 1;
  if (summaryLength > 1200) score += 1;
  if (handoff.taskId) score += 1;
  if (reviewNoteLength > 200) score += 1;
  if (handoffsForTask.length >= 2) score += 1;
  if (handoffsForTask.length >= 4) score += 1;

  if (score <= 1) return "light";
  if (score <= 3) return "medium";
  return "heavy";
}

export const CONTEXT_LOAD_LABELS: Record<ContextLoad, string> = {
  light: "Light",
  medium: "Medium",
  heavy: "Heavy",
};

export const CONTEXT_LOAD_CLASSES: Record<ContextLoad, string> = {
  light: "bg-muted text-muted-foreground",
  medium: "bg-blue-500 text-white",
  heavy: "bg-amber-500 text-white",
};