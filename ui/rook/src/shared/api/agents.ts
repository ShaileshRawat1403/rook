import { invokeTauri, isTauriRuntimeAvailable } from "./tauri";
import type {
  Persona,
  CreatePersonaRequest,
  UpdatePersonaRequest,
} from "@/shared/types/agents";

export async function listPersonas(): Promise<Persona[]> {
  if (!isTauriRuntimeAvailable()) {
    return [];
  }
  return invokeTauri("list_personas");
}

export async function createPersona(
  request: CreatePersonaRequest,
): Promise<Persona> {
  return invokeTauri("create_persona", { request });
}

export async function updatePersona(
  id: string,
  request: UpdatePersonaRequest,
): Promise<Persona> {
  return invokeTauri("update_persona", { id, request });
}

export async function deletePersona(id: string): Promise<void> {
  return invokeTauri("delete_persona", { id });
}

export async function refreshPersonas(): Promise<Persona[]> {
  if (!isTauriRuntimeAvailable()) {
    return [];
  }
  return invokeTauri("refresh_personas");
}

export interface ExportResult {
  json: string;
  suggestedFilename: string;
}

export async function exportPersona(id: string): Promise<ExportResult> {
  return invokeTauri("export_persona", { id });
}

export async function importPersonas(
  fileBytes: number[],
  fileName: string,
): Promise<Persona[]> {
  return invokeTauri("import_personas", { fileBytes, fileName });
}

export async function savePersonaAvatar(
  personaId: string,
  sourcePath: string,
): Promise<string> {
  return invokeTauri("save_persona_avatar", { personaId, sourcePath });
}

export async function savePersonaAvatarBytes(
  personaId: string,
  bytes: number[],
  extension: string,
): Promise<string> {
  return invokeTauri("save_persona_avatar_bytes", { personaId, bytes, extension });
}

export async function getAvatarsDir(): Promise<string> {
  return invokeTauri("get_avatars_dir");
}
