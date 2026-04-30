import type { RookContextSnapshot } from "../contextSnapshot";

export function context(
  overrides: Partial<RookContextSnapshot> = {},
): RookContextSnapshot {
  return {
    sessionId: "session-1",
    hasProject: false,
    workingDirs: [],
    hasWorkingDirectory: false,
    hasGitRepo: false,
    currentBranch: null,
    hasChangedFiles: false,
    hasAttachments: false,
    attachmentKinds: [],
    hasWorkItem: false,
    hasPrd: false,
    hasPrdReview: false,
    hasJiraIssue: false,
    activePersonaId: null,
    selectedProvider: "rook",
    selectedModel: null,
    isStreaming: false,
    ...overrides,
  };
}
