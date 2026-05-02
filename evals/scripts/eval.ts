import { readdir, readFile, writeFile } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { Scenario, Assertion, ScenarioResult, EvalReport } from "./types.js";
import { z } from "zod";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Scenario schema validation
const AssertionSchema = z.object({
  path: z.string(),
  op: z.enum(["equals", "notEquals", "startsWith", "exists", "includes", "lengthEquals"]),
  value: z.unknown().optional(),
});

const ScenarioSchema = z.object({
  name: z.string(),
  suite: z.union([z.string(), z.array(z.string())]),
  kind: z.enum(["core_proof", "policy", "audit", "prompt"]),
  input: z.string(),
  expected: z.record(z.string(), z.string()).optional(),
  expect: z.array(AssertionSchema).optional(),
}).refine(data => data.expected || data.expect, {
  message: "Either 'expected' or 'expect' must be provided",
});

function validateScenario(scenario: unknown): scenario is Scenario {
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

async function loadScenarios(suite?: string): Promise<Scenario[]> {
  const scenariosDir = join(__dirname, "../scenarios");
  const files = await readdir(scenariosDir);
  const scenarios: Scenario[] = [];

  for (const file of files) {
    if (!file.endsWith(".json")) continue;
    const content = await readFile(join(scenariosDir, file), "utf-8");
    const scenario: unknown = JSON.parse(content);

    if (!validateScenario(scenario)) {
      console.error(`Skipping invalid scenario: ${file}`);
      continue;
    }

    if (suite && !matchSuite(scenario.suite, suite)) continue;
    scenarios.push(scenario as Scenario);
  }

  return scenarios;
}

function matchSuite(suiteField: string | string[], target: string): boolean {
  if (typeof suiteField === "string") return suiteField === target;
  return suiteField.includes(target);
}

function assert(assertion: Assertion, result: Record<string, unknown>): boolean {
  const actual = getNestedValue(result, assertion.path);

  switch (assertion.op) {
    case "equals":
      return actual === assertion.value;
    case "notEquals":
      return actual !== assertion.value;
    case "startsWith":
      return typeof actual === "string" && typeof assertion.value === "string" &&
        actual.startsWith(assertion.value as string);
    case "exists":
      return actual !== undefined && actual !== null;
    case "includes":
      if (typeof actual === "string" && Array.isArray(assertion.value)) {
        return assertion.value.every(v => actual.includes(String(v)));
      }
      return Array.isArray(actual) && Array.isArray(assertion.value) &&
        (assertion.value as unknown[]).every(v => (actual as unknown[]).includes(v));
    case "lengthEquals":
      return Array.isArray(actual) && actual.length === assertion.value;
    default:
      return false;
  }
}

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const keys = path.split(".");
  let current: unknown = obj;
  for (const key of keys) {
    if (current && typeof current === "object") {
      current = (current as Record<string, unknown>)[key];
    } else {
      return undefined;
    }
  }
  return current;
}

async function runScenario(scenario: Scenario): Promise<ScenarioResult> {
  const checks: Record<string, unknown> = {};
  let passed = true;

  try {
    // Load fixture
    const fixture = await loadFixture(scenario.input);

    // Dispatch by kind
    const result = await dispatch(scenario.kind, fixture);

    // Check expected (legacy) or expect (new)
    if (scenario.expect) {
      for (const assertion of scenario.expect) {
        checks[assertion.path] = assert(assertion, result);
        if (!checks[assertion.path]) {
          passed = false;
        }
      }
    } else if (scenario.expected) {
      for (const [key, value] of Object.entries(scenario.expected)) {
        const actual = getNestedValue(result, key);
        checks[key] = typeof value === "string" && value.endsWith(":") ?
          typeof actual === "string" && actual.startsWith(value) :
          actual === value;
        if (!checks[key]) passed = false;
      }
    }

    return { name: scenario.name, suite: Array.isArray(scenario.suite) ? scenario.suite[0] : scenario.suite, passed, checks };
  } catch (error) {
    return { name: scenario.name, suite: Array.isArray(scenario.suite) ? scenario.suite[0] : scenario.suite, passed: false, checks: {}, error: String(error) };
  }
}

async function loadFixture(path: string): Promise<unknown> {
  const fullPath = join(__dirname, "../fixtures", path);
  const content = await readFile(fullPath, "utf-8");
  return JSON.parse(content);
}

async function dispatch(kind: string, fixture: unknown): Promise<Record<string, unknown>> {
  switch (kind) {
    case "core_proof":
      return runCoreProof(fixture);
    case "policy":
      return runPolicy(fixture);
    case "audit":
      return runAudit(fixture);
    case "prompt":
      return runPrompt(fixture);
    default:
      throw new Error(`Unknown scenario kind: ${kind}`);
  }
}

