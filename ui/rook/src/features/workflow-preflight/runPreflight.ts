// Preflight orchestrator. Runs all six checks from `checks.ts` against a
// single injected facts object and aggregates the result.
//
// The orchestrator does NOT gather facts itself — that is the job of the
// adapter (P5) that wires real settings, filesystem, and module/Work Item
// access. Keeping facts injected means this file stays unit-testable
// without filesystem, store, or Tauri dependencies.

import type { SwarmRecipe } from "@/features/colony/swarm/types";
import type { WorkItem } from "@/features/work-items/types";
import {
  checkArtifactDirectory,
  checkModuleValid,
  checkOutputContractKnown,
  checkProviderConfigured,
  checkProviderRuntime,
  checkRequiredInputs,
  type EnsureDirOutcome,
  type SelectedProvider,
} from "./checks";
import type { WorkflowPreflightResult } from "./types";

export type WorkflowPreflightFacts = {
  // C1 inputs
  configuredProviders: readonly string[];
  localBinaryExists: boolean;

  // C2 inputs
  selectedProvider: SelectedProvider;
  credentialsPresent: boolean;
  localBinaryExecutable: boolean;
  localBinaryPath: string;
  remoteProviderName?: string;

  // C3 inputs
  artifactDirPath: string;
  ensureArtifactDir: (path: string) => Promise<EnsureDirOutcome>;

  // C4 + C6 inputs
  moduleId: string;
  recipe: SwarmRecipe | null;

  // C5 inputs
  workItem: WorkItem | null;
};

export async function runPreflightFromFacts(
  facts: WorkflowPreflightFacts,
): Promise<WorkflowPreflightResult> {
  // Fire all six in parallel; Promise.all preserves input order in the
  // output array, so the C1 → C6 stability the banner relies on is
  // guaranteed without sequential awaits.
  const checks = await Promise.all([
    checkProviderConfigured({
      configuredProviders: facts.configuredProviders,
      localBinaryExists: facts.localBinaryExists,
    }),
    checkProviderRuntime({
      selectedProvider: facts.selectedProvider,
      credentialsPresent: facts.credentialsPresent,
      localBinaryExecutable: facts.localBinaryExecutable,
      localBinaryPath: facts.localBinaryPath,
      remoteProviderName: facts.remoteProviderName,
    }),
    checkArtifactDirectory({
      artifactDirPath: facts.artifactDirPath,
      ensureDir: facts.ensureArtifactDir,
    }),
    checkModuleValid({
      moduleId: facts.moduleId,
      recipe: facts.recipe,
    }),
    checkRequiredInputs({
      workItem: facts.workItem,
    }),
    checkOutputContractKnown({
      recipe: facts.recipe,
    }),
  ]);

  const ok = checks.every((check) => check.passed);

  return {
    schemaVersion: "0.1.0",
    ok,
    checks,
    ranAt: new Date().toISOString(),
  };
}
