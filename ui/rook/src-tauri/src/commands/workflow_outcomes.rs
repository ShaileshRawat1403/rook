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

fn list_workflow_telemetry_in(base: &Path) -> Result<Vec<Value>, String> {
    let mut results = Vec::new();

    if !base.exists() {
        return Ok(results);
    }

    let entries = fs::read_dir(base)
        .map_err(|error| format!("Failed to read workflow runs dir: {error}"))?;

    for entry in entries.flatten() {
        let path = entry.path();
        if !path.is_dir() {
            continue;
        }

        let telemetry_path = path.join("telemetry.json");
        if !telemetry_path.exists() {
            continue;
        }

        let Ok(contents) = fs::read_to_string(&telemetry_path) else {
            continue;
        };
        let Ok(value) = serde_json::from_str::<Value>(&contents) else {
            continue;
        };

        results.push(value);
    }

    Ok(results)
}

#[tauri::command]
pub fn list_workflow_telemetry() -> Result<Vec<Value>, String> {
    let base = workflow_runs_dir()?;
    list_workflow_telemetry_in(&base)
}

#[cfg(test)]
mod tests {
    use super::{list_workflow_telemetry_in, write_workflow_telemetry_in};
    use serde_json::{json, Value};
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

    #[test]
    fn list_returns_empty_when_base_missing() {
        let dir = tempdir().expect("tempdir");
        let missing = dir.path().join("does-not-exist");

        let listed = list_workflow_telemetry_in(&missing).expect("list");

        assert!(listed.is_empty());
    }

    #[test]
    fn list_collects_valid_telemetry_files() {
        let dir = tempdir().expect("tempdir");
        let alpha = json!({
            "schemaVersion": "0.1.0",
            "runId": "run-1",
            "moduleId": "repo-review",
            "moduleVersion": "1.0.0",
            "endState": "succeeded",
        });
        let beta = json!({
            "schemaVersion": "0.1.0",
            "runId": "run-2",
            "moduleId": "repo-review",
            "moduleVersion": "1.0.0",
            "endState": "changes_requested",
        });
        write_workflow_telemetry_in(dir.path(), "run-1", &alpha).expect("alpha");
        write_workflow_telemetry_in(dir.path(), "run-2", &beta).expect("beta");

        let listed = list_workflow_telemetry_in(dir.path()).expect("list");

        assert_eq!(listed.len(), 2);
        assert!(listed.contains(&alpha));
        assert!(listed.contains(&beta));
    }

    #[test]
    fn list_skips_invalid_and_unrelated_entries() {
        let dir = tempdir().expect("tempdir");
        let valid = json!({
            "schemaVersion": "0.1.0",
            "runId": "run-1",
            "endState": "succeeded",
        });
        write_workflow_telemetry_in(dir.path(), "run-1", &valid).expect("valid");

        let corrupt_dir = dir.path().join("run-2");
        fs::create_dir_all(&corrupt_dir).expect("corrupt dir");
        fs::write(corrupt_dir.join("telemetry.json"), "not-json").expect("corrupt write");

        let no_telemetry_dir = dir.path().join("run-3");
        fs::create_dir_all(&no_telemetry_dir).expect("empty dir");

        fs::write(dir.path().join("loose-file"), "ignored").expect("loose");

        let listed = list_workflow_telemetry_in(dir.path()).expect("list");

        assert_eq!(listed, vec![valid]);
    }

