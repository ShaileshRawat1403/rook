import { readdir, readFile, writeFile } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { Scenario, Assertion, ScenarioResult, EvalReport } from "./types.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function loadScenarios(suite?: string): Promise<Scenario[]> {
  const scenariosDir = join(__dirname, "../scenarios");
  const files = await readdir(scenariosDir);
  const scenarios: Scenario[] = [];

  for (const file of files) {
    if (!file.endsWith(".json")) continue;
    const content = await readFile(join(scenariosDir, file), "utf-8");
    const scenario: Scenario = JSON.parse(content);

    if (suite && !matchSuite(scenario.suite, suite)) continue;
    scenarios.push(scenario);
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
    default:
      throw new Error(`Unknown scenario kind: ${kind}`);
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
  await writeFile(baselinePath, JSON.stringify(baseline, null, 2));
  console.log(`Baseline updated: ${baselinePath}`);
}

async function compareBaselineFile(report: EvalReport) {
  // Placeholder for baseline comparison
  console.log("Baseline comparison not yet implemented");
}

main().catch(error => {
  console.error("Eval runner failed:", error);
  process.exit(1);
});
