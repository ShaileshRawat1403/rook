import { useCallback } from "react";
import { invokeTauri, isTauriRuntimeAvailable } from "@/shared/api/tauri";

export interface PolicyDecision {
  allow: boolean;
  needsApproval: boolean;
  blockedReason: string | null;
}

export type OpenActionKind = "editor" | "terminal";

export function useOpenActionPolicy() {
  const evaluatePolicy = useCallback(
    async (
      workspacePath: string,
      targetPath: string,
      action: OpenActionKind,
    ): Promise<PolicyDecision> => {
      if (!isTauriRuntimeAvailable()) {
        return {
          allow: false,
          needsApproval: false,
          blockedReason: "Open actions are only available in the desktop app.",
        };
      }

      return invokeTauri<PolicyDecision>("evaluate_open_action_policy", {
        workspacePath,
        targetPath,
        action,
      });
    },
    [],
  );

  return { evaluatePolicy };
}
