import * as acpApi from "./acpApi";
import { perfLog } from "@/shared/lib/perfLog";

interface PreparedSession {
  rookSessionId: string;
  providerId: string;
  workingDir: string;
}

type SessionRegistrationListener = (
  localSessionId: string,
  rookSessionId: string,
) => void;

const prepared = new Map<string, PreparedSession>();
const rookToLocal = new Map<string, string>();
const registrationListeners = new Set<SessionRegistrationListener>();

function restoreRookRegistration(
  rookSessionId: string,
  localSessionId: string | undefined,
): void {
  if (localSessionId === undefined) {
    rookToLocal.delete(rookSessionId);
    return;
  }

  rookToLocal.set(rookSessionId, localSessionId);
}

function makeKey(sessionId: string, personaId?: string): string {
  if (personaId && personaId.length > 0) {
    return `${sessionId}__${personaId}`;
  }
  return sessionId;
}

function notifySessionRegistered(
  localSessionId: string,
  rookSessionId: string,
): void {
  for (const listener of registrationListeners) {
    listener(localSessionId, rookSessionId);
  }
}

export function subscribeToSessionRegistration(
  listener: SessionRegistrationListener,
): () => void {
  registrationListeners.add(listener);
  return () => registrationListeners.delete(listener);
}

export async function prepareSession(
  sessionId: string,
  providerId: string,
  workingDir: string,
  personaId?: string,
): Promise<string> {
  const sid = sessionId.slice(0, 8);
  const key = makeKey(sessionId, personaId);

  const existing = prepared.get(key) ?? prepared.get(sessionId);
  if (existing) {
    const tReuse = performance.now();
    let changed = false;
    if (existing.workingDir !== workingDir) {
      await acpApi.updateWorkingDir(existing.rookSessionId, workingDir);
      existing.workingDir = workingDir;
      changed = true;
    }
    if (existing.providerId !== providerId) {
      const tProv = performance.now();
      await acpApi.setProvider(existing.rookSessionId, providerId);
      perfLog(
        `[perf:prepare] ${sid} reuse setProvider(${providerId}) in ${(performance.now() - tProv).toFixed(1)}ms (rook_sid=${existing.rookSessionId.slice(0, 8)})`,
      );
      existing.providerId = providerId;
      changed = true;
    }
    perfLog(
      `[perf:prepare] ${sid} reuse existing session (updates=${changed}) in ${(performance.now() - tReuse).toFixed(1)}ms`,
    );
    return existing.rookSessionId;
  }

  let rookSessionId: string | null = null;

  const tLoad = performance.now();
  try {
    await acpApi.loadSession(sessionId, workingDir);
    rookSessionId = sessionId;
    perfLog(
      `[perf:prepare] ${sid} tracker loadSession ok in ${(performance.now() - tLoad).toFixed(1)}ms`,
    );
  } catch {
    perfLog(
      `[perf:prepare] ${sid} tracker loadSession failed in ${(performance.now() - tLoad).toFixed(1)}ms → newSession`,
    );
  }

  if (!rookSessionId) {
    const tNew = performance.now();
    const response = await acpApi.newSession(workingDir, providerId);
    rookSessionId = response.sessionId;
    perfLog(
      `[perf:prepare] ${sid} tracker newSession done in ${(performance.now() - tNew).toFixed(1)}ms (rook_sid=${rookSessionId.slice(0, 8)})`,
    );
  }

  const rookSid = rookSessionId.slice(0, 8);
  const tProv = performance.now();
  await acpApi.setProvider(rookSessionId, providerId);
  perfLog(
    `[perf:prepare] ${sid} tracker setProvider(${providerId}) in ${(performance.now() - tProv).toFixed(1)}ms (rook_sid=${rookSid})`,
  );

  prepared.set(key, { rookSessionId, providerId, workingDir });
  prepared.set(sessionId, { rookSessionId, providerId, workingDir });
  rookToLocal.set(rookSessionId, sessionId);
  notifySessionRegistered(sessionId, rookSessionId);

  return rookSessionId;
}

export function getRookSessionId(
  sessionId: string,
  personaId?: string,
): string | null {
  const key = makeKey(sessionId, personaId);
  return (
    prepared.get(key)?.rookSessionId ??
    prepared.get(sessionId)?.rookSessionId ??
    null
  );
}

export function getLocalSessionId(rookSessionId: string): string | null {
  return rookToLocal.get(rookSessionId) ?? null;
}

export function registerSession(
  sessionId: string,
  rookSessionId: string,
  providerId: string,
  workingDir: string,
): () => void {
  const previousEntry = prepared.get(sessionId);
  const previousRookSessionLocal = rookToLocal.get(rookSessionId);
  const previousSessionRookLocal = previousEntry
    ? rookToLocal.get(previousEntry.rookSessionId)
    : undefined;
  const entry = { rookSessionId, providerId, workingDir };

  if (
    previousEntry &&
    previousEntry.rookSessionId !== rookSessionId &&
    rookToLocal.get(previousEntry.rookSessionId) === sessionId
  ) {
    rookToLocal.delete(previousEntry.rookSessionId);
  }

  prepared.set(sessionId, entry);
  rookToLocal.set(rookSessionId, sessionId);
  notifySessionRegistered(sessionId, rookSessionId);

  return () => {
    prepared.delete(sessionId);
    if (previousEntry) {
      prepared.set(sessionId, previousEntry);
    }

    restoreRookRegistration(rookSessionId, previousRookSessionLocal);
    if (previousEntry && previousEntry.rookSessionId !== rookSessionId) {
      restoreRookRegistration(
        previousEntry.rookSessionId,
        previousSessionRookLocal,
      );
    }
  };
}

export function unregisterSession(
  sessionId: string,
  rookSessionId?: string,
): void {
  const entry = prepared.get(sessionId);
  prepared.delete(sessionId);

  const resolvedRookSessionId = rookSessionId ?? entry?.rookSessionId;
  if (
    resolvedRookSessionId &&
    rookToLocal.get(resolvedRookSessionId) === sessionId
  ) {
    rookToLocal.delete(resolvedRookSessionId);
  }
}
