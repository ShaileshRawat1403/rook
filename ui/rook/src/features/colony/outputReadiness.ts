import type {
  ColonyArtifact,
  ColonyArtifactKind,
  ColonyOutputContract,
  ColonyOutputReadiness,
  ColonyOutputReadinessStatus,
  ColonySession,
} from "./types";

const ARTIFACT_TYPE_TO_KINDS: Record<
  ColonyOutputContract["artifactType"],
  readonly ColonyArtifactKind[]
> = {
  report: ["repo_summary", "review", "doc", "note"],
  audit: ["review", "repo_summary", "doc"],
  checklist: ["review", "doc", "note"],
  prd: ["doc"],
  strategy: ["doc", "note"],
  sow: ["doc", "review", "note"],
};

const EVIDENCE_KEYWORDS = [
  "evidence",
  "source",
  "files",
  "references",
  "findings",
];

function matchesArtifactType(
  artifact: ColonyArtifact,
  artifactType: ColonyOutputContract["artifactType"],
): boolean {
  return ARTIFACT_TYPE_TO_KINDS[artifactType].includes(artifact.kind);
}

function sectionPresent(section: string, artifacts: ColonyArtifact[]): boolean {
  const needle = section.trim().toLowerCase();
  return artifacts.some((artifact) =>
    artifact.content.split(/\r?\n/).some((line) => {
      const trimmed = line.trim();
      const markdownHeading = trimmed.match(/^#{1,6}\s+(.+?)\s*#*\s*$/);
      const colonHeading = trimmed.match(/^(.+?)\s*:\s*$/);
      const heading = markdownHeading?.[1] ?? colonHeading?.[1];

      return heading?.trim().replace(/:$/, "").toLowerCase() === needle;
    }),
  );
}

function evidencePresent(artifacts: ColonyArtifact[]): boolean {
  return artifacts.some((a) => {
    const lower = a.content.toLowerCase();
    return EVIDENCE_KEYWORDS.some((kw) => lower.includes(kw));
  });
}

function hasApprovedHandoff(colony: ColonySession): boolean {
  return colony.handoffs.some((h) => h.reviewStatus === "approved");
}

function reviewerApproved(colony: ColonySession): boolean {
  if (colony.outputReview?.status === "changes_requested") {
    return false;
  }

  return (
    colony.outputReview?.status === "approved" || hasApprovedHandoff(colony)
  );
}

export function getColonyOutputReadiness(
  colony: ColonySession,
): ColonyOutputReadiness {
  const artifacts = colony.artifacts ?? [];
  const taskTotal = colony.tasks.length;
  const taskDone = colony.tasks.filter((t) => t.status === "done").length;
  const taskCompletion = { total: taskTotal, done: taskDone };
  const allTasksDone = taskTotal === 0 || taskDone === taskTotal;
  const contract = colony.outputContract;

  if (!contract) {
    return {
      hasOutputContract: false,
      requiredArtifactPresent: false,
      requiredSections: [],
      evidenceSatisfied: false,
      reviewerSatisfied: false,
      taskCompletion,
      status: "not_ready",
    };
  }

  const requiredArtifactPresent = artifacts.some((a) =>
    matchesArtifactType(a, contract.artifactType),
  );
  const requiredSections = contract.requiredSections.map((section) => ({
    section,
    present: sectionPresent(section, artifacts),
  }));
  const allSectionsPresent = requiredSections.every((s) => s.present);
  const evidenceSatisfied = contract.evidenceRequired
    ? evidencePresent(artifacts)
    : true;
  const reviewerSatisfied = contract.reviewerRequired
    ? reviewerApproved(colony)
    : true;

  let status: ColonyOutputReadinessStatus;
  if (
    allTasksDone &&
    requiredArtifactPresent &&
    allSectionsPresent &&
    evidenceSatisfied &&
    reviewerSatisfied
  ) {
    status = "ready";
  } else if (artifacts.length > 0 || taskDone > 0) {
    status = "partially_ready";
  } else {
    status = "not_ready";
  }

  return {
    hasOutputContract: true,
    requiredArtifactPresent,
    requiredSections,
    evidenceSatisfied,
    reviewerSatisfied,
    taskCompletion,
    status,
  };
}

export type ColonyOutputReviewability = {
  canApprove: boolean;
  canRequestChanges: boolean;
  reasons: string[];
};

export function getColonyOutputReviewability(
  colony: ColonySession,
): ColonyOutputReviewability {
  const readiness = getColonyOutputReadiness(colony);
  const artifacts = colony.artifacts ?? [];
  const missingSections = readiness.requiredSections
    .filter((section) => !section.present)
    .map((section) => section.section);
  const allTasksDone =
    readiness.taskCompletion.total === readiness.taskCompletion.done;
  const reasons: string[] = [];

  if (!readiness.hasOutputContract) reasons.push("output contract missing");
  if (!readiness.requiredArtifactPresent) {
    reasons.push("required artifact missing");
  }
  if (missingSections.length > 0) {
    reasons.push(`required sections missing: ${missingSections.join(", ")}`);
  }
  if (!readiness.evidenceSatisfied) {
    reasons.push("required evidence not satisfied");
  }
  if (!allTasksDone) reasons.push("required tasks incomplete");

  return {
    canApprove:
      readiness.hasOutputContract &&
      readiness.requiredArtifactPresent &&
      missingSections.length === 0 &&
      readiness.evidenceSatisfied &&
      allTasksDone,
    canRequestChanges: artifacts.length > 0,
    reasons,
  };
}
