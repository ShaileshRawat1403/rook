import type {
  CheckStatus,
  EvidenceReceipt,
  VerificationPosture,
  VerificationReport,
} from "./types";

interface SdlcEvidenceViewerProps {
  report: VerificationReport | null;
}

const POSTURE_LABELS: Record<VerificationPosture, string> = {
  verified: "verified",
  guarded: "guarded",
  blocked: "blocked",
  failed: "failed",
};

const STATUS_LABELS: Record<CheckStatus, string> = {
  passed: "passed",
  failed: "failed",
  timed_out: "timed out",
  error: "error",
};

function formatDuration(durationMs: number) {
  return `${durationMs} ms`;
}

function formatRequired(required: boolean) {
  return required ? "Required" : "Optional";
}

function ReceiptRow({ receipt }: { receipt: EvidenceReceipt }) {
  return (
    <li className="rounded-lg border border-border bg-background px-4 py-3">
      <dl className="grid gap-2 text-sm md:grid-cols-[9rem_minmax(0,1fr)]">
        <dt className="text-muted-foreground">Receipt ID</dt>
        <dd className="break-all font-mono text-xs">{receipt.receiptId}</dd>
        <dt className="text-muted-foreground">Check ID</dt>
        <dd className="break-all font-medium">{receipt.checkId}</dd>
        <dt className="text-muted-foreground">Status</dt>
        <dd>{receipt.status}</dd>
        <dt className="text-muted-foreground">Proof type</dt>
        <dd>{receipt.proofType}</dd>
        <dt className="text-muted-foreground">Digest</dt>
        <dd className="break-all font-mono text-xs">{receipt.digest}</dd>
        <dt className="text-muted-foreground">Duration</dt>
        <dd>{formatDuration(receipt.durationMs)}</dd>
      </dl>
    </li>
  );
}

export function SdlcEvidenceViewer({ report }: SdlcEvidenceViewerProps) {
  if (!report) {
    return (
      <section
        aria-label="SDLC Verification Evidence"
        className="rounded-lg border border-border bg-background px-5 py-4"
      >
        <h3 className="text-sm font-medium">Verification Summary</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          No verification report yet.
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Run verification explicitly to generate evidence.
        </p>
      </section>
    );
  }

  return (
    <section
      aria-label="SDLC Verification Evidence"
      className="rounded-lg border border-border bg-background px-5 py-4"
    >
      <section aria-labelledby="sdlc-verification-summary">
        <h3 id="sdlc-verification-summary" className="text-sm font-medium">
          Verification Summary
        </h3>
        <dl className="mt-3 grid gap-2 text-sm md:grid-cols-[8rem_minmax(0,1fr)]">
          <dt className="text-muted-foreground">Posture</dt>
          <dd>
            <span className="rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium">
              {POSTURE_LABELS[report.posture]}
            </span>
          </dd>
          <dt className="text-muted-foreground">Repo root</dt>
          <dd className="break-all font-mono text-xs">{report.repoRoot}</dd>
          <dt className="text-muted-foreground">Run ID</dt>
          <dd className="break-all font-mono text-xs">{report.runId}</dd>
        </dl>
      </section>

      <section
        aria-labelledby="sdlc-verification-checks"
        className="mt-5 border-t border-border pt-4"
      >
        <h4
          id="sdlc-verification-checks"
          className="text-xs font-medium uppercase text-muted-foreground"
        >
          Checks
        </h4>
        {report.checks.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">
            No checks were detected.
          </p>
        ) : (
          <ul className="mt-3 flex flex-col gap-3">
            {report.checks.map((check) => (
              <li
                key={check.id}
                className="rounded-lg border border-border bg-background px-4 py-3"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{check.label}</span>
                  <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-xs">
                    {STATUS_LABELS[check.status]}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatRequired(check.required)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatDuration(check.duration_ms)}
                  </span>
                </div>
                <dl className="mt-3 grid gap-2 text-sm md:grid-cols-[7rem_minmax(0,1fr)]">
                  <dt className="text-muted-foreground">Command</dt>
                  <dd className="break-all font-mono text-xs">
                    {check.command}
                  </dd>
                  <dt className="text-muted-foreground">Working dir</dt>
                  <dd className="break-all font-mono text-xs">{check.cwd}</dd>
                  {check.stdout_preview && (
                    <>
                      <dt className="text-muted-foreground">stdout</dt>
                      <dd>
                        <pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded-md bg-muted p-3 text-xs">
                          {check.stdout_preview}
                        </pre>
                      </dd>
                    </>
                  )}
                  {check.stderr_preview && (
                    <>
                      <dt className="text-muted-foreground">stderr</dt>
                      <dd>
                        <pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded-md bg-muted p-3 text-xs">
                          {check.stderr_preview}
                        </pre>
                      </dd>
                    </>
                  )}
                </dl>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section
        aria-labelledby="sdlc-verification-blocking-reasons"
        className="mt-5 border-t border-border pt-4"
      >
        <h4
          id="sdlc-verification-blocking-reasons"
          className="text-xs font-medium uppercase text-muted-foreground"
        >
          Blocking Reasons
        </h4>
        {report.blockingReasons.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">
            No blocking reasons.
          </p>
        ) : (
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
            {report.blockingReasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        )}
      </section>

      <section
        aria-labelledby="sdlc-verification-evidence-receipts"
        className="mt-5 border-t border-border pt-4"
      >
        <h4
          id="sdlc-verification-evidence-receipts"
          className="text-xs font-medium uppercase text-muted-foreground"
        >
          Evidence Receipts
        </h4>
        {report.evidence.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">
            No evidence receipts.
          </p>
        ) : (
          <ul className="mt-3 flex flex-col gap-3">
            {report.evidence.map((receipt) => (
              <ReceiptRow key={receipt.receiptId} receipt={receipt} />
            ))}
          </ul>
        )}
      </section>
    </section>
  );
}
