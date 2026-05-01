use serde::{Deserialize, Serialize};
use serde_json::Value;
use sqlx::sqlite::{SqliteConnectOptions, SqliteJournalMode, SqlitePoolOptions};
use sqlx::{Pool, QueryBuilder, Row, Sqlite};
use std::fs;
use std::path::{Path, PathBuf};
use uuid::Uuid;

const ROOK_EVENT_SCHEMA_VERSION: &str = "0.1.0";
const DEFAULT_EVENT_LIMIT: i64 = 200;
const MAX_EVENT_LIMIT: i64 = 1_000;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct RookEvent {
    pub schema_version: String,
    pub event_id: String,
    pub run_id: String,
    pub session_id: Option<String>,
    pub project_id: Option<String>,
    #[serde(rename = "type")]
    pub event_type: String,
    pub source: String,
    pub timestamp: String,
    pub data: Value,
    pub trace_id: Option<String>,
    pub parent_event_id: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RookEventInput {
    pub schema_version: Option<String>,
    pub event_id: Option<String>,
    pub run_id: String,
    pub session_id: Option<String>,
    pub project_id: Option<String>,
    #[serde(rename = "type")]
    pub event_type: String,
    pub source: String,
    pub timestamp: Option<String>,
    pub data: Option<Value>,
    pub trace_id: Option<String>,
    pub parent_event_id: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct RookEventFilter {
    pub run_id: Option<String>,
    pub session_id: Option<String>,
    pub project_id: Option<String>,
    #[serde(rename = "type")]
    pub event_type: Option<String>,
    pub limit: Option<i64>,
}

fn rook_events_db_path() -> Result<PathBuf, String> {
    let home = dirs::home_dir().ok_or("Could not determine home directory")?;
    Ok(home.join(".rook").join("events").join("rook-events.sqlite"))
}

async fn open_event_pool(db_path: &Path) -> Result<Pool<Sqlite>, String> {
    if let Some(parent) = db_path.parent() {
        fs::create_dir_all(parent)
            .map_err(|error| format!("Failed to create events directory: {}", error))?;
    }

    let options = SqliteConnectOptions::new()
        .filename(db_path)
        .create_if_missing(true)
        .journal_mode(SqliteJournalMode::Wal);

    let pool = SqlitePoolOptions::new()
        .max_connections(5)
        .connect_with(options)
        .await
        .map_err(|error| format!("Failed to open event store: {}", error))?;

    initialize_event_store(&pool).await?;
    Ok(pool)
}

async fn initialize_event_store(pool: &Pool<Sqlite>) -> Result<(), String> {
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS rook_events (
            event_id TEXT PRIMARY KEY,
            schema_version TEXT NOT NULL,
            run_id TEXT NOT NULL,
            session_id TEXT,
            project_id TEXT,
            event_type TEXT NOT NULL,
            source TEXT NOT NULL,
            timestamp TEXT NOT NULL,
            data_json TEXT NOT NULL,
            trace_id TEXT,
            parent_event_id TEXT,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
        "#,
    )
    .execute(pool)
    .await
    .map_err(|error| format!("Failed to initialize event store: {}", error))?;

    for index in [
        "CREATE INDEX IF NOT EXISTS idx_rook_events_run_timestamp ON rook_events(run_id, timestamp)",
        "CREATE INDEX IF NOT EXISTS idx_rook_events_session_timestamp ON rook_events(session_id, timestamp)",
        "CREATE INDEX IF NOT EXISTS idx_rook_events_project_timestamp ON rook_events(project_id, timestamp)",
        "CREATE INDEX IF NOT EXISTS idx_rook_events_type_timestamp ON rook_events(event_type, timestamp)",
    ] {
        sqlx::query(index)
            .execute(pool)
            .await
            .map_err(|error| format!("Failed to initialize event indexes: {}", error))?;
    }

    Ok(())
}

fn trim_optional(value: Option<String>) -> Option<String> {
    value
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
}

fn event_from_input(input: RookEventInput) -> Result<RookEvent, String> {
    let run_id = input.run_id.trim().to_string();
    let event_type = input.event_type.trim().to_string();
    let source = input.source.trim().to_string();

    if run_id.is_empty() {
        return Err("Event runId must not be empty".to_string());
    }
    if event_type.is_empty() {
        return Err("Event type must not be empty".to_string());
    }
    if source.is_empty() {
        return Err("Event source must not be empty".to_string());
    }

    Ok(RookEvent {
        schema_version: trim_optional(input.schema_version)
            .unwrap_or_else(|| ROOK_EVENT_SCHEMA_VERSION.to_string()),
        event_id: trim_optional(input.event_id).unwrap_or_else(|| Uuid::new_v4().to_string()),
        run_id,
        session_id: trim_optional(input.session_id),
        project_id: trim_optional(input.project_id),
        event_type,
        source,
        timestamp: trim_optional(input.timestamp)
            .unwrap_or_else(|| chrono::Utc::now().to_rfc3339()),
        data: input
            .data
            .unwrap_or_else(|| Value::Object(Default::default())),
        trace_id: trim_optional(input.trace_id),
        parent_event_id: trim_optional(input.parent_event_id),
    })
}

async fn append_event_at_path(db_path: &Path, input: RookEventInput) -> Result<RookEvent, String> {
    let event = event_from_input(input)?;
    let data_json = serde_json::to_string(&event.data)
        .map_err(|error| format!("Failed to serialize event data: {}", error))?;
    let pool = open_event_pool(db_path).await?;

    sqlx::query(
        r#"
        INSERT INTO rook_events (
            event_id,
            schema_version,
            run_id,
            session_id,
            project_id,
            event_type,
            source,
            timestamp,
            data_json,
            trace_id,
            parent_event_id
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        "#,
    )
    .bind(&event.event_id)
    .bind(&event.schema_version)
    .bind(&event.run_id)
    .bind(&event.session_id)
    .bind(&event.project_id)
    .bind(&event.event_type)
    .bind(&event.source)
    .bind(&event.timestamp)
    .bind(data_json)
    .bind(&event.trace_id)
    .bind(&event.parent_event_id)
    .execute(&pool)
    .await
    .map_err(|error| format!("Failed to append event: {}", error))?;

    Ok(event)
}

fn limit_for_filter(filter: &RookEventFilter) -> i64 {
    filter
        .limit
        .unwrap_or(DEFAULT_EVENT_LIMIT)
        .clamp(1, MAX_EVENT_LIMIT)
}

async fn list_events_at_path(
    db_path: &Path,
    filter: RookEventFilter,
) -> Result<Vec<RookEvent>, String> {
    let pool = open_event_pool(db_path).await?;
    let mut query = QueryBuilder::<Sqlite>::new(
        r#"
        SELECT
            schema_version,
            event_id,
            run_id,
            session_id,
            project_id,
            event_type,
            source,
            timestamp,
            data_json,
            trace_id,
            parent_event_id
        FROM rook_events
        WHERE 1 = 1
        "#,
    );

    if let Some(run_id) = trim_optional(filter.run_id.clone()) {
        query.push(" AND run_id = ");
        query.push_bind(run_id);
    }
    if let Some(session_id) = trim_optional(filter.session_id.clone()) {
        query.push(" AND session_id = ");
        query.push_bind(session_id);
    }
    if let Some(project_id) = trim_optional(filter.project_id.clone()) {
        query.push(" AND project_id = ");
        query.push_bind(project_id);
    }
    if let Some(event_type) = trim_optional(filter.event_type.clone()) {
        query.push(" AND event_type = ");
        query.push_bind(event_type);
    }

    query.push(" ORDER BY timestamp ASC, event_id ASC LIMIT ");
    query.push_bind(limit_for_filter(&filter));

    let rows = query
        .build()
        .fetch_all(&pool)
        .await
        .map_err(|error| format!("Failed to list events: {}", error))?;

    rows.into_iter()
        .map(|row| {
            let data_json: String = row.get("data_json");
            let data = serde_json::from_str(&data_json)
                .map_err(|error| format!("Failed to parse event data: {}", error))?;
            Ok(RookEvent {
                schema_version: row.get("schema_version"),
                event_id: row.get("event_id"),
                run_id: row.get("run_id"),
                session_id: row.get("session_id"),
                project_id: row.get("project_id"),
                event_type: row.get("event_type"),
                source: row.get("source"),
                timestamp: row.get("timestamp"),
                data,
                trace_id: row.get("trace_id"),
                parent_event_id: row.get("parent_event_id"),
            })
        })
        .collect()
}

#[tauri::command]
pub fn get_rook_events_db_path() -> Result<String, String> {
    rook_events_db_path().map(|path| path.to_string_lossy().into_owned())
}

#[tauri::command]
pub async fn append_rook_event(input: RookEventInput) -> Result<RookEvent, String> {
    append_event_at_path(&rook_events_db_path()?, input).await
}

#[tauri::command]
pub async fn list_rook_events(filter: Option<RookEventFilter>) -> Result<Vec<RookEvent>, String> {
    list_events_at_path(&rook_events_db_path()?, filter.unwrap_or_default()).await
}

#[cfg(test)]
mod tests {
    use super::{
        append_event_at_path, event_from_input, list_events_at_path, RookEventFilter,
        RookEventInput, ROOK_EVENT_SCHEMA_VERSION,
    };
    use serde_json::json;
    use tempfile::tempdir;

    fn input(event_type: &str, run_id: &str) -> RookEventInput {
        RookEventInput {
            schema_version: None,
            event_id: None,
            run_id: run_id.to_string(),
            session_id: Some("session-1".to_string()),
            project_id: Some("project-1".to_string()),
            event_type: event_type.to_string(),
            source: "rook".to_string(),
            timestamp: Some(format!("2026-05-01T00:00:0{}Z", run_id)),
            data: Some(json!({ "ok": true })),
            trace_id: None,
            parent_event_id: None,
        }
    }

    #[test]
    fn event_input_defaults_schema_event_id_timestamp_and_data() {
        let event = event_from_input(RookEventInput {
            schema_version: None,
            event_id: None,
            run_id: "run-1".to_string(),
            session_id: None,
            project_id: None,
            event_type: "run.started".to_string(),
            source: "rook".to_string(),
            timestamp: None,
            data: None,
            trace_id: None,
            parent_event_id: None,
        })
        .expect("event");

        assert_eq!(event.schema_version, ROOK_EVENT_SCHEMA_VERSION);
        assert_eq!(event.run_id, "run-1");
        assert_eq!(event.event_type, "run.started");
        assert!(event.event_id.len() > 20);
        assert!(event.data.is_object());
        assert!(event.timestamp.contains('T'));
    }

    #[test]
    fn event_input_rejects_missing_required_fields() {
        let mut event = input("run.started", "1");
        event.run_id = " ".to_string();
        assert!(event_from_input(event)
            .expect_err("invalid")
            .contains("runId"));
    }

    #[tokio::test]
    async fn appends_and_lists_events() {
        let dir = tempdir().expect("tempdir");
        let db_path = dir.path().join("events.sqlite");

        let first = append_event_at_path(&db_path, input("run.started", "1"))
            .await
            .expect("append first");
        let mut second_input = input("run.completed", "1");
        second_input.timestamp = Some("2026-05-01T00:00:02Z".to_string());
        let second = append_event_at_path(&db_path, second_input)
            .await
            .expect("append second");
        append_event_at_path(&db_path, input("run.started", "2"))
            .await
            .expect("append other run");

        let events = list_events_at_path(
            &db_path,
            RookEventFilter {
                run_id: Some("1".to_string()),
                ..Default::default()
            },
        )
        .await
        .expect("list");

        assert_eq!(events, vec![first, second]);
    }

    #[tokio::test]
    async fn filters_by_event_type_and_clamps_limit() {
        let dir = tempdir().expect("tempdir");
        let db_path = dir.path().join("events.sqlite");

        append_event_at_path(&db_path, input("intent.resolved", "1"))
            .await
            .expect("append first");
        append_event_at_path(&db_path, input("run.completed", "1"))
            .await
            .expect("append second");

        let events = list_events_at_path(
            &db_path,
            RookEventFilter {
                event_type: Some("intent.resolved".to_string()),
                limit: Some(10_000),
                ..Default::default()
            },
        )
        .await
        .expect("list");

        assert_eq!(events.len(), 1);
        assert_eq!(events[0].event_type, "intent.resolved");
    }
}
