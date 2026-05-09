import type {
  ColonyOutputReadinessStatus,
  ColonySession,
} from "./types";
import { getColonyOutputReadiness } from "./outputReadiness";

interface ColonyOutputReadinessPanelProps {
  colony: ColonySession;
}

const STATUS_LABELS: Record<ColonyOutputReadinessStatus, string> = {
  not_ready: "Not ready",
  partially_ready: "Partially ready",
  ready: "Ready for review",
};

const STATUS_COPY: Record<ColonyOutputReadinessStatus, string> = {
  not_ready: "No matching output artifact is available yet.",
  partially_ready:
    "Some output requirements are present, but the contract is not fully satisfied.",
  ready: "The current artifacts satisfy the visible output contract.",
};

export function ColonyOutputReadinessPanel({
  colony,
}: ColonyOutputReadinessPanelProps) {
  const readiness = getColonyOutputReadiness(colony);
  const contract = colony.outputContract;

  return (
    <section
      aria-label="Output Contract"
      className="rounded-lg border border-border bg-background px-5 py-4"
    >
      <h3 className="text-sm font-medium">Output Contract</h3>

      {!contract ? (
        <p className="mt-2 text-sm text-muted-foreground">
          No output contract is attached to this Colony. Recipe-driven Colonies
          define the expected final artifact here.
        </p>
      ) : (
        <>
          <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            <dt className="text-muted-foreground">Artifact type</dt>
            <dd className="font-medium">{contract.artifactType}</dd>
            <dt className="text-muted-foreground">Format</dt>
            <dd className="font-medium">{contract.format}</dd>
            <dt className="text-muted-foreground">Evidence required</dt>
            <dd className="font-medium">
              {contract.evidenceRequired ? "Yes" : "No"}
            </dd>
            <dt className="text-muted-foreground">Reviewer required</dt>
            <dd className="font-medium">
              {contract.reviewerRequired ? "Yes" : "No"}
            </dd>
          </dl>

          {readiness.requiredSections.length > 0 && (
            <div className="mt-4">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">
                Required Sections
              </div>
              <ul className="mt-2 flex flex-col gap-1 text-sm">
                {readiness.requiredSections.map((s) => (
                  <li
                    key={s.section}
                    className="flex items-center gap-2"
                    data-section-present={s.present ? "true" : "false"}
                  >
                    <span aria-hidden="true">{s.present ? "✓" : "○"}</span>
                    <span
                      className={s.present ? "" : "text-muted-foreground"}
                    >
                      {s.section}
                    </span>
                    <span className="sr-only">
                      {s.present ? "Present" : "Missing"}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-border pt-3 text-sm">
        <span
          aria-label="Readiness status"
          className="rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium"
        >
          {STATUS_LABELS[readiness.status]}
        </span>
        <span className="text-xs text-muted-foreground">
          Tasks: {readiness.taskCompletion.done} /{" "}
          {readiness.taskCompletion.total} done
        </span>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        {STATUS_COPY[readiness.status]}
      </p>
    </section>
  );
}
