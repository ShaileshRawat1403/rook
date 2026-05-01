use regorus::Engine;
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OpenActionPolicyInput {
    pub workspace_path: String,
    pub target_path: String,
    pub action: String,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PolicyDecision {
    pub allow: bool,
    pub needs_approval: bool,
    pub blocked_reason: Option<String>,
}

const OPEN_ACTION_POLICY: &str = include_str!("../../policies/open_action.rego");

#[derive(Debug, Serialize)]
struct OpenActionPolicyEvaluationInput {
    workspace_path: String,
    target_path: String,
    target_path_lower: String,
    action: String,
    is_inside_workspace: bool,
    is_workspace_root: bool,
}

fn canonicalize_for_policy(path: &str, label: &str) -> Result<PathBuf, String> {
    let trimmed = path.trim();
    if trimmed.is_empty() {
        return Err(format!("{} path must not be empty", label));
    }
    Path::new(trimmed)
        .canonicalize()
        .map_err(|error| format!("{} path is not accessible: {}", label, error))
}

fn normalize_action(action: &str) -> Result<String, String> {
    match action.trim() {
        "editor" => Ok("editor".to_string()),
        "terminal" => Ok("terminal".to_string()),
        other => Err(format!("Unsupported open action: {}", other)),
    }
}

fn build_evaluation_input(
    input: &OpenActionPolicyInput,
) -> Result<OpenActionPolicyEvaluationInput, String> {
    let action = normalize_action(&input.action)?;
    let workspace = canonicalize_for_policy(&input.workspace_path, "Workspace")?;
    let target = canonicalize_for_policy(&input.target_path, "Target")?;
    let is_inside_workspace = target == workspace || target.starts_with(&workspace);
    let workspace_path = workspace.to_string_lossy().into_owned();
    let target_path = target.to_string_lossy().into_owned();

    Ok(OpenActionPolicyEvaluationInput {
        workspace_path,
        target_path_lower: target_path.to_lowercase(),
        target_path,
        action,
        is_inside_workspace,
        is_workspace_root: target == workspace,
    })
}

fn query_bool(engine: &mut Engine, query: &str) -> Result<bool, String> {
    let result = engine
        .eval_query(query.to_string(), false)
        .map_err(|error| format!("Failed to evaluate policy query '{}': {}", query, error))?;

    Ok(result
        .result
        .first()
        .and_then(|row| row.expressions.first())
        .and_then(|expression| expression.value.as_bool().ok())
        .copied()
        .unwrap_or(false))
}

pub fn evaluate_open_action(input: &OpenActionPolicyInput) -> Result<PolicyDecision, String> {
    let evaluation_input = build_evaluation_input(input)?;
    let mut engine = Engine::new();
    engine
        .add_policy(
            "open_action.rego".to_string(),
            OPEN_ACTION_POLICY.to_string(),
        )
        .map_err(|error| format!("Failed to parse policy: {}", error))?;

    let input_json = serde_json::to_string(&evaluation_input).map_err(|error| error.to_string())?;
    let regorus_input =
        regorus::Value::from_json_str(&input_json).map_err(|error| error.to_string())?;
    engine.set_input(regorus_input);

    let allow = query_bool(&mut engine, "data.rook.open_action.allow")?;
    let needs_approval = query_bool(&mut engine, "data.rook.open_action.needs_approval")?;

    let blocked_reason = if !allow && !needs_approval {
        Some("Target path is outside the workspace or blocked by policy.".to_string())
    } else {
        None
    };

    Ok(PolicyDecision {
        allow,
        needs_approval,
        blocked_reason,
    })
}

#[cfg(test)]
mod tests {
    use super::{evaluate_open_action, OpenActionPolicyInput};
    use std::fs;
    use tempfile::tempdir;

    fn input(workspace_path: String, target_path: String, action: &str) -> OpenActionPolicyInput {
        OpenActionPolicyInput {
            workspace_path,
            target_path,
            action: action.to_string(),
        }
    }

    #[test]
    fn allows_normal_file_inside_workspace() {
        let dir = tempdir().expect("tempdir");
        let target = dir.path().join("src").join("main.rs");
        fs::create_dir_all(target.parent().expect("parent")).expect("parent");
        fs::write(&target, "fn main() {}").expect("file");

        let decision = evaluate_open_action(&input(
            dir.path().to_string_lossy().into_owned(),
            target.to_string_lossy().into_owned(),
            "editor",
        ))
        .expect("decision");

        assert!(decision.allow);
        assert!(!decision.needs_approval);
        assert_eq!(decision.blocked_reason, None);
    }

    #[test]
    fn blocks_prefix_sibling_paths() {
        let root = tempdir().expect("root");
        let workspace = root.path().join("repo");
        let sibling = root.path().join("repo-other");
        fs::create_dir_all(&workspace).expect("workspace");
        fs::create_dir_all(&sibling).expect("sibling");
        let target = sibling.join("main.rs");
        fs::write(&target, "fn main() {}").expect("file");

        let decision = evaluate_open_action(&input(
            workspace.to_string_lossy().into_owned(),
            target.to_string_lossy().into_owned(),
            "editor",
        ))
        .expect("decision");

        assert!(!decision.allow);
        assert!(!decision.needs_approval);
        assert!(decision.blocked_reason.is_some());
    }

    #[test]
    fn requires_approval_for_sensitive_files() {
        let dir = tempdir().expect("tempdir");
        let target = dir.path().join(".env");
        fs::write(&target, "TOKEN=secret").expect("file");

        let decision = evaluate_open_action(&input(
            dir.path().to_string_lossy().into_owned(),
            target.to_string_lossy().into_owned(),
            "editor",
        ))
        .expect("decision");

        assert!(!decision.allow);
        assert!(decision.needs_approval);
    }

    #[test]
    fn requires_approval_for_terminal_at_workspace_root() {
        let dir = tempdir().expect("tempdir");

        let decision = evaluate_open_action(&input(
            dir.path().to_string_lossy().into_owned(),
            dir.path().to_string_lossy().into_owned(),
            "terminal",
        ))
        .expect("decision");

        assert!(!decision.allow);
        assert!(decision.needs_approval);
    }

    #[test]
    fn allows_editor_at_workspace_root() {
        let dir = tempdir().expect("tempdir");

        let decision = evaluate_open_action(&input(
            dir.path().to_string_lossy().into_owned(),
            dir.path().to_string_lossy().into_owned(),
            "editor",
        ))
        .expect("decision");

        assert!(decision.allow);
        assert!(!decision.needs_approval);
    }

    #[test]
    #[cfg(unix)]
    fn canonical_target_detects_symlinked_sensitive_file() {
        use std::os::unix::fs::symlink;

        let dir = tempdir().expect("tempdir");
        let sensitive = dir.path().join(".env");
        let link = dir.path().join("config-link");
        fs::write(&sensitive, "TOKEN=secret").expect("file");
        symlink(&sensitive, &link).expect("symlink");

        let decision = evaluate_open_action(&input(
            dir.path().to_string_lossy().into_owned(),
            link.to_string_lossy().into_owned(),
            "editor",
        ))
        .expect("decision");

        assert!(!decision.allow);
        assert!(decision.needs_approval);
    }
}
