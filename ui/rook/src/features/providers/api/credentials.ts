import { invokeTauri, isTauriRuntimeAvailable } from "@/shared/api/tauri";
import type { ProviderFieldValue } from "@/shared/types/providers";

export interface ProviderStatus {
  providerId: string;
  isConfigured: boolean;
}

export async function getProviderConfig(
  providerId: string,
): Promise<ProviderFieldValue[]> {
  if (!isTauriRuntimeAvailable()) {
    return [];
  }
  return invokeTauri("get_provider_config", { providerId });
}

export async function saveProviderField(
  key: string,
  value: string,
): Promise<void> {
  return invokeTauri("save_provider_field", { key, value });
}

export async function deleteProviderConfig(providerId: string): Promise<void> {
  return invokeTauri("delete_provider_config", { providerId });
}

export async function checkAllProviderStatus(): Promise<ProviderStatus[]> {
  if (!isTauriRuntimeAvailable()) {
    return [];
  }
  return invokeTauri("check_all_provider_status");
}

export async function restartApp(): Promise<void> {
  return invokeTauri("restart_app");
}
