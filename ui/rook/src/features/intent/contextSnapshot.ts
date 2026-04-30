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

function attachmentLooksLikePrd(attachment: ChatAttachmentDraft): boolean {
  const name = attachment.name.toLowerCase();
  return (
    name.includes("prd") ||
    name.includes("requirements") ||
    name.includes("spec")
  );
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
    hasPrdReview: false,
    hasJiraIssue,
    activePersonaId,
    selectedProvider,
    selectedModel,
    isStreaming,
  };
}
