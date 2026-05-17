// Pure preflight check functions. Each maps to one PreflightCheckId.
//
// Every check receives the facts it needs as input — no module imports
// global state, no filesystem read, no network call. The orchestrator
// (P3) gathers facts and passes them in. C3 takes its filesystem effect
// as an injected callback so the check itself stays testable with a
// stubbed ensure function.
//
// Failure messages and recovery copy mirror WORKFLOW_PREFLIGHT_V0_1.md
// per check. Keep them in sync if the scope-lock changes.

import type { SwarmRecipe } from "@/features/colony/swarm/types";
import type { WorkItem } from "@/features/work-items/types";
import type {
  PreflightCheckResult,
} from "./types";

// ---------- C1 — provider_configured ----------

export type CheckProviderConfiguredInput = {
  configuredProviders: readonly string[];
  localBinaryExists: boolean;
};

export async function checkProviderConfigured(
  input: CheckProviderConfiguredInput,
): Promise<PreflightCheckResult> {
  const passed =
    input.configuredProviders.length > 0 || input.localBinaryExists;

  if (passed) {
    return { id: "provider_configured", passed: true };
  }

  return {
    id: "provider_configured",
    passed: false,
    reason: "No execution provider is configured.",
    recovery:
      "Choose a model provider in Settings, or rebuild the local Rook runtime.",
  };
}

// ---------- C2 — provider_runtime ----------

export type SelectedProvider = "local" | "remote" | "none";

export type CheckProviderRuntimeInput = {
  selectedProvider: SelectedProvider;
  // Only consulted when selectedProvider === "remote".
  credentialsPresent: boolean;
  // Only consulted when selectedProvider === "local".
  localBinaryExecutable: boolean;
  // Path included as `technical` detail on local failure.
  localBinaryPath: string;
  // Identifier included in recovery copy on remote failure.
  remoteProviderName?: string;
};

export async function checkProviderRuntime(
  input: CheckProviderRuntimeInput,
): Promise<PreflightCheckResult> {
  if (input.selectedProvider === "none") {
    return {
      id: "provider_runtime",
      passed: false,
      reason: "No provider is selected.",
      recovery: "Choose a model provider in Settings.",
    };
  }

  if (input.selectedProvider === "remote") {
    if (input.credentialsPresent) {
      return { id: "provider_runtime", passed: true };
    }
    const provider = input.remoteProviderName ?? "the selected provider";
    return {
      id: "provider_runtime",
      passed: false,
      reason: `Credentials for ${provider} are not configured.`,
      recovery: `Add credentials for ${provider} in Settings.`,
    };
  }

  // Local runtime.
  if (input.localBinaryExecutable) {
    return { id: "provider_runtime", passed: true };
  }

  return {
    id: "provider_runtime",
    passed: false,
    reason: "The local Rook runtime is missing or not executable.",
    recovery:
      "Rebuild the local Rook runtime: `cargo build --bin rook` from the project root.",
    technical: input.localBinaryPath,
  };
}

// ---------- C3 — artifact_directory ----------

export type EnsureDirOutcome = { ok: boolean; error?: string };

export type CheckArtifactDirectoryInput = {
  artifactDirPath: string;
  // Inject the filesystem effect. Real impl creates the directory if
  // missing; tests pass a stub that returns the desired outcome.
  ensureDir: (path: string) => Promise<EnsureDirOutcome>;
};

export async function checkArtifactDirectory(
  input: CheckArtifactDirectoryInput,
): Promise<PreflightCheckResult> {
  const outcome = await input.ensureDir(input.artifactDirPath);

  if (outcome.ok) {
    return { id: "artifact_directory", passed: true };
  }

  return {
    id: "artifact_directory",
    passed: false,
    reason: "Rook couldn't access its artifact directory.",
    recovery: "Check permissions on `~/.rook/`.",
    technical: outcome.error ?? input.artifactDirPath,
  };
}

