use crate::tui::events::{ApprovalDecision, RunEvent};
use crate::tui::state::{
    ApprovalRequest, FileChangeActivity, Item, MessageRole, RiskLevel, RunState, ShellActivity,
    Thread, Turn,
};
use chrono::{DateTime, Utc};

#[derive(Debug, Clone)]
pub struct ProjectedRun {
    pub thread: Thread,
    pub intervention: Option<ApprovalRequest>,
    pub run_state: RunState,
    pub posture: AuditPosture,
}

#[derive(Debug, Clone, PartialEq)]
pub enum AuditPosture {
    Guarded,
    Open,
    Blocked,
}

impl ProjectedRun {
    pub fn project(session_id: &str, events: &[RunEvent]) -> Self {
        let mut thread = Thread {
            id: session_id.to_string(),
            turns: Vec::new(),
        };
        let mut intervention = None;
        let mut run_state = RunState::Idle;
        let mut posture = AuditPosture::Guarded;

        for event in events {
            match event {
                RunEvent::RunStarted { .. } => {
                    run_state = RunState::Idle;
                }
                RunEvent::IntentCreated { prompt } => {
                    let dt = Utc::now();
                    add_item(
                        &mut thread,
                        &format!("intent-{}", dt.timestamp_millis()),
                        MessageRole::User,
                        Item::Text(prompt.clone()),
                        dt,
                    );
                    run_state = RunState::Understanding;
                }
                RunEvent::StepProposed {
                    call_id,
                    tool_name,
                    arguments,
                } => {
                    run_state = RunState::Planning;
                    let timestamp = Utc::now();
                    if is_shell_tool(tool_name) {
                        let command = extract_string_argument(
                            arguments.as_object().unwrap(),
                            &["cmd", "command", "input", "script"],
                        )
                        .unwrap_or_else(|| tool_name.clone());
                        add_item(
                            &mut thread,
                            call_id,
                            MessageRole::Assistant,
                            Item::Shell(ShellActivity {
                                id: call_id.clone(),
                                label: tool_name.clone(),
                                command,
                                output: String::new(),
                                exit_code: None,
                                is_running: true,
                            }),
                            timestamp,
                        );
                    } else if is_file_tool(tool_name) {
                        let file_path = extract_string_argument(
                            arguments.as_object().unwrap(),
                            &["path", "file_path", "file", "filename", "target_file"],
                        )
                        .unwrap_or_else(|| "workspace".to_string());
                        add_item(
                            &mut thread,
                            call_id,
                            MessageRole::Assistant,
                            Item::FileChange(FileChangeActivity {
                                id: call_id.clone(),
                                file_path,
                                description: tool_name.clone(),
                                risk_level: derive_risk_level(tool_name, arguments.as_object())
                                    .to_string()
                                    .to_lowercase(),
                                status: "pending".to_string(),
                            }),
                            timestamp,
                        );
                    } else {
                        add_item(
                            &mut thread,
                            call_id,
                            MessageRole::Assistant,
                            Item::Text(format!("Using `{}`.", tool_name)),
                            timestamp,
                        );
                    }
                }
                RunEvent::ApprovalRequested(request) => {
                    intervention = Some(request.clone());
                    run_state = RunState::WaitingForApproval;
                    posture = AuditPosture::Blocked;
                }
                RunEvent::ApprovalResolved { decision, .. } => {
                    intervention = None;
                    if *decision == ApprovalDecision::Approve {
                        run_state = RunState::Acting;
                        posture = AuditPosture::Guarded;
                    } else {
                        run_state = RunState::Idle;
                        posture = AuditPosture::Guarded;
                    }
                }
                RunEvent::StepStarted { .. } => {
                    run_state = RunState::Acting;
                }
                RunEvent::StepCompleted { call_id, result } => {
                    run_state = RunState::Verifying;
                    update_tool_result(&mut thread, call_id, result);
                }
                RunEvent::MessageAdded {
                    id,
                    role,
                    content,
                    timestamp,
                } => {
                    let dt =
                        DateTime::<Utc>::from_timestamp(*timestamp, 0).unwrap_or_else(Utc::now);
                    add_item(
                        &mut thread,
                        id,
                        role.clone(),
                        Item::Text(content.clone()),
                        dt,
                    );
                }
                RunEvent::RunCompleted => {
                    run_state = RunState::Completed;
                }
                RunEvent::RunFailed(err) => {
                    run_state = RunState::Error(err.clone());
                }
                _ => {}
            }
        }

        ProjectedRun {
            thread,
            intervention,
            run_state,
            posture,
        }
    }
}

