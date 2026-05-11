import { invokeTauri } from "@/shared/api/tauri";
import type { VerificationReport } from "./types";

export async function verifySdlcRepo(
  repoRoot: string,
): Promise<VerificationReport> {
  return invokeTauri<VerificationReport>("verify_sdlc_repo", { repoRoot });
}
