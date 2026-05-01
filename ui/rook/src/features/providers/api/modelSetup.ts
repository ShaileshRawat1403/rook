import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { invokeTauri, isTauriRuntimeAvailable } from "@/shared/api/tauri";

interface ModelSetupOutput {
  providerId: string;
  line: string;
}

export async function authenticateModelProvider(
  providerId: string,
  providerLabel: string,
): Promise<void> {
  return invokeTauri("authenticate_model_provider", {
    providerId,
    providerLabel,
  });
}

export function onModelSetupOutput(
  providerId: string,
  callback: (line: string) => void,
): Promise<UnlistenFn> {
  if (!isTauriRuntimeAvailable()) {
    return Promise.resolve(async () => {});
  }
  return listen<ModelSetupOutput>("model-setup:output", (event) => {
    if (event.payload.providerId === providerId) {
      callback(event.payload.line);
    }
  });
}
