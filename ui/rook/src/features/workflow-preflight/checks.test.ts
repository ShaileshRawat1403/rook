import { describe, expect, it } from "vitest";
import {
  checkArtifactDirectory,
  checkModuleValid,
  checkOutputContractKnown,
  checkProviderConfigured,
  checkProviderRuntime,
  checkRequiredInputs,
} from "./checks";
import type { SwarmRecipe } from "@/features/colony/swarm/types";
import type { WorkItem } from "@/features/work-items/types";

function makeRecipe(overrides: Partial<SwarmRecipe> = {}): SwarmRecipe {
  return {
    id: "test-module",
    name: "Test Module",
    version: "1.0.0",
    purpose: "Test fixture.",
    triggerExamples: [],
    riskLevel: "low",
    colonyMapping: {
      taskType: "planning",
      seats: ["Planner"],
      handoffs: [],
      evidenceRequired: false,
    },
    specialists: [
      {
        id: "fixture-specialist",
        label: "Fixture Specialist",
        role: "Fixture",
        skills: [],
        allowedContext: [],
        disallowedContext: [],
        taskPrompt: "fixture",
        outputContract: {
          format: "markdown",
          requiredSections: ["Purpose"],
          evidenceRequired: false,
          uncertaintyRequired: false,
        },
      },
    ],
    finalArtifact: {
      artifactType: "report",
      format: "markdown",
      requiredSections: ["Purpose", "Scope"],
      evidenceRequired: false,
      reviewerRequired: false,
    },
    reviewChecklist: [],
    nonGoals: [],
    ...overrides,
  };
}

function makeWorkItem(overrides: Partial<WorkItem> = {}): WorkItem {
  return {
    id: "wi-1",
    title: "Discovery Brief v0.1",
    source: "manual",
    description: "Scope the next workflow module.",
    acceptanceCriteria: [],
    createdAt: "2026-05-17T10:00:00.000Z",
    updatedAt: "2026-05-17T10:00:00.000Z",
    ...overrides,
  };
}

describe("checkProviderConfigured (C1)", () => {
  it("passes when at least one provider is configured", async () => {
    const result = await checkProviderConfigured({
      configuredProviders: ["anthropic"],
      localBinaryExists: false,
    });
    expect(result).toEqual({ id: "provider_configured", passed: true });
  });

  it("passes when no provider but local binary exists", async () => {
    const result = await checkProviderConfigured({
      configuredProviders: [],
      localBinaryExists: true,
    });
    expect(result.passed).toBe(true);
  });

  it("fails when neither provider nor local binary present", async () => {
    const result = await checkProviderConfigured({
      configuredProviders: [],
      localBinaryExists: false,
    });
    expect(result.passed).toBe(false);
    expect(result.reason).toContain("No execution provider");
    expect(result.recovery).toContain("Settings");
  });
});

describe("checkProviderRuntime (C2)", () => {
  it("passes for remote provider with credentials", async () => {
    const result = await checkProviderRuntime({
      selectedProvider: "remote",
      credentialsPresent: true,
      localBinaryExecutable: false,
      localBinaryPath: "/unused",
      remoteProviderName: "anthropic",
    });
    expect(result.passed).toBe(true);
  });

  it("fails for remote provider without credentials, naming the provider", async () => {
    const result = await checkProviderRuntime({
      selectedProvider: "remote",
      credentialsPresent: false,
      localBinaryExecutable: false,
      localBinaryPath: "/unused",
      remoteProviderName: "anthropic",
    });
    expect(result.passed).toBe(false);
    expect(result.recovery).toContain("anthropic");
  });

  it("passes for local runtime with executable binary", async () => {
    const result = await checkProviderRuntime({
      selectedProvider: "local",
      credentialsPresent: false,
      localBinaryExecutable: true,
      localBinaryPath: "/Users/x/target/debug/rook",
    });
    expect(result.passed).toBe(true);
  });

  it("fails for local runtime when binary missing, includes path in technical", async () => {
    const result = await checkProviderRuntime({
      selectedProvider: "local",
      credentialsPresent: false,
      localBinaryExecutable: false,
      localBinaryPath: "/Users/x/target/debug/rook",
    });
    expect(result.passed).toBe(false);
    expect(result.recovery).toContain("cargo build");
    expect(result.technical).toBe("/Users/x/target/debug/rook");
  });

  it("fails when no provider is selected", async () => {
    const result = await checkProviderRuntime({
      selectedProvider: "none",
      credentialsPresent: false,
      localBinaryExecutable: false,
      localBinaryPath: "/unused",
    });
    expect(result.passed).toBe(false);
    expect(result.reason).toContain("No provider");
  });
});

