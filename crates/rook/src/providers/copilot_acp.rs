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

const COPILOT_ACP_PROVIDER_NAME: &str = "copilot-acp";
const COPILOT_ACP_DOC_URL: &str = "https://github.com/github/copilot-cli";
const COPILOT_ACP_BINARY: &str = "copilot";

const MODE_AGENT: &str = "https://agentclientprotocol.com/protocol/session-modes#agent";
const MODE_PLAN: &str = "https://agentclientprotocol.com/protocol/session-modes#plan";

pub struct CopilotAcpProvider;

impl ProviderDef for CopilotAcpProvider {
    type Provider = AcpProvider;

    fn metadata() -> ProviderMetadata {
        ProviderMetadata::new(
            COPILOT_ACP_PROVIDER_NAME,
            "GitHub Copilot CLI (ACP)",
            "Use Rook with your GitHub Copilot subscription via the Copilot CLI.",
            ACP_CURRENT_MODEL,
            vec![],
            COPILOT_ACP_DOC_URL,
            vec![],
        )
        .with_setup_steps(vec![
            "Install the Copilot CLI: `npm install -g @github/copilot`",
            "Run `copilot login` to authenticate with your GitHub account",
            "Set in your Rook config file (`~/.config/rook/config.yaml` on macOS/Linux):\n  ROOK_PROVIDER: copilot-acp\n  ROOK_MODEL: current",
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
                .resolve(COPILOT_ACP_BINARY)?;
            let rook_mode = config.get_rook_mode().unwrap_or(RookMode::Auto);

            let mut args = vec!["--acp".to_string()];
            if model.model_name != ACP_CURRENT_MODEL {
                args.push("--model".to_string());
                args.push(model.model_name.clone());
            }

            // Copilot modes are full protocol URIs.
            // No approve-specific mode; permissions are handled separately.
            let mode_mapping = HashMap::from([
                (RookMode::Auto, MODE_AGENT.to_string()),
                (RookMode::Approve, MODE_AGENT.to_string()),
                (RookMode::SmartApprove, MODE_AGENT.to_string()),
                (RookMode::Chat, MODE_PLAN.to_string()),
            ]);

            let provider_config = AcpProviderConfig {
                command: resolved_command,
                args,
                env: vec![],
                env_remove: vec![],
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
