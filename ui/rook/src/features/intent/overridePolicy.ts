export const WARNING_ONLY_ACTIONS = [
  "safe draft",
  "summary",
  "analysis",
  "qa checklist from weak PRD",
  "PM update without evidence",
];

export const APPROVAL_REQUIRED_ACTIONS = [
  "modify files",
  "create files",
  "delete files",
  "run shell command",
  "git branch operation",
  "git commit",
  "git push",
  "git merge",
  "Jira write-back",
  "ticket creation",
  "status transition",
  "external comment",
];

export const HARD_STOP_ACTIONS = [
  "missing credentials",
  "missing directory for file change",
  "unknown destructive target",
  "outside allowed workspace",
  "external write without configured integration",
  "policy violation",
];

export function canOverride(action: {
  technicallyPossible: boolean;
  forbiddenByPolicy: boolean;
  riskCanBeContained: boolean;
  explicitUserOverride: boolean;
}): boolean {
  return (
    action.technicallyPossible &&
    !action.forbiddenByPolicy &&
    action.riskCanBeContained &&
    action.explicitUserOverride
  );
}