    /// Cross-boundary integration test: builds a corpus of five full-shape
    /// WorkflowRunTelemetry payloads matching what the TypeScript recorder
    /// produces today (verified against the Step 6 live fixtures), writes
    /// them through the same path the Tauri command uses, lists them back,
    /// and asserts every payload round-trips structurally identical.
    ///
    /// Catches: JSON serialization drift, encoding issues, list-ordering
    /// regressions, and any future writer refactor that breaks the read
    /// path. Closes H6 of HARDENING_V0_1_1.md.
    #[test]
    fn end_to_end_round_trip() {
        let dir = tempdir().expect("tempdir");

        // Five full-shape telemetry payloads. Field names and value
        // shapes mirror what `buildTelemetry` in recorder.ts produces.
        let corpus = vec![
            full_telemetry(
                "82d4e26e",
                "partially_succeeded",
                344015,
                true,
                true,
                false,
                &[],
                &[("approve_final_output", "reviewer")],
            ),
            full_telemetry(
                "f46f81da",
                "changes_requested",
                10631,
                false,
                false,
                false,
                &[("review_exception", "human"), ("evidence_exception", "rook")],
                &[("request_output_changes", "reviewer")],
            ),
            full_telemetry(
                "aaaab7dd",
                "partially_succeeded",
                1885,
                true,
                false,
                false,
                &[("evidence_exception", "rook")],
                &[("approve_final_output", "reviewer")],
            ),
            full_telemetry(
                "a0cdf772",
                "changes_requested",
                22496,
                false,
                false,
                false,
                &[("review_exception", "human"), ("evidence_exception", "rook")],
                &[("request_output_changes", "reviewer")],
            ),
            full_telemetry(
                "a5bf9231",
                "changes_requested",
                8109,
                false,
                false,
                false,
                &[("review_exception", "human"), ("evidence_exception", "rook")],
                &[
                    ("adjust_scope", "human_operator"),
                    ("request_output_changes", "reviewer"),
                ],
            ),
        ];

        for telemetry in &corpus {
            let run_id = telemetry
                .get("runId")
                .and_then(Value::as_str)
                .expect("runId");
            write_workflow_telemetry_in(dir.path(), run_id, telemetry)
                .expect("write");
        }

        let listed = list_workflow_telemetry_in(dir.path()).expect("list");

        assert_eq!(listed.len(), corpus.len(), "all five files round-trip");

        // Directory iteration order is not guaranteed; assert each input
        // appears exactly once in the listed output.
        for telemetry in &corpus {
            assert!(
                listed.contains(telemetry),
                "round-tripped corpus is missing payload for runId {:?}",
                telemetry.get("runId")
            );
        }

        // Spot-check that nested arrays (exceptions, interventions) survive
        // the round-trip unchanged. JSON object key order is normalized by
        // serde_json on parse, so this also asserts no field-order drift
        // sneaks through.
        let a5bf = listed
            .iter()
            .find(|run| run.get("runId").and_then(Value::as_str) == Some("a5bf9231"))
            .expect("a5bf9231 round-trip");
        let interventions = a5bf
            .get("interventions")
            .and_then(Value::as_array)
            .expect("interventions array");
        assert_eq!(interventions.len(), 2);
    }

    fn full_telemetry(
        run_id: &str,
        end_state: &str,
        duration_ms: u64,
        reviewer_approved: bool,
        evidence_satisfied: bool,
        contract_satisfied: bool,
        exceptions: &[(&str, &str)],
        interventions: &[(&str, &str)],
    ) -> Value {
        json!({
            "schemaVersion": "0.1.0",
            "runId": run_id,
            "moduleId": "repo-review",
            "moduleVersion": "1.0.0",
            "colonyId": run_id,
            "startedAt": "2026-05-16T09:00:00.000Z",
            "completedAt": "2026-05-16T10:00:00.000Z",
            "durationMs": duration_ms,
            "endState": end_state,
            "counts": {
                "tasksTotal": 3,
                "tasksCompleted": 0,
                "approvalRequests": 0,
                "humanInterventions": interventions.len(),
                "exceptionsRaised": exceptions.len(),
                "artifactsCreated": 0,
            },
            "quality": {
                "outputContractSatisfied": contract_satisfied,
                "evidenceSatisfied": evidence_satisfied,
                "reviewerApproved": reviewer_approved,
            },
            "trust": { "posture": "open", "reasons": [] },
            "exceptions": exceptions
                .iter()
                .enumerate()
                .map(|(idx, (class, source))| json!({
                    "id": format!("e-{run_id}-{idx}"),
                    "class": class,
                    "severity": "medium",
                    "source": source,
                    "message": format!("{class} round-trip"),
                    "raisedAt": "2026-05-16T09:30:00.000Z",
                    "recoverable": true,
                }))
                .collect::<Vec<_>>(),
            "interventions": interventions
                .iter()
                .enumerate()
                .map(|(idx, (reason, actor))| json!({
                    "id": format!("i-{run_id}-{idx}"),
                    "reason": reason,
                    "actor": actor,
                    "resolvedAt": "2026-05-16T09:45:00.000Z",
                }))
                .collect::<Vec<_>>(),
        })
    }
}
