use ratatui::style::Color;

pub const TEXT_PRIMARY: Color = Color::Rgb(224, 228, 235);
pub const TEXT_MUTED: Color = Color::Rgb(126, 133, 146);
pub const CYAN: Color = Color::Rgb(93, 201, 255);
pub const GREEN: Color = Color::Rgb(113, 209, 146);
pub const YELLOW: Color = Color::Rgb(245, 204, 92);
pub const RED: Color = Color::Rgb(255, 120, 120);

use chrono::{DateTime, Utc};
use rook::agents::AgentEvent;
use rook::conversation::message::{ActionRequiredData, MessageContent};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::HashMap;
use std::sync::{Arc, Mutex};

use crate::tui::events::RunEvent;
use crate::tui::projection::ProjectedRun;

/// 💎 Codex Primitive: The smallest unit of interaction
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum Item {
    Text(String),
    Thinking(String),
    Shell(ShellActivity),
    FileChange(FileChangeActivity),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ShellActivity {
    pub id: String,
    pub label: String,
    pub command: String,
    pub output: String,
    pub exit_code: Option<i32>,
    pub is_running: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileChangeActivity {
    pub id: String,
    pub file_path: String,
    pub description: String,
    pub risk_level: String,
    pub status: String,
}

#[derive(Debug, Clone)]
pub struct ProviderConfigField {
    pub name: String,
    pub required: bool,
    pub secret: bool,
    pub default: Option<String>,
    pub oauth_flow: bool,
    pub device_code_flow: bool,
    pub primary: bool,
}

#[derive(Debug, Clone)]
pub struct ProviderOption {
    pub name: String,
    pub display_name: String,
    pub description: String,
    pub default_model: String,
    pub known_models: Vec<String>,
    pub setup_steps: Vec<String>,
    pub config_keys: Vec<ProviderConfigField>,
}

/// 💎 Codex Primitive: A single exchange (User or Assistant)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Turn {
    pub id: String,
    pub role: MessageRole,
    pub items: Vec<Item>,
    pub timestamp: DateTime<Utc>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum MessageRole {
    User,
    Assistant,
    System,
}

/// 💎 Codex Primitive: The complete conversation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Thread {
    pub id: String,
    pub turns: Vec<Turn>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApprovalRequest {
    pub id: String,
    pub tool_name: String,
    pub command: Option<String>,
    pub file_path: Option<String>,
    pub diff: Option<String>,
    pub risk_level: RiskLevel,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum RiskLevel {
    Low,
    Medium,
    High,
    Critical,
}

impl RiskLevel {
    pub fn to_string(&self) -> &'static str {
        match self {
            RiskLevel::Low => "LOW",
            RiskLevel::Medium => "MEDIUM",
            RiskLevel::High => "HIGH",
            RiskLevel::Critical => "CRITICAL",
        }
    }

    pub fn to_emoji(&self) -> &'static str {
        match self {
            RiskLevel::Low => "🟢",
            RiskLevel::Medium => "🟡",
            RiskLevel::High => "🟠",
            RiskLevel::Critical => "🔴",
        }
    }
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum RunState {
    Idle,
    Understanding,
    Planning,
    Acting,
    Verifying,
    WaitingForApproval,
    Completed,
    Error(String),
}

impl std::fmt::Display for RunState {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        let s = match self {
            RunState::Idle => "IDLE",
            RunState::Understanding => "UNDERSTANDING",
            RunState::Planning => "PLANNING",
            RunState::Acting => "ACTING",
            RunState::Verifying => "VERIFYING",
            RunState::WaitingForApproval => "AWAITING APPROVAL",
            RunState::Completed => "COMPLETED",
            RunState::Error(e) => return write!(f, "ERROR: {}", e),
        };
        write!(f, "{}", s)
    }
}

/// 🛠️ Configuration State Machine for high-fidelity setup
#[derive(Debug, Clone, PartialEq)]
pub enum ConfigStep {
    None,
    SelectProvider,
    EnterConfigKey,
    OAuthConfig,
    SelectModel,
    ConfirmAdvancedSettings,
}

#[derive(Debug, Clone)]
pub struct AppState {
    pub events: Vec<RunEvent>,
    pub projected: ProjectedRun,

    pub is_processing: bool,
    pub input_buffer: String,
    pub chat_scroll: u16,
    pub active_model: String,
    pub active_provider: String,
    pub sandbox: bool,

    // UI State for Overlays
    pub show_command_palette: bool,
    pub selected_command_index: usize,

    // Selection Modal state
    pub show_selection_modal: bool,
    pub selection_modal_title: String,
    pub selection_modal_items: Vec<String>,
    pub selection_modal_details: Vec<String>,
    pub selection_modal_index: usize,

    // Config Wizard state
    pub config_step: ConfigStep,
    pub temp_provider: String,
    pub pending_model: Option<String>,
    pub temp_key: String,
    pub available_providers: Vec<ProviderOption>,
    pub selected_provider: Option<ProviderOption>,
    pub pending_primary_keys: Vec<ProviderConfigField>,
    pub pending_advanced_keys: Vec<ProviderConfigField>,
    pub pending_key_index: usize,
    pub temp_config_values: HashMap<String, String>,
}

impl AppState {
    pub fn new(session_id: String) -> Self {
        let events = vec![RunEvent::RunStarted {
            session_id: session_id.clone(),
        }];
        let projected = ProjectedRun::project(&session_id, &events);
        Self {
            events,
            projected,
            is_processing: false,
            input_buffer: String::new(),
            chat_scroll: 0,
            active_model: "gpt-4o".to_string(),
            active_provider: "openai".to_string(),
            sandbox: false,
            show_command_palette: false,
            selected_command_index: 0,
            show_selection_modal: false,
            selection_modal_title: String::new(),
            selection_modal_items: Vec::new(),
            selection_modal_details: Vec::new(),
            selection_modal_index: 0,
            config_step: ConfigStep::None,
            temp_provider: String::new(),
            pending_model: None,
            temp_key: String::new(),
            available_providers: Vec::new(),
            selected_provider: None,
            pending_primary_keys: Vec::new(),
            pending_advanced_keys: Vec::new(),
            pending_key_index: 0,
            temp_config_values: HashMap::new(),
        }
    }

    pub fn emit(&mut self, event: RunEvent) {
        self.events.push(event);
        self.projected = ProjectedRun::project(&self.projected.thread.id, &self.events);
    }
}

pub type SharedState = Arc<Mutex<AppState>>;

pub enum TuiEvent {
    Input(crossterm::event::KeyEvent),
    Agent(AgentEvent),
    SessionError(String),
    Tick,
}

#[derive(Debug, Clone)]
pub enum AppCommand {
    SubmitPrompt(String),
    ReloadSession,
    Approve(String),
    Reject(String),
}

impl AppState {
    pub fn add_message(&mut self, role: MessageRole, content: String) {
        self.emit(RunEvent::MessageAdded {
            id: format!("msg-{}", Utc::now().timestamp_millis()),
            role,
            content,
            timestamp: Utc::now().timestamp(),
        });
        self.chat_scroll = 0;
    }

    pub fn handle_agent_event(&mut self, event: AgentEvent) {
        match event {
            AgentEvent::Message(msg) => {
                let role = match msg.role {
                    rmcp::model::Role::User => MessageRole::User,
                    rmcp::model::Role::Assistant => MessageRole::Assistant,
                };
                let timestamp = msg.created;
                for content in msg.content {
                    match content {
                        MessageContent::Text(text) => {
                            self.emit(RunEvent::MessageAdded {
                                id: msg
                                    .id
                                    .clone()
                                    .unwrap_or_else(|| format!("msg-{}", timestamp)),
                                role: role.clone(),
                                content: text.text.clone(),
                                timestamp,
                            });
                        }
                        MessageContent::ActionRequired(action) => {
                            if let ActionRequiredData::ToolConfirmation {
                                id,
                                tool_name,
                                arguments,
                                ..
                            } = action.data
                            {
                                self.emit(RunEvent::ApprovalRequested(ApprovalRequest {
                                    id,
                                    tool_name: tool_name.clone(),
                                    command: extract_string_argument(
                                        &arguments,
                                        &["cmd", "command"],
                                    ),
                                    file_path: extract_string_argument(
                                        &arguments,
                                        &["path", "file_path", "file", "filename"],
                                    ),
                                    diff: None,
                                    risk_level: derive_risk_level(&tool_name, Some(&arguments)),
                                }));
                            }
                        }
                        MessageContent::ToolRequest(req) => {
                            self.emit(RunEvent::StepProposed {
                                call_id: req.id,
                                tool_name: req
                                    .tool_call
                                    .as_ref()
                                    .map(|tc| tc.name.to_string())
                                    .unwrap_or_default(),
                                arguments: req
                                    .tool_call
                                    .as_ref()
                                    .map(|tc| {
                                        Value::Object(tc.arguments.clone().unwrap_or_default())
                                    })
                                    .unwrap_or_default(),
                            });
                        }
                        MessageContent::ToolResponse(resp) => {
                            self.emit(RunEvent::StepCompleted {
                                call_id: resp.id.clone(),
                                result: match &resp.tool_result {
                                    Ok(val) => Ok(serde_json::to_value(val).unwrap_or_default()),
                                    Err(err) => Err(err.to_string()),
                                },
                            });
                        }
                        _ => {}
                    }
                }
            }
            AgentEvent::RunStateChanged(state) => match state {
                rook::agents::RunState::Idle => self.emit(RunEvent::RunCompleted),
                rook::agents::RunState::Error(e) => self.emit(RunEvent::RunFailed(e)),
                rook::agents::RunState::Acting => self.emit(RunEvent::StepStarted {
                    call_id: "active".to_string(),
                }),
                _ => {}
            },
            _ => {}
        }
    }

    pub fn add_user_message(&mut self, content: String) {
        self.add_message(MessageRole::User, content);
    }

    pub fn scroll_chat_up(&mut self) {
        self.chat_scroll = self.chat_scroll.saturating_add(1);
    }

    pub fn scroll_chat_down(&mut self) {
        self.chat_scroll = self.chat_scroll.saturating_sub(1);
    }

    pub fn set_available_providers(&mut self, providers: Vec<ProviderOption>) {
        self.available_providers = providers;
    }

    pub fn begin_provider_setup(&mut self, provider_index: usize) {
        let Some(provider) = self.available_providers.get(provider_index).cloned() else {
            return;
        };

        self.temp_provider = provider.name.clone();
        self.pending_model = None;
        self.selected_provider = Some(provider.clone());
        self.pending_key_index = 0;
        self.temp_config_values.clear();
        self.pending_primary_keys = provider
            .config_keys
            .iter()
            .filter(|key| key.primary || key.oauth_flow)
            .cloned()
            .collect();
        self.pending_advanced_keys = provider
            .config_keys
            .iter()
            .filter(|key| !key.primary && !key.oauth_flow)
            .cloned()
            .collect();
        self.selection_modal_title = provider.display_name.clone();
        self.selection_modal_items.clear();
        self.selection_modal_details.clear();
        self.show_selection_modal = false;
        self.push_provider_summary(&provider);
        self.advance_provider_setup();
    }

    pub fn current_provider_key(&self) -> Option<&ProviderConfigField> {
        self.pending_primary_keys.get(self.pending_key_index)
    }

    pub fn current_provider_key_label(&self) -> Option<String> {
        let key = self.current_provider_key()?;
        let mode = if key.oauth_flow {
            if key.device_code_flow {
                "device code"
            } else {
                "browser sign-in"
            }
        } else if key.secret {
            "secret"
        } else {
            "setting"
        };
        Some(format!("{} ({})", key.name, mode))
    }

    pub fn store_current_provider_input(&mut self, input: String) -> bool {
        let Some(key) = self.current_provider_key().cloned() else {
            return false;
        };
        if key.required && input.trim().is_empty() {
            self.add_message(
                MessageRole::System,
                format!("{} is required for {}.", key.name, self.temp_provider),
            );
            return false;
        }
        if !input.trim().is_empty() {
            self.temp_config_values.insert(key.name, input);
        }
        self.pending_key_index += 1;
        true
    }

    pub fn advance_provider_setup(&mut self) {
        if let Some(key) = self.current_provider_key() {
            self.config_step = if key.oauth_flow {
                ConfigStep::OAuthConfig
            } else {
                ConfigStep::EnterConfigKey
            };
            self.input_buffer.clear();
            return;
        }

        if let Some(provider) = &self.selected_provider {
            let models = if provider.known_models.is_empty() {
                vec![provider.default_model.clone()]
            } else {
                provider.known_models.clone()
            };
            self.open_model_selection(models);
        }
    }

    pub fn open_model_selection(&mut self, models: Vec<String>) {
        let provider_name = self
            .selected_provider
            .as_ref()
            .map(|provider| provider.display_name.clone())
            .unwrap_or_else(|| "PROVIDER".to_string());
        self.selection_modal_title = format!("{} MODELS", provider_name);
        self.selection_modal_index = models
            .iter()
            .position(|model| {
                Some(model) == self.pending_model.as_ref() || *model == self.active_model
            })
            .unwrap_or(0);
        self.selection_modal_details = models
            .iter()
            .map(|model| {
                if self
                    .selected_provider
                    .as_ref()
                    .map(|provider| provider.default_model == *model)
                    .unwrap_or(false)
                {
                    "Recommended default model".to_string()
                } else {
                    "Available model".to_string()
                }
            })
            .collect();
        self.selection_modal_items = models;
        self.show_selection_modal = true;
        self.config_step = ConfigStep::SelectModel;
    }

    fn push_provider_summary(&mut self, provider: &ProviderOption) {
        let mut lines = vec![
            format!("Provider: {}", provider.display_name),
            provider.description.clone(),
            format!("Default model: {}", provider.default_model),
        ];

        if !provider.setup_steps.is_empty() {
            lines.push("Setup steps:".to_string());
            for step in provider.setup_steps.iter().take(3) {
                lines.push(format!("  - {}", step));
            }
        }

        let primary_keys: Vec<String> = provider
            .config_keys
            .iter()
            .filter(|key| key.primary || key.oauth_flow)
            .map(|key| {
                if key.oauth_flow {
                    format!("{} via OAuth", key.name)
                } else {
                    key.name.clone()
                }
            })
            .collect();
        if !primary_keys.is_empty() {
            lines.push(format!(
                "Auth and primary settings: {}",
                primary_keys.join(", ")
            ));
        }

        self.add_message(MessageRole::System, lines.join("\n"));
    }

    pub fn open_provider_selection(&mut self) {
        self.config_step = ConfigStep::SelectProvider;
        self.selection_modal_title = "CHOOSE PROVIDER".to_string();
        self.selection_modal_items = self
            .available_providers
            .iter()
            .map(|provider| provider.display_name.clone())
            .collect();
        self.selection_modal_details = self
            .available_providers
            .iter()
            .map(|provider| provider.description.clone())
            .collect();
        self.selection_modal_index = self
            .available_providers
            .iter()
            .position(|provider| provider.name == self.active_provider)
            .unwrap_or(0);
        self.show_selection_modal = true;
    }
}

fn extract_string_argument(
    arguments: &serde_json::Map<String, Value>,
    keys: &[&str],
) -> Option<String> {
    keys.iter().find_map(|key| {
        arguments.get(*key).and_then(|value| match value {
            Value::String(s) => Some(s.clone()),
            Value::Array(items) => Some(
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

fn derive_risk_level(
    tool_name: &str,
    arguments: Option<&serde_json::Map<String, Value>>,
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
