import { invokeTauri, isTauriRuntimeAvailable } from "@/shared/api/tauri";

export interface SkillInfo {
  name: string;
  description: string;
  instructions: string;
  path: string;
}

export async function createSkill(
  name: string,
  description: string,
  instructions: string,
): Promise<void> {
  return invokeTauri("create_skill", { name, description, instructions });
}

export async function listSkills(): Promise<SkillInfo[]> {
  if (!isTauriRuntimeAvailable()) {
    return [];
  }
  return invokeTauri("list_skills");
}

export async function deleteSkill(name: string): Promise<void> {
  return invokeTauri("delete_skill", { name });
}

export async function updateSkill(
  name: string,
  description: string,
  instructions: string,
): Promise<SkillInfo> {
  return invokeTauri("update_skill", { name, description, instructions });
}

export async function exportSkill(
  name: string,
): Promise<{ json: string; filename: string }> {
  return invokeTauri("export_skill", { name });
}

export async function importSkills(
  fileBytes: number[],
  fileName: string,
): Promise<SkillInfo[]> {
  return invokeTauri("import_skills", {
    fileBytes: Array.from(fileBytes),
    fileName,
  });
}
