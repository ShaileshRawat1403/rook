export type ColonyRole = "planner" | "worker" | "reviewer";

export type ColonyLifecycleStatus =
  | "draft"
  | "active"
  | "blocked"
  | "reviewing"
  | "closed"
  | "archived";

export type ColonyScopeKind = "planning" | "project" | "directory" | "repo";

export type ColonyScope = {
  kind: ColonyScopeKind;
  label: string;
  projectId?: string;
  path?: string;
  branch?: string | null;
  locked: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ColonyMemory = {
  projectSummary: string;
  repoNotes: string[];
  decisions: string[];
  constraints: string[];
  risks: string[];
  openQuestions: string[];
  updatedAt: string;
};

export type ColonyArtifactKind =
  | "note"
  | "handoff_packet"
  | "review"
  | "repo_summary"
  | "decision"
  | "risk"
  | "doc";

export type ColonyArtifact = {
  id: string;
  title: string;
  kind: ColonyArtifactKind;
  content: string;
  sourceTaskId?: string;
  sourceHandoffId?: string;
  sourceSeatId?: string;
  createdAt: string;
  updatedAt: string;
};

export type ColonySeatStatus =
  | "idle"
  | "thinking"
  | "running"
  | "waitingPermission"
  | "blocked"
  | "done"
  | "failed";

export type ColonySeatBinding = "unbound" | "linked";

export type ColonyTaskStatus =
  | "todo"
  | "assigned"
  | "inProgress"
  | "blocked"
  | "done";

export type ColonyTask = {
  id: string;
  title: string;
  description?: string;
  status: ColonyTaskStatus;
  assignedSeatId?: string;
  sourceAcceptanceCriterionId?: string;
  createdAt: string;
  updatedAt: string;
};

export type ColonyHandoffStatus = "draft" | "ready" | "copied";

export type ColonyHandoffReviewStatus = "pending" | "approved" | "rejected";

export type ColonyHandoff = {
  id: string;
  fromSeatId: string;
  toSeatId: string;
  taskId?: string;
  summary: string;
  status: ColonyHandoffStatus;
  reviewStatus?: ColonyHandoffReviewStatus;
  reviewNote?: string;
  createdAt: string;
  updatedAt: string;
};

export type ChatSessionInfo = {
  id: string;
  title: string;
  providerId?: string;
  modelName?: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  draft?: boolean;
};

export type ColonySeat = {
  id: string;
  role: ColonyRole;
  label: string;
  providerId?: string;
  modelName?: string;
  sessionId?: string;
  acpSessionId?: string;
  projectId?: string;
  binding: ColonySeatBinding;
  status: ColonySeatStatus;
  currentTask?: string;
  lastUpdate?: string;
};

export type ColonyOutputContract = {
  source: "recipe";
  recipeId: string;
  recipeVersion: string;
  artifactType: "report" | "prd" | "strategy" | "checklist" | "audit" | "sow";
  format: "markdown" | "json" | "checklist";
  requiredSections: string[];
  evidenceRequired: boolean;
  reviewerRequired: boolean;
};

export type ColonyOutputReviewStatus = "approved" | "changes_requested";

export type ColonyOutputReview = {
  status: ColonyOutputReviewStatus;
  reviewedAt: string;
  note?: string;
};

export type ColonyOutputReadinessStatus =
  | "not_ready"
  | "partially_ready"
  | "ready";

export type ColonyOutputReadiness = {
  hasOutputContract: boolean;
  requiredArtifactPresent: boolean;
  requiredSections: {
    section: string;
    present: boolean;
  }[];
  evidenceSatisfied: boolean;
  reviewerSatisfied: boolean;
  taskCompletion: {
    total: number;
    done: number;
  };
  status: ColonyOutputReadinessStatus;
};

export type ColonySession = {
  id: string;
  title: string;
  intent: string;
  workItemId?: string;
  recipeId?: string;
  recipeVersion?: string;
  outputContract?: ColonyOutputContract;
  outputReview?: ColonyOutputReview;
  lifecycleStatus?: ColonyLifecycleStatus;
  closedAt?: string;
  closedReason?: string;
  projectId?: string;
  scope?: ColonyScope;
  memory?: ColonyMemory;
  artifacts?: ColonyArtifact[];
  seats: ColonySeat[];
  tasks: ColonyTask[];
  handoffs: ColonyHandoff[];
  activeSeatId?: string;
  sentinelMode: "off" | "dax_open";
  createdAt: string;
  updatedAt: string;
};

export type ColonyEventType =
  | "colony_created"
  | "colony_closed"
  | "output_reviewed"
  | "output_changes_requested"
  | "scope_updated"
  | "seat_linked"
  | "seat_unlinked"
  | "seat_model_changed"
  | "active_seat_changed"
  | "sentinel_mode_changed"
  | "session_opened"
  | "task_created"
  | "task_assigned"
  | "task_status_changed"
  | "task_deleted"
  | "handoff_created"
  | "handoff_updated"
  | "handoff_staged"
  | "handoff_copied"
  | "handoff_deleted";

export type ColonyEvent = {
  id: string;
  type: ColonyEventType;
  seatRole?: ColonyRole;
  seatLabel?: string;
  taskId?: string;
  taskTitle?: string;
  handoffId?: string;
  timestamp: string;
  details?: string;
};

export type ColonyState = {
  currentColony: ColonySession | null;
  colonies: ColonySession[];
  availableProviders: { id: string; name: string }[];
};
