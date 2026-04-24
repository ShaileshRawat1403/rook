use crate::services::acp::RookServeProcess;

#[tauri::command]
pub async fn get_rook_serve_url(app_handle: tauri::AppHandle) -> Result<String, String> {
    let process = RookServeProcess::get(app_handle).await?;
    Ok(process.ws_url())
}