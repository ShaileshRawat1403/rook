use std::process::Stdio;
use tokio::io::AsyncWriteExt;
use tokio::process::Command;

use super::agent_setup::build_extended_path;

const SENTINEL_ENV_VAR: &str = "ROOK_SENTINEL";
const DAX_BINARY: &str = "dax";

/// Returns the active sentinel mode. Reads the ROOK_SENTINEL env var at
/// invocation time so the user can flip modes without restarting Rook
/// (in shells where the env var is set; for GUI launches it is read
/// from the environment Tauri inherited at startup).
#[tauri::command]
pub async fn get_sentinel_mode() -> Result<String, String> {
    let raw = std::env::var(SENTINEL_ENV_VAR).unwrap_or_default();
    let normalized = raw.trim().to_ascii_lowercase();
    let mode = match normalized.as_str() {
        "dax" => "dax",
        _ => "off",
    };
    Ok(mode.to_string())
}

/// Pipes the supplied ProposedAction JSON to `dax governance evaluate` and
/// returns the GovernanceDecision JSON from stdout. Errors carry the stderr
/// contents (truncated) so the renderer can surface them.
#[tauri::command]
pub async fn sentinel_evaluate(action_json: String) -> Result<String, String> {
    let extended_path = build_extended_path();

    let mut child = Command::new(DAX_BINARY)
        .args(["governance", "evaluate"])
        .env("PATH", &extended_path)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("failed to spawn dax: {e}"))?;

    if let Some(mut stdin) = child.stdin.take() {
        stdin
            .write_all(action_json.as_bytes())
            .await
            .map_err(|e| format!("failed to write stdin: {e}"))?;
        stdin
            .shutdown()
            .await
            .map_err(|e| format!("failed to close stdin: {e}"))?;
    }

    let output = child
        .wait_with_output()
        .await
        .map_err(|e| format!("failed to wait on dax: {e}"))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        let trimmed = stderr.trim();
        let snippet = if trimmed.len() > 500 {
            &trimmed[..500]
        } else {
            trimmed
        };
        return Err(format!(
            "dax governance evaluate exited with code {}: {}",
            output.status.code().unwrap_or(-1),
            snippet
        ));
    }

    String::from_utf8(output.stdout).map_err(|e| format!("dax produced non-utf8 output: {e}"))
}
