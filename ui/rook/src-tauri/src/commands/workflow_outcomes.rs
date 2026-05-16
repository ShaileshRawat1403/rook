use serde_json::Value;
use std::fs;
use std::path::{Path, PathBuf};
use uuid::Uuid;

fn run_id_is_safe(run_id: &str) -> bool {
    !run_id.is_empty()
        && !run_id.contains('/')
        && !run_id.contains('\\')
        && !run_id.contains("..")
}

fn workflow_runs_dir() -> Result<PathBuf, String> {
    let home = dirs::home_dir().ok_or("Could not determine home directory")?;
    Ok(home.join(".rook").join("runs"))
}

fn display_telemetry_path(run_id: &str) -> String {
    format!("~/.rook/runs/{run_id}/telemetry.json")
}

fn has_completed_at(path: &Path) -> bool {
    let Ok(contents) = fs::read_to_string(path) else {
        return false;
    };
    let Ok(value) = serde_json::from_str::<Value>(&contents) else {
        return false;
    };

    value
        .get("completedAt")
        .and_then(Value::as_str)
        .map(str::trim)
        .is_some_and(|completed_at| !completed_at.is_empty())
}

fn write_workflow_telemetry_in(
    base: &Path,
    run_id: &str,
    telemetry: &Value,
) -> Result<PathBuf, String> {
    if !run_id_is_safe(run_id) {
        return Err("Workflow run id is not safe for filesystem use".to_string());
    }

    let run_dir = base.join(run_id);
    fs::create_dir_all(&run_dir)
        .map_err(|error| format!("Failed to prepare workflow run dir: {error}"))?;

    let telemetry_path = run_dir.join("telemetry.json");
    if telemetry_path.exists() && has_completed_at(&telemetry_path) {
        return Ok(telemetry_path);
    }

    let body = serde_json::to_string_pretty(telemetry)
        .map_err(|error| format!("Failed to serialize workflow telemetry: {error}"))?;
    let temp_path = run_dir.join(format!("telemetry.json.{}.tmp", Uuid::new_v4()));

    fs::write(&temp_path, body)
        .map_err(|error| format!("Failed to write workflow telemetry: {error}"))?;
    fs::rename(&temp_path, &telemetry_path)
        .map_err(|error| format!("Failed to finalize workflow telemetry: {error}"))?;

    Ok(telemetry_path)
}

#[tauri::command]
pub fn write_workflow_telemetry(run_id: String, telemetry: Value) -> Result<String, String> {
    let base = workflow_runs_dir()?;
    write_workflow_telemetry_in(&base, &run_id, &telemetry)?;

    Ok(display_telemetry_path(&run_id))
}

#[cfg(test)]
mod tests {
    use super::write_workflow_telemetry_in;
    use serde_json::json;
    use std::fs;
    use tempfile::tempdir;

    #[test]
    fn writes_valid_telemetry_file() {
        let dir = tempdir().expect("tempdir");
        let telemetry = json!({
            "schemaVersion": "0.1.0",
            "runId": "run-1",
            "completedAt": "2026-05-16T10:00:00Z",
        });

        let path =
            write_workflow_telemetry_in(dir.path(), "run-1", &telemetry).expect("write telemetry");
        let body = fs::read_to_string(path).expect("telemetry file");
        let parsed: serde_json::Value = serde_json::from_str(&body).expect("valid json");

        assert_eq!(parsed, telemetry);
    }

    #[test]
    fn completed_telemetry_is_not_mutated() {
        let dir = tempdir().expect("tempdir");
        let first = json!({
            "schemaVersion": "0.1.0",
            "runId": "run-1",
            "completedAt": "2026-05-16T10:00:00Z",
        });
        let second = json!({
            "schemaVersion": "0.1.0",
            "runId": "run-1",
            "completedAt": "2026-05-16T11:00:00Z",
        });

        let path =
            write_workflow_telemetry_in(dir.path(), "run-1", &first).expect("first write");
        write_workflow_telemetry_in(dir.path(), "run-1", &second).expect("second write");
        let body = fs::read_to_string(path).expect("telemetry file");
        let parsed: serde_json::Value = serde_json::from_str(&body).expect("valid json");

        assert_eq!(parsed, first);
    }
}
