import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { invokeTauri, isTauriRuntimeAvailable } from "@/shared/api/tauri";

interface AgentSetupOutput {
  providerId: string;
  line: string;
}

export async function checkAgentInstalled(
  providerId: string,
): Promise<boolean> {
  if (!isTauriRuntimeAvailable()) {
    return false;
  }
  return invokeTauri("check_agent_installed", { providerId });
}

export async function checkAgentAuth(providerId: string): Promise<boolean> {
  if (!isTauriRuntimeAvailable()) {
    return false;
  }
  return invokeTauri("check_agent_auth", { providerId });
}

export async function installAgent(providerId: string): Promise<void> {
  return invokeTauri("install_agent", { providerId });
}

export async function authenticateAgent(providerId: string): Promise<void> {
  return invokeTauri("authenticate_agent", { providerId });
}

export function onAgentSetupOutput(
  providerId: string,
  callback: (line: string) => void,
): Promise<UnlistenFn> {
  if (!isTauriRuntimeAvailable()) {
    return Promise.resolve(async () => {});
  }
  return listen<AgentSetupOutput>("agent-setup:output", (event) => {
    if (event.payload.providerId === providerId) {
      callback(event.payload.line);
    }
  });
}
