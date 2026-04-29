use tauri::{AppHandle, Emitter};
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::time::{timeout, Duration};

use crate::services::acp::rook_serve::get_rook_command;

#[derive(serde::Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct ModelSetupOutput {
    provider_id: String,
    line: String,
}

fn emit_output(app_handle: &AppHandle, provider_id: &str, line: &str) {
    let _ = app_handle.emit(
        "model-setup:output",
        ModelSetupOutput {
            provider_id: provider_id.to_string(),
            line: line.to_string(),
        },
    );
}

#[tauri::command]
pub async fn authenticate_model_provider(
    app_handle: AppHandle,
    provider_id: String,
    provider_label: String,
) -> Result<(), String> {
    if cfg!(target_os = "windows") {
        return Err("Native Rook sign-in is not supported on Windows yet".to_string());
    }

    emit_output(&app_handle, &provider_id, "Starting Rook sign-in...");
    emit_output(&app_handle, &provider_id, &format!("Connecting to {}...", provider_label));

    run_oauth_flow(&app_handle, &provider_id).await
}

async fn run_oauth_flow(
    app_handle: &AppHandle,
    provider_id: &str,
) -> Result<(), String> {
    let mut rook_command = get_rook_command(app_handle).map_err(|e| e.to_string())?;

    let mut child = rook_command
        .arg("configure")
        .arg("--provider")
        .arg(provider_id)
        .arg("--no-test")
        .stdin(std::process::Stdio::null())
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to start sign-in: {e}"))?;

    let stdout = child.stdout.take();
    let stderr = child.stderr.take();

    let provider_id_owned = provider_id.to_string();
    let app_handle_owned = app_handle.clone();

    let provider_id_stdderr = provider_id.to_string();
    let app_handle_stderr = app_handle.clone();

    let stdout_handle = tokio::spawn(async move {
        if let Some(stdout) = stdout {
            let reader = BufReader::new(stdout);
            let mut lines = reader.lines();
            while let Ok(Some(line)) = lines.next_line().await {
                let trimmed = line.trim();
                if trimmed.is_empty() {
                    continue;
                }
                let cleaned: String = trimmed
                    .chars()
                    .filter(|c| !['│', '┌', '└', '◆', '◇', '●', '○'].contains(c))
                    .collect();
                let cleaned = cleaned.trim().to_string();
                if !cleaned.is_empty() {
                    emit_output(&app_handle_owned, &provider_id_owned, &cleaned);
                }
            }
        }
    });

    let stderr_handle = tokio::spawn(async move {
        if let Some(stderr) = stderr {
            let reader = BufReader::new(stderr);
            let mut lines = reader.lines();
            while let Ok(Some(line)) = lines.next_line().await {
                let trimmed = line.trim();
                if trimmed.is_empty() {
                    continue;
                }
                let cleaned: String = trimmed
                    .chars()
                    .filter(|c| !['│', '┌', '└', '◆', '◇', '●', '○'].contains(c))
                    .collect();
                let cleaned = cleaned.trim().to_string();
                if !cleaned.is_empty() {
                    emit_output(&app_handle_stderr, &provider_id_stdderr, &cleaned);
                }
            }
        }
    });

    let result = timeout(Duration::from_secs(360), async {
        tokio::try_join!(stdout_handle, stderr_handle)
    })
    .await;

    match result {
        Ok(Ok(_)) => {
            let status = child
                .wait()
                .await
                .map_err(|e| format!("Failed to wait: {e}"))?;

            if status.success() {
                emit_output(app_handle, provider_id, "Successfully connected!");
                Ok(())
            } else {
                let code = status.code().unwrap_or(-1);
                Err(format!("Sign-in exited with code {code}"))
            }
        }
        Ok(Err(e)) => Err(format!("Error reading output: {e}")),
        Err(_) => {
            let _ = child.kill().await;
            emit_output(
                app_handle,
                provider_id,
                "Timed out. Check if a browser opened and complete sign-in, then restart.",
            );
            Err("Sign-in timed out after 6 minutes".to_string())
        }
    }
}
