export type ColonyRole = "planner" | "worker" | "reviewer";

export type ColonySeatStatus =
  | "idle"
  | "thinking"
  | "running"
  | "waitingPermission"
  | "blocked"
  | "done"
  | "failed";

export type ColonySeat = {
  id: string;
  role: ColonyRole;
  label: string;
  providerId?: string;
  sessionId?: string;
  acpSessionId?: string;
  projectId?: string;
  status: ColonySeatStatus;
  currentTask?: string;
  lastUpdate?: string;
};

export type ColonySession = {
  id: string;
  title: string;
  intent: string;
  projectId?: string;
  seats: ColonySeat[];
  activeSeatId?: string;
  sentinelMode: "off" | "dax_open";
  createdAt: string;
  updatedAt: string;
};

export type ColonyState = {
  currentColony: ColonySession | null;
  colonies: ColonySession[];
  availableProviders: { id: string; name: string }[];
};