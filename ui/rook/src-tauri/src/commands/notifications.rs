use tauri::AppHandle;
use tauri_plugin_notification::NotificationExt;

#[tauri::command]
pub async fn request_notification_permission(app: AppHandle) -> Result<String, String> {
    match app.notification().permission_state() {
        Ok(state) => Ok(format!("{:?}", state)),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
pub fn send_notification(app: AppHandle, title: String, body: String) -> Result<(), String> {
    app.notification()
        .builder()
        .title(&title)
        .body(&body)
        .show()
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn send_approval_notification(app: AppHandle, session_id: String) -> Result<(), String> {
    let truncated = if session_id.len() > 8 {
        &session_id[..8]
    } else {
        &session_id
    };
    app.notification()
        .builder()
        .title("Rook - Approval Required")
        .body(format!("A task requires your approval in session {}", truncated))
        .show()
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn send_task_completed_notification(app: AppHandle, task_name: String) -> Result<(), String> {
    app.notification()
        .builder()
        .title("Rook - Task Completed")
        .body(format!("Task '{}' completed successfully", task_name))
        .show()
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn send_task_failed_notification(
    app: AppHandle,
    task_name: String,
    error: String,
) -> Result<(), String> {
    app.notification()
        .builder()
        .title("Rook - Task Failed")
        .body(format!("Task '{}' failed: {}", task_name, error))
        .show()
        .map_err(|e| e.to_string())
}