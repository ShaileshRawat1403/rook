import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from "@tauri-apps/plugin-notification";

export async function ensureNotificationPermission(): Promise<boolean> {
  let permissionGranted = await isPermissionGranted();
  if (!permissionGranted) {
    const permission = await requestPermission();
    permissionGranted = permission === "granted";
  }
  return permissionGranted;
}

export async function showNotification(
  title: string,
  body: string,
): Promise<void> {
  const hasPermission = await ensureNotificationPermission();
  if (!hasPermission) {
    console.warn("Notification permission not granted");
    return;
  }

  await sendNotification({ title, body });
}

export async function showApprovalNotification(
  sessionId: string,
): Promise<void> {
  const truncated = sessionId.slice(0, 8);
  await showNotification(
    "Rook - Approval Required",
    `A task requires your approval in session ${truncated}`,
  );
}

export async function showTaskCompletedNotification(
  taskName: string,
): Promise<void> {
  await showNotification(
    "Rook - Task Completed",
    `Task '${taskName}' completed successfully`,
  );
}

export async function showTaskFailedNotification(
  taskName: string,
  error: string,
): Promise<void> {
  await showNotification(
    "Rook - Task Failed",
    `Task '${taskName}' failed: ${error}`,
  );
}
