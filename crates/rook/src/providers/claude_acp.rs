use anyhow::Result;
use futures::future::BoxFuture;
use std::collections::HashMap;
use std::path::PathBuf;

use crate::acp::{
    extension_configs_to_mcp_servers, AcpProvider, AcpProviderConfig, ACP_CURRENT_MODEL,
};
use crate::config::search_path::SearchPaths;
use crate::config::{Config, RookMode};
use crate::model::ModelConfig;
use crate::providers::base::{ProviderDef, ProviderMetadata};

const CLAUDE_ACP_PROVIDER_NAME: &str = "claude-acp";
const CLAUDE_ACP_DOC_URL: &str = "https://github.com/zed-industries/claude-agent-acp";
const CLAUDE_ACP_BINARY: &str = "claude-agent-acp";

pub struct ClaudeAcpProvider;

impl ProviderDef for ClaudeAcpProvider {
    type Provider = AcpProvider;

    fn metadata() -> ProviderMetadata {
        ProviderMetadata::new(
            CLAUDE_ACP_PROVIDER_NAME,
            "Claude Code",
            "Use Rook with your Claude Code subscription via the claude-agent-acp adapter.",
            ACP_CURRENT_MODEL,
            vec![],
            CLAUDE_ACP_DOC_URL,
            vec![],
        )
        .with_setup_steps(vec![
            "Install the ACP adapter: `npm install -g @zed-industries/claude-agent-acp`",
            "Ensure your Claude CLI is authenticated (run `claude` to verify)",
            "Set in your Rook config file (`~/.config/rook/config.yaml` on macOS/Linux):\n  ROOK_PROVIDER: claude-acp\n  ROOK_MODEL: current",
            "Restart Rook for changes to take effect",
        ])
    }

    fn from_env(
        model: ModelConfig,
        extensions: Vec<crate::config::ExtensionConfig>,
    ) -> BoxFuture<'static, Result<AcpProvider>> {
        Box::pin(async move {
            let config = Config::global();
            // with_npm() includes npm global bin dir (desktop app PATH may not)
            let resolved_command = SearchPaths::builder()
                .with_npm()
                .resolve(CLAUDE_ACP_BINARY)?;
            let rook_mode = config.get_rook_mode().unwrap_or(RookMode::Auto);

            let mode_mapping = HashMap::from([
                // Closest to "autonomous": bypassPermissions skips confirmations.
                (RookMode::Auto, "bypassPermissions".to_string()),
                // Claude Code's default matches "ask before risky actions".
                (RookMode::Approve, "default".to_string()),
                // acceptEdits auto-accepts file edits but still prompts for risky ops.
                (RookMode::SmartApprove, "acceptEdits".to_string()),
                // Plan mode disables tool execution, aligning with chat-only intent.
                (RookMode::Chat, "plan".to_string()),
            ]);

            let provider_config = AcpProviderConfig {
                command: resolved_command,
                args: vec![],
                env: vec![],
                // Prevent nested-session detection in claude-agent-acp (wraps Claude Code)
                env_remove: vec!["CLAUDECODE".to_string()],
                work_dir: std::env::current_dir().unwrap_or_else(|_| PathBuf::from(".")),
                mcp_servers: extension_configs_to_mcp_servers(&extensions),
                session_mode_id: Some(mode_mapping[&rook_mode].clone()),
                mode_mapping,
                notification_callback: None,
            };

            let metadata = Self::metadata();
            AcpProvider::connect(metadata.name, model, rook_mode, provider_config).await
        })
    }
}
