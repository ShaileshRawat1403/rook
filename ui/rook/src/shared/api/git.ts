import { invokeTauri, isTauriRuntimeAvailable } from "./tauri";
import type {
  ChangedFile,
  CreatedWorktree,
  GitState,
} from "@/shared/types/git";

function requireTauri(command: string): void {
  if (isTauriRuntimeAvailable()) {
    return;
  }

  throw new Error(`${command} is only available in the desktop app`);
}

export async function getGitState(path: string): Promise<GitState> {
  if (!isTauriRuntimeAvailable()) {
    return {
      isGitRepo: false,
      currentBranch: null,
      dirtyFileCount: 0,
      incomingCommitCount: 0,
      worktrees: [],
      isWorktree: false,
      mainWorktreePath: null,
      localBranches: [],
    };
  }
  return invokeTauri("get_git_state", { path });
}

export async function switchBranch(
  path: string,
  branch: string,
): Promise<void> {
  requireTauri("git_switch_branch");
  return invokeTauri("git_switch_branch", { path, branch });
}

export async function stashChanges(path: string): Promise<void> {
  requireTauri("git_stash");
  return invokeTauri("git_stash", { path });
}

export async function initRepo(path: string): Promise<void> {
  requireTauri("git_init");
  return invokeTauri("git_init", { path });
}

export async function fetchRepo(path: string): Promise<void> {
  requireTauri("git_fetch");
  return invokeTauri("git_fetch", { path });
}

export async function pullRepo(path: string): Promise<void> {
  requireTauri("git_pull");
  return invokeTauri("git_pull", { path });
}

export async function createBranch(
  path: string,
  name: string,
  baseBranch: string,
): Promise<void> {
  requireTauri("git_create_branch");
  return invokeTauri("git_create_branch", { path, name, baseBranch });
}

export async function getChangedFiles(path: string): Promise<ChangedFile[]> {
  if (!isTauriRuntimeAvailable()) {
    return [];
  }
  return invokeTauri("get_changed_files", { path });
}

export async function createWorktree(
  path: string,
  name: string,
  branch: string,
  createBranch: boolean,
  baseBranch?: string,
): Promise<CreatedWorktree> {
  requireTauri("git_create_worktree");
  return invokeTauri("git_create_worktree", {
    path,
    name,
    branch,
    createBranch,
    baseBranch,
  });
}
