// Workflow preflight v0.1 schema.
//
// Scope-locked in `docs/integrations/WORKFLOW_PREFLIGHT_V0_1.md`. Six local-only
// checks gate Colony creation. This file holds the type contracts only —
// no check implementations, no orchestrator, no UI.

export type PreflightCheckId =
  | "provider_configured"
  | "provider_runtime"
  | "artifact_directory"
  | "module_valid"
  | "required_inputs"
  | "output_contract_known";

export type PreflightCheckResult = {
  id: PreflightCheckId;
  passed: boolean;
  // One-line user-facing reason when failed. Verb-led, no jargon.
  reason?: string;
  // Recovery action when failed. Verb-led, concrete.
  recovery?: string;
  // Raw error / path / detail. Collapsed by default in UI per the journey
  // doc's error translation contract.
  technical?: string;
};

export type WorkflowPreflightResult = {
  schemaVersion: "0.1.0";
  // True iff every check passed. Aggregate gate signal.
  ok: boolean;
  // Every check ran and is reported, even after the first failure — the
  // user sees the complete state, not just the first blocker.
  checks: PreflightCheckResult[];
  // ISO 8601 timestamp of when the orchestrator ran.
  ranAt: string;
};
