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
  const needle = section.toLowerCase();
  return artifacts.some((a) => a.content.toLowerCase().includes(needle));
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
