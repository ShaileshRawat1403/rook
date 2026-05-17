import { describe, expect, it } from "vitest";
import { runPreflightFromFacts, type WorkflowPreflightFacts } from "./runPreflight";
import type { PreflightCheckId } from "./types";
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

function makePassingFacts(
  overrides: Partial<WorkflowPreflightFacts> = {},
): WorkflowPreflightFacts {
  return {
    configuredProviders: ["anthropic"],
    localBinaryExists: true,

    selectedProvider: "remote",
    credentialsPresent: true,
    localBinaryExecutable: false,
    localBinaryPath: "/unused",
    remoteProviderName: "anthropic",

    artifactDirPath: "/tmp/artifacts",
    ensureArtifactDir: async () => ({ ok: true }),

    moduleId: "test-module",
    recipe: makeRecipe(),

    workItem: makeWorkItem(),
    ...overrides,
  };
}

const EXPECTED_ORDER: readonly PreflightCheckId[] = [
  "provider_configured",
  "provider_runtime",
  "artifact_directory",
  "module_valid",
  "required_inputs",
  "output_contract_known",
];

describe("runPreflightFromFacts", () => {
  it("returns ok=true when every check passes", async () => {
    const result = await runPreflightFromFacts(makePassingFacts());

    expect(result.ok).toBe(true);
    expect(result.checks).toHaveLength(6);
    expect(result.checks.every((check) => check.passed)).toBe(true);
  });

  it("returns schemaVersion 0.1.0 and a valid ISO timestamp", async () => {
    const before = Date.now();
    const result = await runPreflightFromFacts(makePassingFacts());
    const after = Date.now();

    expect(result.schemaVersion).toBe("0.1.0");

    const parsed = Date.parse(result.ranAt);
    expect(Number.isFinite(parsed)).toBe(true);
    expect(parsed).toBeGreaterThanOrEqual(before);
    expect(parsed).toBeLessThanOrEqual(after);
  });

  it("preserves the C1 → C6 check order", async () => {
    const result = await runPreflightFromFacts(makePassingFacts());

    expect(result.checks.map((check) => check.id)).toEqual(EXPECTED_ORDER);
  });

  it("runs all six checks even when C1 fails — no short-circuit", async () => {
    // C1 fails: no provider configured AND no local binary.
    const result = await runPreflightFromFacts(
      makePassingFacts({
        configuredProviders: [],
        localBinaryExists: false,
      }),
    );

    expect(result.ok).toBe(false);
    expect(result.checks).toHaveLength(6);
    expect(result.checks.map((check) => check.id)).toEqual(EXPECTED_ORDER);

    const c1 = result.checks.find(
      (check) => check.id === "provider_configured",
    );
    expect(c1?.passed).toBe(false);

    // Every other check still ran and reported its result (most still
    // pass on the otherwise-healthy fixture). The point is the array
    // has all six entries — preflight reports complete state.
    const passedCount = result.checks.filter((check) => check.passed).length;
    expect(passedCount).toBeGreaterThanOrEqual(4);
  });

  it("aggregates multiple failures without dropping checks", async () => {
    // C1, C3, C5 all fail; C2/C4/C6 still pass.
    const result = await runPreflightFromFacts(
      makePassingFacts({
        configuredProviders: [],
        localBinaryExists: false,
        ensureArtifactDir: async () => ({ ok: false, error: "EACCES" }),
        workItem: makeWorkItem({ description: undefined }),
      }),
    );

    expect(result.ok).toBe(false);
    expect(result.checks).toHaveLength(6);

    const failed = result.checks.filter((check) => !check.passed);
    expect(failed.map((check) => check.id).sort()).toEqual(
      ["artifact_directory", "provider_configured", "required_inputs"].sort(),
    );
  });

  it("reports module_valid + output_contract_known failures when recipe is null", async () => {
    const result = await runPreflightFromFacts(
      makePassingFacts({ recipe: null }),
    );

    expect(result.ok).toBe(false);

    const c4 = result.checks.find((check) => check.id === "module_valid");
    const c6 = result.checks.find(
      (check) => check.id === "output_contract_known",
    );
    expect(c4?.passed).toBe(false);
    expect(c6?.passed).toBe(false);
  });
});