describe("checkArtifactDirectory (C3)", () => {
  it("passes when ensureDir reports ok", async () => {
    const result = await checkArtifactDirectory({
      artifactDirPath: "/tmp/artifacts",
      ensureDir: async () => ({ ok: true }),
    });
    expect(result.passed).toBe(true);
  });

  it("fails when ensureDir reports failure, surfaces error as technical", async () => {
    const result = await checkArtifactDirectory({
      artifactDirPath: "/tmp/artifacts",
      ensureDir: async () => ({ ok: false, error: "EACCES" }),
    });
    expect(result.passed).toBe(false);
    expect(result.recovery).toContain("permissions");
    expect(result.technical).toBe("EACCES");
  });

  it("uses the directory path as technical detail if ensureDir omits error", async () => {
    const result = await checkArtifactDirectory({
      artifactDirPath: "/tmp/artifacts",
      ensureDir: async () => ({ ok: false }),
    });
    expect(result.technical).toBe("/tmp/artifacts");
  });
});

describe("checkModuleValid (C4)", () => {
  it("passes for a recipe with specialists and required sections", async () => {
    const result = await checkModuleValid({
      moduleId: "test-module",
      recipe: makeRecipe(),
    });
    expect(result.passed).toBe(true);
  });

  it("fails when recipe is null, names the module id", async () => {
    const result = await checkModuleValid({
      moduleId: "missing-module",
      recipe: null,
    });
    expect(result.passed).toBe(false);
    expect(result.reason).toContain("missing-module");
  });

  it("fails when specialists array is empty", async () => {
    const result = await checkModuleValid({
      moduleId: "test-module",
      recipe: makeRecipe({ specialists: [] }),
    });
    expect(result.passed).toBe(false);
    expect(result.technical).toContain("specialists=false");
  });

  it("fails when finalArtifact has no requiredSections", async () => {
    const result = await checkModuleValid({
      moduleId: "test-module",
      recipe: makeRecipe({
        finalArtifact: {
          artifactType: "report",
          format: "markdown",
          requiredSections: [],
          evidenceRequired: false,
          reviewerRequired: false,
        },
      }),
    });
    expect(result.passed).toBe(false);
    expect(result.technical).toContain("requiredSections=false");
  });
});

describe("checkRequiredInputs (C5)", () => {
  it("passes when title and description are both present", async () => {
    const result = await checkRequiredInputs({
      workItem: makeWorkItem(),
    });
    expect(result.passed).toBe(true);
  });

  it("fails when no Work Item is attached", async () => {
    const result = await checkRequiredInputs({ workItem: null });
    expect(result.passed).toBe(false);
    expect(result.reason).toContain("No Work Item");
  });

  it("fails when description is missing, names the field", async () => {
    const result = await checkRequiredInputs({
      workItem: makeWorkItem({ description: undefined }),
    });
    expect(result.passed).toBe(false);
    expect(result.reason).toContain("description");
    expect(result.recovery).toContain("description");
  });

  it("fails when description is only whitespace", async () => {
    const result = await checkRequiredInputs({
      workItem: makeWorkItem({ description: "   " }),
    });
    expect(result.passed).toBe(false);
    expect(result.reason).toContain("description");
  });

  it("lists multiple missing fields together", async () => {
    const result = await checkRequiredInputs({
      workItem: makeWorkItem({ title: "", description: "" }),
    });
    expect(result.passed).toBe(false);
    expect(result.reason).toContain("title");
    expect(result.reason).toContain("description");
    expect(result.recovery).toContain("fields"); // plural
  });
});

describe("checkOutputContractKnown (C6)", () => {
  it("passes for recipe with artifactType and requiredSections", async () => {
    const result = await checkOutputContractKnown({ recipe: makeRecipe() });
    expect(result.passed).toBe(true);
  });

  it("fails when recipe is null", async () => {
    const result = await checkOutputContractKnown({ recipe: null });
    expect(result.passed).toBe(false);
    expect(result.reason).toContain("module did not load");
  });

  it("fails when finalArtifact has empty requiredSections", async () => {
    const result = await checkOutputContractKnown({
      recipe: makeRecipe({
        finalArtifact: {
          artifactType: "report",
          format: "markdown",
          requiredSections: [],
          evidenceRequired: false,
          reviewerRequired: false,
        },
      }),
    });
    expect(result.passed).toBe(false);
    expect(result.technical).toContain("requiredSections=false");
  });
});
