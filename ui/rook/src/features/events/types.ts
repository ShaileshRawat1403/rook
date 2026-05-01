export type RookEventSource = "rook" | "dax" | "agent" | "mcp" | "operator";

export type RookEventType =
  | "run.started"
  | "intent.resolved"
  | "agent.selected"
  | "provider.selected"
  | "model.selected"
  | "tool.proposed"
  | "permission.requested"
  | "governance.evaluated"
  | "operator.intervened"
  | "tool.executed"
  | "artifact.detected"
  | "evidence.attached"
  | "run.completed"
  | "run.failed"
  | (string & {});

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export interface RookEvent {
  schemaVersion: "0.1.0" | (string & {});
  eventId: string;
  runId: string;
  sessionId?: string | null;
  projectId?: string | null;
  type: RookEventType;
  source: RookEventSource | (string & {});
  timestamp: string;
  data: JsonValue;
  traceId?: string | null;
  parentEventId?: string | null;
}

export interface RookEventInput {
  schemaVersion?: "0.1.0" | (string & {});
  eventId?: string;
  runId: string;
  sessionId?: string | null;
  projectId?: string | null;
  type: RookEventType;
  source: RookEventSource | (string & {});
  timestamp?: string;
  data?: JsonValue;
  traceId?: string | null;
  parentEventId?: string | null;
}

export interface RookEventFilter {
  runId?: string;
  sessionId?: string;
  projectId?: string;
  type?: RookEventType;
  limit?: number;
}