// ---------- C4 — module_valid ----------

export type CheckModuleValidInput = {
  moduleId: string;
  // null when the orchestrator could not load the recipe at all.
  recipe: SwarmRecipe | null;
};

export async function checkModuleValid(
  input: CheckModuleValidInput,
): Promise<PreflightCheckResult> {
  if (!input.recipe) {
    return {
      id: "module_valid",
      passed: false,
      reason: `Workflow module "${input.moduleId}" could not be loaded.`,
      recovery: "Pick a different module.",
    };
  }

  const hasSpecialists =
    Array.isArray(input.recipe.specialists) &&
    input.recipe.specialists.length > 0;
  const hasFinalArtifact =
    input.recipe.finalArtifact !== undefined &&
    input.recipe.finalArtifact !== null;
  const hasRequiredSections =
    hasFinalArtifact &&
    Array.isArray(input.recipe.finalArtifact.requiredSections) &&
    input.recipe.finalArtifact.requiredSections.length > 0;

  if (hasSpecialists && hasRequiredSections) {
    return { id: "module_valid", passed: true };
  }

  return {
    id: "module_valid",
    passed: false,
    reason: "This workflow module is incomplete.",
    recovery: "Pick a different module.",
    technical: `specialists=${hasSpecialists}, requiredSections=${hasRequiredSections}`,
  };
}

// ---------- C5 — required_inputs ----------

export type CheckRequiredInputsInput = {
  // null when no Work Item is attached to the Colony.
  workItem: WorkItem | null;
};

export async function checkRequiredInputs(
  input: CheckRequiredInputsInput,
): Promise<PreflightCheckResult> {
  if (!input.workItem) {
    return {
      id: "required_inputs",
      passed: false,
      reason: "No Work Item is attached to this workflow.",
      recovery: "Attach a Work Item before starting the workflow.",
    };
  }

  const missing: string[] = [];
  if (!input.workItem.title || input.workItem.title.trim() === "") {
    missing.push("title");
  }
  // Description is read from WorkItem.description ONLY (per scope-lock
  // v0.1.1). Do not fall back to Colony memory or project summary.
  if (
    !input.workItem.description ||
    input.workItem.description.trim() === ""
  ) {
    missing.push("description");
  }

  if (missing.length === 0) {
    return { id: "required_inputs", passed: true };
  }

  return {
    id: "required_inputs",
    passed: false,
    reason: `This workflow needs more input. Missing: ${missing.join(", ")}.`,
    recovery: `Fill in the missing field${missing.length > 1 ? "s" : ""} on the Work Item: ${missing.join(", ")}.`,
  };
}

// ---------- C6 — output_contract_known ----------

export type CheckOutputContractKnownInput = {
  recipe: SwarmRecipe | null;
};

export async function checkOutputContractKnown(
  input: CheckOutputContractKnownInput,
): Promise<PreflightCheckResult> {
  if (!input.recipe) {
    return {
      id: "output_contract_known",
      passed: false,
      reason: "Output contract cannot be read — module did not load.",
      recovery: "Pick a different module.",
    };
  }

  const finalArtifact = input.recipe.finalArtifact;
  const hasArtifactType =
    finalArtifact !== undefined &&
    finalArtifact !== null &&
    typeof finalArtifact.artifactType === "string" &&
    finalArtifact.artifactType.length > 0;
  const hasRequiredSections =
    finalArtifact !== undefined &&
    finalArtifact !== null &&
    Array.isArray(finalArtifact.requiredSections) &&
    finalArtifact.requiredSections.length > 0;

  if (hasArtifactType && hasRequiredSections) {
    return { id: "output_contract_known", passed: true };
  }

  return {
    id: "output_contract_known",
    passed: false,
    reason: "This workflow doesn't declare what it produces.",
    recovery: "Pick a different module.",
    technical: `artifactType=${hasArtifactType}, requiredSections=${hasRequiredSections}`,
  };
}