fn add_item(
    thread: &mut Thread,
    turn_id: &str,
    role: MessageRole,
    item: Item,
    timestamp: DateTime<Utc>,
) {
    let is_stream_role = role == MessageRole::Assistant || role == MessageRole::System;

    if let Some(last_turn) = thread.turns.last_mut() {
        if last_turn.role == role {
            if let Item::Text(new_content) = &item {
                if let Some(Item::Text(existing)) = last_turn.items.last_mut() {
                    if is_stream_role {
                        if new_content.starts_with(existing.as_str()) {
                            *existing = new_content.clone();
                        } else if existing.starts_with(new_content.as_str()) {
                            // ignore, existing is already ahead
                        } else {
                            existing.push_str(new_content);
                        }
                    } else {
                        existing.push_str(new_content);
                    }
                    return;
                }
            }
            last_turn.items.push(item);
            return;
        }
    }

    thread.turns.push(Turn {
        id: turn_id.to_string(),
        role,
        items: vec![item],
        timestamp,
    });
}

fn update_tool_result(
    thread: &mut Thread,
    call_id: &str,
    result: &Result<serde_json::Value, String>,
) {
    for turn in thread.turns.iter_mut().rev() {
        for item in turn.items.iter_mut().rev() {
            match item {
                Item::Shell(activity) if activity.id == call_id => {
                    activity.is_running = false;
                    activity.exit_code = Some(if result.is_ok() { 0 } else { 1 });
                    activity.output = match result {
                        Ok(val) => val.to_string(),
                        Err(e) => e.clone(),
                    };
                    return;
                }
                Item::FileChange(activity) if activity.id == call_id => {
                    activity.status = if result.is_ok() {
                        "applied".to_string()
                    } else {
                        "failed".to_string()
                    };
                    return;
                }
                _ => {}
            }
        }
    }
}

fn is_shell_tool(tool_name: &str) -> bool {
    let lower = tool_name.to_ascii_lowercase();
    ["shell", "command", "terminal", "exec", "bash"]
        .iter()
        .any(|needle| lower.contains(needle))
}

fn is_file_tool(tool_name: &str) -> bool {
    let lower = tool_name.to_ascii_lowercase();
    ["apply_patch", "write", "edit", "file", "save"]
        .iter()
        .any(|needle| lower.contains(needle))
}

fn derive_risk_level(
    tool_name: &str,
    arguments: Option<&serde_json::Map<String, serde_json::Value>>,
) -> RiskLevel {
    let lower = tool_name.to_ascii_lowercase();
    let command = arguments
        .and_then(|args| extract_string_argument(args, &["cmd", "command"]))
        .unwrap_or_default()
        .to_ascii_lowercase();
    if lower.contains("delete") || lower.contains("reset") || command.contains("rm ") {
        return RiskLevel::High;
    }
    if lower.contains("patch") || lower.contains("write") || lower.contains("edit") {
        return RiskLevel::Medium;
    }
    RiskLevel::Low
}

fn extract_string_argument(
    arguments: &serde_json::Map<String, serde_json::Value>,
    keys: &[&str],
) -> Option<String> {
    keys.iter().find_map(|key| {
        arguments.get(*key).and_then(|value| match value {
            serde_json::Value::String(s) => Some(s.clone()),
            serde_json::Value::Array(items) => Some(
                items
                    .iter()
                    .filter_map(|item| item.as_str())
                    .collect::<Vec<_>>()
                    .join(" "),
            ),
            _ => None,
        })
    })
}
