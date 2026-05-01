import type { ChatAttachmentDraft } from "@/shared/types/messages";

export interface RookContextSnapshot {
  sessionId: string;

  hasProject: boolean;
  projectId?: string;
  projectName?: string;

  workingDirs: string[];
  hasWorkingDirectory: boolean;

  hasGitRepo?: boolean;
  currentBranch?: string | null;
  hasChangedFiles?: boolean;

  hasAttachments: boolean;
  attachmentKinds: Array<"file" | "folder" | "image" | "unknown">;

  hasWorkItem: boolean;
  hasPrd: boolean;
  hasPrdReview: boolean;
  hasJiraIssue: boolean;

  activePersonaId?: string | null;
  selectedProvider?: string;
  selectedModel?: string | null;

  isStreaming: boolean;
}

interface SnapshotProject {
  id?: string | null;
  name?: string | null;
  workingDirs?: string[];
}

interface SnapshotGitState {
  isGitRepo?: boolean;
  currentBranch?: string | null;
  dirtyFileCount?: number;
}

interface BuildContextSnapshotInput {
  sessionId: string;
  project?: SnapshotProject | null;
  activeWorkspace?: { path: string; branch: string | null } | null;
  attachments?: ChatAttachmentDraft[];
  gitState?: SnapshotGitState | null;
  changedFiles?: unknown[] | null;
  activePersonaId?: string | null;
  selectedProvider?: string;
  selectedModel?: string | null;
  isStreaming: boolean;
}

function attachmentKind(
  attachment: ChatAttachmentDraft,
): RookContextSnapshot["attachmentKinds"][number] {
  if (attachment.kind === "directory") return "folder";
  if (attachment.kind === "file") return "file";
  if (attachment.kind === "image") return "image";
  return "unknown";
}

// Word-boundary match avoids false positives like "specimen.txt" → "spec"
// or "prdx-config.json" → "prd". `\b` triggers between word and non-word
// characters, so common separators (`.`, `-`, `_`, `/`, whitespace) all
// count as boundaries while embedded matches do not.
const PRD_FILENAME_RE = /\b(prd|prds|requirements|spec|specs)\b/;

function attachmentLooksLikePrd(attachment: ChatAttachmentDraft): boolean {
  return PRD_FILENAME_RE.test(attachment.name.toLowerCase());
}

function attachmentLooksLikeJira(attachment: ChatAttachmentDraft): boolean {
  return /\b[A-Z][A-Z0-9]+-\d+\b/.test(attachment.name);
}

export function buildContextSnapshot({
  sessionId,
  project,
  activeWorkspace,
  attachments = [],
  gitState,
  changedFiles,
  activePersonaId,
  selectedProvider,
  selectedModel,
  isStreaming,
}: BuildContextSnapshotInput): RookContextSnapshot {
  const projectWorkingDirs = project?.workingDirs ?? [];
  const workingDirs = [
    ...(activeWorkspace?.path ? [activeWorkspace.path] : []),
    ...projectWorkingDirs,
    ...attachments
      .filter((attachment) => attachment.kind === "directory")
      .map((attachment) => attachment.path),
  ];
  const uniqueWorkingDirs = [...new Set(workingDirs.filter(Boolean))];
  const hasPrd = attachments.some(attachmentLooksLikePrd);
  const hasJiraIssue = attachments.some(attachmentLooksLikeJira);

  return {
    sessionId,
    hasProject: Boolean(project?.id),
    projectId: project?.id ?? undefined,
    projectName: project?.name ?? undefined,
    workingDirs: uniqueWorkingDirs,
    hasWorkingDirectory: uniqueWorkingDirs.length > 0,
    hasGitRepo:
      gitState?.isGitRepo ?? Boolean(activeWorkspace?.branch ?? undefined),
    currentBranch: gitState?.currentBranch ?? activeWorkspace?.branch ?? null,
    hasChangedFiles:
      (changedFiles?.length ?? 0) > 0 || (gitState?.dirtyFileCount ?? 0) > 0,
    hasAttachments: attachments.length > 0,
    attachmentKinds: [...new Set(attachments.map(attachmentKind))],
    hasWorkItem: hasPrd || hasJiraIssue,
    hasPrd,
    // TODO(slice-prd-readiness): wire from a future PRD readiness review.
    // Today this is hard-coded false, which keeps planning mode in
    // safe_draft posture. Lifting this gate is the precondition for the
    // planning bucket to upgrade to "ready" / "direct".
    hasPrdReview: false,
    hasJiraIssue,
    activePersonaId,
    selectedProvider,
    selectedModel,
    isStreaming,
  };
}
