use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};

const MAX_WORK_ITEM_BYTES: u64 = 1024 * 1024;

fn work_items_dir() -> Result<PathBuf, String> {
    let home = dirs::home_dir().ok_or("Could not determine home directory")?;
    Ok(home.join(".rook").join("work-items"))
}

fn now_timestamp() -> String {
    chrono::Utc::now().to_rfc3339()
}

fn generate_id() -> String {
    use std::collections::hash_map::DefaultHasher;
    use std::hash::{Hash, Hasher};
    use std::time::{SystemTime, UNIX_EPOCH};

    let nanos = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_nanos();
    let mut hasher = DefaultHasher::new();
    nanos.hash(&mut hasher);
    std::process::id().hash(&mut hasher);
    let h1 = hasher.finish();
    h1.hash(&mut hasher);
    let h2 = hasher.finish();
    format!(
        "wi-{:08x}-{:04x}-{:04x}-{:012x}",
        (h1 >> 32) as u32,
        (h1 >> 16) as u16,
        h1 as u16,
        h2 & 0xffffffffffff
    )
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct AcceptanceCriterion {
    pub id: String,
    pub text: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub status: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub source: Option<String>,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct WorkItem {
    pub id: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub key: Option<String>,
    pub title: String,
    pub source: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub url: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    #[serde(default)]
    pub acceptance_criteria: Vec<AcceptanceCriterion>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub project_id: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkItemInput {
    #[serde(default)]
    pub key: Option<String>,
    pub title: String,
    pub source: String,
    #[serde(default)]
    pub url: Option<String>,
    #[serde(default)]
    pub description: Option<String>,
    #[serde(default)]
    pub acceptance_criteria: Vec<AcceptanceCriterion>,
    #[serde(default)]
    pub project_id: Option<String>,
}

fn trim_optional(value: Option<String>) -> Option<String> {
    value
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
}

fn validate_source(source: &str) -> Result<(), String> {
    match source {
        "manual" | "jira" | "github_issue" | "linear" | "prd" => Ok(()),
        other => Err(format!("Unsupported work item source: {}", other)),
    }
}

fn validate_criterion_status(status: &str) -> Result<(), String> {
    match status {
        "unknown" | "covered" | "not_covered" | "needs_review" => Ok(()),
        other => Err(format!(
            "Unsupported acceptance criterion status: {}",
            other
        )),
    }
}

fn validate_criterion_source(source: &str) -> Result<(), String> {
    match source {
        "manual" | "imported" | "extracted" => Ok(()),
        other => Err(format!(
            "Unsupported acceptance criterion source: {}",
            other
        )),
    }
}

fn normalize_criteria(
    criteria: Vec<AcceptanceCriterion>,
) -> Result<Vec<AcceptanceCriterion>, String> {
    let mut normalized = Vec::with_capacity(criteria.len());
    for criterion in criteria {
        let id = criterion.id.trim().to_string();
        let text = criterion.text.trim().to_string();
        if id.is_empty() {
            return Err("Acceptance criterion id must not be empty".to_string());
        }
        if text.is_empty() {
            return Err("Acceptance criterion text must not be empty".to_string());
        }
        let status = trim_optional(criterion.status);
        if let Some(status) = status.as_deref() {
            validate_criterion_status(status)?;
        }
        let source = trim_optional(criterion.source);
        if let Some(source) = source.as_deref() {
            validate_criterion_source(source)?;
        }
        normalized.push(AcceptanceCriterion {
            id,
            text,
            status,
            source,
        });
    }
    Ok(normalized)
}

fn normalize_input(input: WorkItemInput) -> Result<WorkItemInput, String> {
    let title = input.title.trim().to_string();
    if title.is_empty() {
        return Err("Work item title must not be empty".to_string());
    }

    let source = input.source.trim().to_string();
    if source.is_empty() {
        return Err("Work item source must not be empty".to_string());
    }
    validate_source(&source)?;

    Ok(WorkItemInput {
        key: trim_optional(input.key),
        title,
        source,
        url: trim_optional(input.url),
        description: trim_optional(input.description),
        acceptance_criteria: normalize_criteria(input.acceptance_criteria)?,
        project_id: trim_optional(input.project_id),
    })
}

fn id_is_safe(id: &str) -> bool {
    !id.is_empty()
        && !id.contains('/')
        && !id.contains('\\')
        && !id.contains("..")
        && id
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_')
}

fn item_path(base: &Path, id: &str) -> Result<PathBuf, String> {
    if !id_is_safe(id) {
        return Err(format!("Invalid work item id: {}", id));
    }
    Ok(base.join(format!("{}.json", id)))
}

fn ensure_dir(base: &Path) -> Result<(), String> {
    fs::create_dir_all(base).map_err(|error| format!("Failed to prepare work-items dir: {}", error))
}

pub fn list_in(base: &Path) -> Result<Vec<WorkItem>, String> {
    if !base.exists() {
        return Ok(Vec::new());
    }
    let entries =
        fs::read_dir(base).map_err(|error| format!("Failed to read work-items dir: {}", error))?;
    let mut items = Vec::new();
    for entry in entries.flatten() {
        let path = entry.path();
        if path.extension().and_then(|s| s.to_str()) != Some("json") {
            continue;
        }
        let metadata = match fs::metadata(&path) {
            Ok(m) => m,
            Err(_) => continue,
        };
        if !metadata.is_file() || metadata.len() > MAX_WORK_ITEM_BYTES {
            continue;
        }
        let body = match fs::read_to_string(&path) {
            Ok(s) => s,
            Err(_) => continue,
        };
        let item: WorkItem = match serde_json::from_str(&body) {
            Ok(item) => item,
            Err(_) => continue,
        };
        items.push(item);
    }
    items.sort_by(|a, b| b.updated_at.cmp(&a.updated_at));
    Ok(items)
}

pub fn get_in(base: &Path, id: &str) -> Result<WorkItem, String> {
    let path = item_path(base, id)?;
    if !path.exists() {
        return Err(format!("Work item \"{}\" not found", id));
    }
    let body = fs::read_to_string(&path)
        .map_err(|error| format!("Failed to read work item: {}", error))?;
    serde_json::from_str(&body).map_err(|error| format!("Failed to parse work item: {}", error))
}

pub fn create_in(base: &Path, input: WorkItemInput) -> Result<WorkItem, String> {
    let input = normalize_input(input)?;
    ensure_dir(base)?;
    let now = now_timestamp();
    let item = WorkItem {
        id: generate_id(),
        key: input.key,
        title: input.title,
        source: input.source,
        url: input.url,
        description: input.description,
        acceptance_criteria: input.acceptance_criteria,
        project_id: input.project_id,
        created_at: now.clone(),
        updated_at: now,
    };
    let path = item_path(base, &item.id)?;
    let body = serde_json::to_string_pretty(&item)
        .map_err(|error| format!("Failed to serialize work item: {}", error))?;
    fs::write(&path, body).map_err(|error| format!("Failed to write work item: {}", error))?;
    Ok(item)
}

pub fn update_in(base: &Path, id: &str, input: WorkItemInput) -> Result<WorkItem, String> {
    let input = normalize_input(input)?;
    let existing = get_in(base, id)?;
    let updated = WorkItem {
        id: existing.id,
        key: input.key,
        title: input.title,
        source: input.source,
        url: input.url,
        description: input.description,
        acceptance_criteria: input.acceptance_criteria,
        project_id: input.project_id,
        created_at: existing.created_at,
        updated_at: now_timestamp(),
    };
    let path = item_path(base, &updated.id)?;
    let body = serde_json::to_string_pretty(&updated)
        .map_err(|error| format!("Failed to serialize work item: {}", error))?;
    fs::write(&path, body).map_err(|error| format!("Failed to write work item: {}", error))?;
    Ok(updated)
}

pub fn delete_in(base: &Path, id: &str) -> Result<(), String> {
    let path = item_path(base, id)?;
    if path.exists() {
        fs::remove_file(&path).map_err(|error| format!("Failed to delete work item: {}", error))?;
    }
    Ok(())
}

#[tauri::command]
pub fn list_work_items() -> Result<Vec<WorkItem>, String> {
    list_in(&work_items_dir()?)
}

#[tauri::command]
pub fn get_work_item(id: String) -> Result<WorkItem, String> {
    get_in(&work_items_dir()?, &id)
}

#[tauri::command]
pub fn create_work_item(input: WorkItemInput) -> Result<WorkItem, String> {
    create_in(&work_items_dir()?, input)
}

#[tauri::command]
pub fn update_work_item(id: String, input: WorkItemInput) -> Result<WorkItem, String> {
    update_in(&work_items_dir()?, &id, input)
}

#[tauri::command]
pub fn delete_work_item(id: String) -> Result<(), String> {
    delete_in(&work_items_dir()?, &id)
}

#[cfg(test)]
mod tests {
    use super::{create_in, delete_in, get_in, id_is_safe, list_in, update_in, WorkItemInput};
    use tempfile::tempdir;

    fn input(title: &str) -> WorkItemInput {
        WorkItemInput {
            key: Some("PROJ-1".into()),
            title: title.into(),
            source: "manual".into(),
            url: None,
            description: None,
            acceptance_criteria: Vec::new(),
            project_id: None,
        }
    }

    #[test]
    fn create_then_get_round_trips() {
        let dir = tempdir().expect("tempdir");
        let created = create_in(dir.path(), input("first")).expect("create");
        let fetched = get_in(dir.path(), &created.id).expect("get");
        assert_eq!(created, fetched);
        assert!(created.created_at.contains('T'));
    }

    #[test]
    fn list_returns_items_sorted_by_updated_desc() {
        let dir = tempdir().expect("tempdir");
        let first = create_in(dir.path(), input("first")).expect("first");
        std::thread::sleep(std::time::Duration::from_millis(2));
        let second = create_in(dir.path(), input("second")).expect("second");

        let items = list_in(dir.path()).expect("list");
        assert_eq!(items.len(), 2);
        assert_eq!(items[0].id, second.id);
        assert_eq!(items[1].id, first.id);
    }

    #[test]
    fn update_preserves_created_at_and_id() {
        let dir = tempdir().expect("tempdir");
        let created = create_in(dir.path(), input("original")).expect("create");
        std::thread::sleep(std::time::Duration::from_millis(2));
        let updated = update_in(
            dir.path(),
            &created.id,
            WorkItemInput {
                title: "renamed".into(),
                ..input("renamed")
            },
        )
        .expect("update");

        assert_eq!(updated.id, created.id);
        assert_eq!(updated.created_at, created.created_at);
        assert!(updated.updated_at >= created.updated_at);
        assert_eq!(updated.title, "renamed");
    }

    #[test]
    fn create_normalizes_and_validates_input() {
        let dir = tempdir().expect("tempdir");
        let created = create_in(
            dir.path(),
            WorkItemInput {
                key: Some(" PROJ-1 ".into()),
                title: "  normalized title ".into(),
                source: " manual ".into(),
                url: Some(" ".into()),
                description: Some("  useful context ".into()),
                acceptance_criteria: vec![super::AcceptanceCriterion {
                    id: " AC-1 ".into(),
                    text: "  Do the thing.  ".into(),
                    status: Some(" ".into()),
                    source: Some(" manual ".into()),
                }],
                project_id: Some(" project-1 ".into()),
            },
        )
        .expect("create");

        assert_eq!(created.key.as_deref(), Some("PROJ-1"));
        assert_eq!(created.title, "normalized title");
        assert_eq!(created.url, None);
        assert_eq!(created.description.as_deref(), Some("useful context"));
        assert_eq!(created.project_id.as_deref(), Some("project-1"));
        assert_eq!(created.acceptance_criteria[0].id, "AC-1");
        assert_eq!(created.acceptance_criteria[0].text, "Do the thing.");
        assert_eq!(created.acceptance_criteria[0].status, None);
        assert_eq!(
            created.acceptance_criteria[0].source.as_deref(),
            Some("manual")
        );
    }

    #[test]
    fn rejects_invalid_input() {
        let dir = tempdir().expect("tempdir");

        let error = create_in(dir.path(), input(" ")).expect_err("blank title");
        assert!(error.contains("title"));

        let error = create_in(
            dir.path(),
            WorkItemInput {
                source: "slack".into(),
                ..input("valid")
            },
        )
        .expect_err("bad source");
        assert!(error.contains("Unsupported"));

        let error = create_in(
            dir.path(),
            WorkItemInput {
                acceptance_criteria: vec![super::AcceptanceCriterion {
                    id: "AC-1".into(),
                    text: " ".into(),
                    status: None,
                    source: None,
                }],
                ..input("valid")
            },
        )
        .expect_err("bad criterion");
        assert!(error.contains("criterion text"));

        let error = create_in(
            dir.path(),
            WorkItemInput {
                acceptance_criteria: vec![super::AcceptanceCriterion {
                    id: "AC-1".into(),
                    text: "Valid criterion".into(),
                    status: Some("done".into()),
                    source: None,
                }],
                ..input("valid")
            },
        )
        .expect_err("bad criterion status");
        assert!(error.contains("criterion status"));

        let error = create_in(
            dir.path(),
            WorkItemInput {
                acceptance_criteria: vec![super::AcceptanceCriterion {
                    id: "AC-1".into(),
                    text: "Valid criterion".into(),
                    status: None,
                    source: Some("slack".into()),
                }],
                ..input("valid")
            },
        )
        .expect_err("bad criterion source");
        assert!(error.contains("criterion source"));
    }

    #[test]
    fn delete_removes_file_idempotently() {
        let dir = tempdir().expect("tempdir");
        let created = create_in(dir.path(), input("doomed")).expect("create");
        delete_in(dir.path(), &created.id).expect("delete");
        // second delete is a no-op
        delete_in(dir.path(), &created.id).expect("delete idempotent");
        let listed = list_in(dir.path()).expect("list");
        assert!(listed.is_empty());
    }

    #[test]
    fn list_skips_corrupt_or_oversize_entries() {
        let dir = tempdir().expect("tempdir");
        // valid item
        create_in(dir.path(), input("ok")).expect("ok");
        // corrupt JSON
        std::fs::write(dir.path().join("corrupt.json"), "not json").expect("corrupt file");
        // wrong extension — should be ignored silently
        std::fs::write(dir.path().join("readme.txt"), "hi").expect("txt");

        let items = list_in(dir.path()).expect("list");
        assert_eq!(items.len(), 1);
        assert_eq!(items[0].title, "ok");
    }

    #[test]
    fn rejects_unsafe_ids_in_path_construction() {
        let dir = tempdir().expect("tempdir");
        let error = get_in(dir.path(), "../etc/passwd").expect_err("rejected");
        assert!(error.contains("Invalid"));
        let error = get_in(dir.path(), "with/slash").expect_err("rejected");
        assert!(error.contains("Invalid"));
    }

    #[test]
    fn id_is_safe_predicate() {
        assert!(id_is_safe("wi-12345-abcd-ef01-deadbeefcafe"));
        assert!(id_is_safe("simple_id-123"));
        assert!(!id_is_safe(""));
        assert!(!id_is_safe("../escape"));
        assert!(!id_is_safe("with/slash"));
        assert!(!id_is_safe("with spaces"));
    }

    #[test]
    fn empty_dir_lists_as_empty() {
        let dir = tempdir().expect("tempdir");
        let listed = list_in(dir.path()).expect("list");
        assert!(listed.is_empty());
    }

    #[test]
    fn missing_dir_lists_as_empty() {
        let dir = tempdir().expect("tempdir");
        let missing = dir.path().join("does-not-exist");
        let listed = list_in(&missing).expect("list");
        assert!(listed.is_empty());
    }
}
