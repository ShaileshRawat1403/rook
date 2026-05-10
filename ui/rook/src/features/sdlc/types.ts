export type VerificationPosture = "verified" | "guarded" | "blocked" | "failed";

export type CheckStatus = "passed" | "failed" | "timed_out" | "error";

export interface CheckResult {
  id: string;
  label: string;
  command: string;
  cwd: string;
  required: boolean;
  status: CheckStatus;
  exit_code: number | null;
  duration_ms: number;
  stdout_preview: string;
  stderr_preview: string;
}

export interface EvidenceReceipt {
  schemaVersion: string;
  receiptId: string;
  runId: string;
  claim: string;
  proofType: string;
  source: string;
  checkId: string;
  status: string;
  command: string;
  cwd: string;
  durationMs: number;
  digest: string;
}

export interface VerificationReport {
  schemaVersion: string;
  source: string;
  runId: string;
  repoRoot: string;
  checks: CheckResult[];
  posture: VerificationPosture;
  blockingReasons: string[];
  evidence: EvidenceReceipt[];
}
