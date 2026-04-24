import type { ContentBlock } from "@agentclientprotocol/sdk";
import * as directAcp from "./acpApi";
import * as sessionTracker from "./acpSessionTracker";
import {
  setActiveMessageId,
  clearActiveMessageId,
} from "./acpNotificationHandler";
import { searchSessionsViaExports } from "./sessionSearch";
import { perfLog } from "@/shared/lib/perfLog";

export interface AcpProvider {
  id: string;
  label: string;
}

export interface AcpSendMessageOptions {
  systemPrompt?: string;
  personaId?: string;
  personaName?: string;
  /** Image attachments as [base64Data, mimeType] pairs. */
  images?: [string, string][];
}

export interface AcpPrepareSessionOptions {
  personaId?: string;
}

/** Discover ACP providers installed on the system. */
export async function discoverAcpProviders(): Promise<AcpProvider[]> {
  return directAcp.listProviders();
}

/** Send a message to an ACP agent. Response streams via Tauri events. */
export async function acpSendMessage(
  sessionId: string,
  prompt: string,
  options: AcpSendMessageOptions = {},
): Promise<void> {
  const { systemPrompt, personaId, images } = options;
  const sid = sessionId.slice(0, 8);
  const tStart = performance.now();

  const rookSessionId = sessionTracker.getRookSessionId(sessionId, personaId);
  if (!rookSessionId) {
    throw new Error("Session not prepared. Call acpPrepareSession first.");
  }

  const hasSystem = systemPrompt && systemPrompt.trim().length > 0;
  const effectivePrompt = hasSystem
    ? `<persona-instructions>\n${systemPrompt}\n</persona-instructions>\n\n<user-message>\n${prompt}\n</user-message>`
    : prompt;

  const content: ContentBlock[] = [{ type: "text", text: effectivePrompt }];
  if (images) {
    for (const [data, mimeType] of images) {
      content.push({ type: "image", data, mimeType } as ContentBlock);
    }
  }

  const messageId = crypto.randomUUID();
  setActiveMessageId(rookSessionId, messageId);

  perfLog(
    `[perf:send] ${sid} acpSendMessage → prompt(len=${prompt.length}, imgs=${images?.length ?? 0})`,
  );
  const tPrompt = performance.now();
  await directAcp.prompt(rookSessionId, content);
  const tDone = performance.now();
  perfLog(
    `[perf:send] ${sid} prompt() resolved in ${(tDone - tPrompt).toFixed(1)}ms (total acpSendMessage ${(tDone - tStart).toFixed(1)}ms)`,
  );

  clearActiveMessageId(rookSessionId);
}

/** Prepare or warm an ACP session ahead of the first prompt. */
export async function acpPrepareSession(
  sessionId: string,
  providerId: string,
  workingDir: string,
  options: AcpPrepareSessionOptions = {},
): Promise<void> {
  const sid = sessionId.slice(0, 8);
  const t0 = performance.now();
  perfLog(
    `[perf:prepare] ${sid} acpPrepareSession start (provider=${providerId})`,
  );
  await sessionTracker.prepareSession(
    sessionId,
    providerId,
    workingDir,
    options.personaId,
  );
  perfLog(
    `[perf:prepare] ${sid} acpPrepareSession done in ${(performance.now() - t0).toFixed(1)}ms`,
  );
}

export async function acpSetModel(
  sessionId: string,
  modelId: string,
): Promise<void> {
  const rookSessionId = sessionTracker.getRookSessionId(sessionId);
  return directAcp.setModel(rookSessionId ?? sessionId, modelId);
}

/** Session info returned by the rook binary's list_sessions. */
export interface AcpSessionInfo {
  sessionId: string;
  title: string | null;
  updatedAt: string | null;
  messageCount: number;
}

export interface AcpSessionSearchResult {
  sessionId: string;
  snippet: string;
  messageId: string;
  messageRole?: "user" | "assistant" | "system";
  matchCount: number;
}

/** List all sessions known to the rook binary. */
export async function acpListSessions(): Promise<AcpSessionInfo[]> {
  return directAcp.listSessions();
}

export async function acpSearchSessions(
  query: string,
  sessionIds: string[],
): Promise<AcpSessionSearchResult[]> {
  return searchSessionsViaExports(query, sessionIds);
}

/**
 * Load an existing session from the rook binary.
 *
 * This triggers message replay via SessionNotification events that the
 * notification handler picks up automatically.
 */
export async function acpLoadSession(
  sessionId: string,
  rookSessionId: string,
  workingDir?: string,
): Promise<void> {
  const effectiveWorkingDir = workingDir ?? "~/.rook/artifacts";
  const sid = sessionId.slice(0, 8);
  const t0 = performance.now();
  const rollbackSessionRegistration = sessionTracker.registerSession(
    sessionId,
    rookSessionId,
    "rook",
    effectiveWorkingDir,
  );
  try {
    perfLog(`[perf:load] ${sid} acpLoadSession → client.loadSession`);
    await directAcp.loadSession(rookSessionId, effectiveWorkingDir);
    perfLog(
      `[perf:load] ${sid} client.loadSession resolved in ${(performance.now() - t0).toFixed(1)}ms`,
    );
  } catch (error) {
    rollbackSessionRegistration();
    throw error;
  }
}

/** Export a session as JSON via the rook binary. */
export async function acpExportSession(sessionId: string): Promise<string> {
  return directAcp.exportSession(sessionId);
}

/** Import a session from JSON via the rook binary. Returns new session metadata. */
export async function acpImportSession(json: string): Promise<AcpSessionInfo> {
  return directAcp.importSession(json);
}

/** Duplicate (fork) a session via the rook binary. Returns new session metadata. */
export async function acpDuplicateSession(
  sessionId: string,
): Promise<AcpSessionInfo> {
  const rookSessionId = sessionTracker.getRookSessionId(sessionId) ?? sessionId;
  return directAcp.forkSession(rookSessionId);
}

/** Cancel an in-progress ACP session so the backend stops streaming. */
export async function acpCancelSession(
  sessionId: string,
  personaId?: string,
): Promise<boolean> {
  const rookSessionId = sessionTracker.getRookSessionId(sessionId, personaId);
  await directAcp.cancelSession(rookSessionId ?? sessionId);
  return true;
}
