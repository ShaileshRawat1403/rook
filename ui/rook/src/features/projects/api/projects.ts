import { invokeTauri, isTauriRuntimeAvailable } from "@/shared/api/tauri";

export interface ProjectInfo {
  id: string;
  name: string;
  description: string;
  prompt: string;
  icon: string;
  color: string;
  preferredProvider: string | null;
  preferredModel: string | null;
  workingDirs: string[];
  useWorktrees: boolean;
  order: number;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  artifactsDir: string;
}

export async function listProjects(): Promise<ProjectInfo[]> {
  if (!isTauriRuntimeAvailable()) {
    return [];
  }
  return invokeTauri("list_projects");
}

export async function createProject(
  name: string,
  description: string,
  prompt: string,
  icon: string,
  color: string,
  preferredProvider: string | null,
  preferredModel: string | null,
  workingDirs: string[],
  useWorktrees: boolean,
): Promise<ProjectInfo> {
  return invokeTauri("create_project", {
    name,
    description,
    prompt,
    icon,
    color,
    preferredProvider,
    preferredModel,
    workingDirs,
    useWorktrees,
  });
}

export async function updateProject(
  id: string,
  name: string,
  description: string,
  prompt: string,
  icon: string,
  color: string,
  preferredProvider: string | null,
  preferredModel: string | null,
  workingDirs: string[],
  useWorktrees: boolean,
): Promise<ProjectInfo> {
  return invokeTauri("update_project", {
    id,
    name,
    description,
    prompt,
    icon,
    color,
    preferredProvider,
    preferredModel,
    workingDirs,
    useWorktrees,
  });
}

export async function deleteProject(id: string): Promise<void> {
  return invokeTauri("delete_project", { id });
}

export async function getProject(id: string): Promise<ProjectInfo> {
  return invokeTauri("get_project", { id });
}

export async function listArchivedProjects(): Promise<ProjectInfo[]> {
  if (!isTauriRuntimeAvailable()) {
    return [];
  }
  return invokeTauri("list_archived_projects");
}

export async function archiveProject(id: string): Promise<void> {
  return invokeTauri("archive_project", { id });
}

export async function reorderProjects(
  order: [string, number][],
): Promise<void> {
  return invokeTauri("reorder_projects", { order });
}

export async function restoreProject(id: string): Promise<void> {
  return invokeTauri("restore_project", { id });
}
