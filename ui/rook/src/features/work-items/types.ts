export type WorkItemSource =
  | "manual"
  | "jira"
  | "github_issue"
  | "linear"
  | "prd";

export type AcceptanceCriterionStatus =
  | "unknown"
  | "covered"
  | "not_covered"
  | "needs_review";

export type AcceptanceCriterionSource = "manual" | "imported" | "extracted";

export interface AcceptanceCriterion {
  id: string;
  text: string;
  status?: AcceptanceCriterionStatus;
  source?: AcceptanceCriterionSource;
}

export interface WorkItem {
  id: string;
  key?: string;
  title: string;
  source: WorkItemSource;
  url?: string;
  description?: string;
  acceptanceCriteria: AcceptanceCriterion[];
  projectId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkItemInput {
  key?: string;
  title: string;
  source: WorkItemSource;
  url?: string;
  description?: string;
  acceptanceCriteria?: AcceptanceCriterion[];
  projectId?: string;
}

export interface ActiveWorkItemRef {
  workItemId: string;
}
