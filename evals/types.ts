export interface Scenario {
  name: string;
  suite: string | string[];
  kind: "core_proof" | "policy" | "audit" | "prompt";
  input: string;
  expected?: Record<string, string>;
  expect?: Assertion[];
}

export interface Assertion {
  path: string;
  op: "equals" | "notEquals" | "startsWith" | "exists" | "includes" | "lengthEquals";
  value?: unknown;
}

export interface ScenarioResult {
  name: string;
  suite: string;
  passed: boolean;
  checks: Record<string, unknown>;
  error?: string;
}

export interface EvalReport {
  schema_version: string;
  suite: string;
  timestamp: string;
  total: number;
  passed: number;
  failed: number;
  results: ScenarioResult[];
}
