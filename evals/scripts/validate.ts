import { z } from "zod";

export const AssertionSchema = z.object({
  path: z.string(),
  op: z.enum(["equals", "notEquals", "startsWith", "exists", "includes", "lengthEquals"]),
  value: z.unknown().optional(),
});

export const ScenarioSchema = z.object({
  name: z.string(),
  suite: z.union([z.string(), z.array(z.string())]),
  kind: z.enum(["core_proof", "policy", "audit"]),
  input: z.string(),
  expected: z.record(z.string(), z.string()).optional(),
  expect: z.array(AssertionSchema).optional(),
}).refine(data => data.expected || data.expect, {
  message: "Either 'expected' or 'expect' must be provided",
});

export function validateScenario(scenario: unknown): scenario is import("./types.js").Scenario {
  try {
    ScenarioSchema.parse(scenario);
    return true;
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("Invalid scenario:", error.errors);
    }
    return false;
  }
}

export function validateScenarios(scenarios: unknown[]): import("./types.js").Scenario[] {
  const valid: import("./types.js").Scenario[] = [];
  for (const [index, scenario] of scenarios.entries()) {
    try {
      ScenarioSchema.parse(scenario);
      valid.push(scenario as import("./types.js").Scenario);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error(`Invalid scenario at index ${index}:`, error.errors);
      }
    }
  }
  return valid;
}
