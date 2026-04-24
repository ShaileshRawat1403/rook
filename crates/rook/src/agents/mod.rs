mod agent;
pub(crate) mod builtin_skills;
pub mod container;
pub mod execute_commands;
pub mod extension;
pub mod extension_malware_check;
pub mod extension_manager;
pub mod final_output_tool;
mod large_response_handler;
pub mod mcp_client;
pub mod moim;
pub mod platform_extensions;
pub mod platform_tools;
pub mod prompt_manager;
pub mod reply_parts;
pub mod retry;
mod schedule_tool;
pub mod subagent_execution_tool;
pub(crate) mod subagent_handler;
pub(crate) mod subagent_task_config;
mod tool_confirmation_router;
mod tool_execution;
pub mod types;
pub mod validate_extensions;

#[derive(Debug, Clone, PartialEq, serde::Serialize, serde::Deserialize, utoipa::ToSchema)]
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
        match self {
            RunState::Idle => write!(f, "Idle"),
            RunState::Understanding => write!(f, "🧠 Understanding"),
            RunState::Planning => write!(f, "📝 Planning"),
            RunState::Acting => write!(f, "⚙️ Acting"),
            RunState::Verifying => write!(f, "✅ Verifying"),
            RunState::WaitingForApproval => write!(f, "⏳ Waiting for Approval"),
            RunState::Completed => write!(f, "🏁 Completed"),
            RunState::Error(e) => write!(f, "❌ Error: {}", e),
        }
    }
}

pub use agent::{Agent, AgentConfig, AgentEvent, ExtensionLoadResult, RookPlatform};
pub use container::Container;
pub use execute_commands::COMPACT_TRIGGERS;
pub use extension::{ExtensionConfig, ExtensionError};
pub use extension_manager::ExtensionManager;
pub use prompt_manager::PromptManager;
pub use subagent_handler::SUBAGENT_TOOL_REQUEST_TYPE;
pub use subagent_task_config::TaskConfig;
pub use tool_execution::ToolCallContext;
pub use types::{FrontendTool, RetryConfig, SessionConfig, SuccessCheck};