async function runPrompt(fixture: unknown): Promise<Record<string, unknown>> {
  const { prompt, max_tokens, provider } = fixture as { prompt: string; max_tokens?: number; provider?: string };
  const providerFlag = provider ? `--provider ${provider}` : "";
  const maxTokensFlag = max_tokens ? `--max-tokens ${max_tokens}` : "";
  
  // Execute the rook CLI. Ensure it is built beforehand.
  try {
    const { stdout, stderr } = await execAsync(`cargo run -q -p rook-cli -- term run "${prompt}"`, {
      cwd: join(__dirname, "../../.."),
      timeout: 60000,
    });
    return { result: "success", output: stdout.trim(), stderr: stderr.trim() };
  } catch (error: any) {
    return { result: "error", output: error.stdout?.trim(), stderr: error.stderr?.trim(), message: error.message };
  }
}

async function runCoreProof(fixture: unknown): Promise<Record<string, unknown>> {
  // Placeholder: integrate with actual rook core proof
  return { result: "pass", finalStatus: "completed", stateHash: "sha256:abc123" };
}

async function runPolicy(fixture: unknown): Promise<Record<string, unknown>> {
  // Placeholder: integrate with actual policy engine
  return { decision: "deny", risk: "critical" };
}

async function runAudit(fixture: unknown): Promise<Record<string, unknown>> {
  // Placeholder: integrate with actual audit system
  return { status: "review_needed", hasArtifact: false };
}

async function main() {
  const args = process.argv.slice(2);
  const suite = args.find(a => !a.startsWith("--"));
  const updateBaseline = args.includes("--update-baseline");
  const compareBaseline = args.includes("--compare-baseline");

  const scenarios = await loadScenarios(suite);
  const results: ScenarioResult[] = [];

  for (const scenario of scenarios) {
    const result = await runScenario(scenario);
    results.push(result);
  }

  const report: EvalReport = {
    schema_version: "dax.eval.v1",
    suite: suite || "all",
    timestamp: new Date().toISOString(),
    total: results.length,
    passed: results.filter(r => r.passed).length,
    failed: results.filter(r => !r.passed).length,
    results,
  };

  const reportPath = join(__dirname, "../report.json");
  await writeFile(reportPath, JSON.stringify(report, null, 2));

  console.log(JSON.stringify(report, null, 2));

  if (updateBaseline) {
    await updateBaselineFile(report);
  } else if (compareBaseline) {
    await compareBaselineFile(report);
  }

  if (report.failed > 0) {
    process.exit(1);
  }
}

async function updateBaselineFile(report: EvalReport) {
  const baseline: Record<string, { passed: boolean; checks: Record<string, unknown> }> = {};
  for (const r of report.results) {
    baseline[r.name] = { passed: r.passed, checks: r.checks };
  }
  const baselinePath = join(__dirname, "../baselines", `${report.suite}-baseline.json`);
  await writeFile(baselinePath, JSON.stringify({ 
    schema_version: "dax.eval.baseline.v1",
    suite: report.suite,
    generated: report.timestamp,
    scenarios: baseline 
  }, null, 2));
  console.log(`Baseline updated: ${baselinePath}`);
}

async function compareBaselineFile(report: EvalReport) {
  const baselinePath = join(__dirname, "../baselines", `${report.suite}-baseline.json`);
  
  try {
    const baselineContent = await readFile(baselinePath, "utf-8");
    const baseline = JSON.parse(baselineContent);
    
    let hasDrift = false;
    for (const r of report.results) {
      const baseScenario = baseline.scenarios?.[r.name];
      if (!baseScenario) {
        console.warn(`New scenario not in baseline: ${r.name}`);
        continue;
      }
      
      if (baseScenario.passed !== r.passed) {
        console.error(`DRIFT detected in ${r.name}: expected passed=${baseScenario.passed}, got ${r.passed}`);
        hasDrift = true;
      }
      
      // Compare checks
      for (const [key, value] of Object.entries(r.checks)) {
        if (baseScenario.checks?.[key] !== value) {
          console.error(`DRIFT in ${r.name}.${key}: expected ${baseScenario.checks?.[key]}, got ${value}`);
          hasDrift = true;
        }
      }
    }
    
    if (hasDrift) {
      console.error("Baseline comparison FAILED: Drift detected!");
      process.exit(1);
    } else {
      console.log("Baseline comparison PASSED: No drift detected.");
    }
  } catch (error) {
    console.error("Failed to compare baseline:", error);
    process.exit(1);
  }
}

main().catch(error => {
  console.error("Eval runner failed:", error);
  process.exit(1);
});
