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

const CODEX_ACP_PROVIDER_NAME: &str = "codex-acp";
const CODEX_ACP_DOC_URL: &str = "https://github.com/zed-industries/codex-acp";
const CODEX_ACP_NPM_PACKAGE: &str = "@zed-industries/codex-acp";
const NPX_BINARY: &str = "npx";

pub struct CodexAcpProvider;

impl ProviderDef for CodexAcpProvider {
    type Provider = AcpProvider;

    fn metadata() -> ProviderMetadata {
        ProviderMetadata::new(
            CODEX_ACP_PROVIDER_NAME,
            "Codex CLI",
            "Use Rook with your ChatGPT Plus/Pro subscription via the codex-acp adapter.",
            ACP_CURRENT_MODEL,
            vec![],
            CODEX_ACP_DOC_URL,
            vec![],
        )
        .with_setup_steps(vec![
            "Install the ACP adapter: `npm install -g @zed-industries/codex-acp`",
            "If you prefer not to install it globally, Rook can also launch it via `npx -y @zed-industries/codex-acp` when npm is available",
            "Run `codex` once to authenticate with your OpenAI account",
            "Set in your Rook config file (`~/.config/rook/config.yaml` on macOS/Linux):\n  ROOK_PROVIDER: codex-acp\n  ROOK_MODEL: current",
            "Restart Rook for changes to take effect",
        ])
    }

    fn from_env(
        model: ModelConfig,
        extensions: Vec<crate::config::ExtensionConfig>,
    ) -> BoxFuture<'static, Result<AcpProvider>> {
        Box::pin(async move {
            let config = Config::global();
            let (resolved_command, mut args) = resolve_codex_acp_command()?;
            let work_dir = std::env::current_dir().unwrap_or_else(|_| PathBuf::from("."));
            let env = vec![];
            let rook_mode = config.get_rook_mode().unwrap_or(RookMode::Auto);
            let mcp_servers = extension_configs_to_mcp_servers(&extensions);

            // fixed Rook mode via -c overrides until session/set-mode works
            let (approval_policy, sandbox_mode) = map_rook_mode(rook_mode);
            args.extend([
                "-c".to_string(),
                format!("approval_policy={approval_policy}"),
                "-c".to_string(),
                format!("sandbox_mode={sandbox_mode}"),
            ]);

            // Codex sandbox blocks network by default. Enable it when HTTP MCP
            // servers are configured so codex-acp can connect to them.
            let has_http_mcp = mcp_servers
                .iter()
                .any(|s| matches!(s, sacp::schema::McpServer::Http(_)));
            if has_http_mcp {
                args.extend([
                    "-c".to_string(),
                    "sandbox_workspace_write.network_access=true".to_string(),
                ]);
            }

            // Chat and Approve both map to "read-only".
            let mode_mapping = HashMap::from([
                (RookMode::Auto, "full-access".to_string()),
                (RookMode::Approve, "read-only".to_string()),
                (RookMode::SmartApprove, "auto".to_string()),
                (RookMode::Chat, "read-only".to_string()),
            ]);

            let provider_config = AcpProviderConfig {
                command: resolved_command,
                args,
                env,
                env_remove: vec![],
                work_dir,
                mcp_servers,
                // Disabled until https://github.com/zed-industries/codex-acp/issues/179 is fixed.
                session_mode_id: None,
                mode_mapping,
                notification_callback: None,
            };

            let metadata = Self::metadata();
            AcpProvider::connect(metadata.name, model, rook_mode, provider_config).await
        })
    }
}

fn resolve_codex_acp_command() -> Result<(PathBuf, Vec<String>)> {
    let search_paths = SearchPaths::builder().with_npm();
    if let Ok(command) = search_paths.resolve(CODEX_ACP_PROVIDER_NAME) {
        return Ok((command, vec![]));
    }

    let npx = SearchPaths::builder().with_npm().resolve(NPX_BINARY)?;
    Ok((
        npx,
        vec!["-y".to_string(), CODEX_ACP_NPM_PACKAGE.to_string()],
    ))
}

// Codex sandbox scope determines what needs approval: operations within the
// sandbox are auto-approved, operations outside it trigger on-request prompts.
// So Approve uses read-only sandbox to force write approvals through Rook.
fn map_rook_mode(rook_mode: RookMode) -> (&'static str, &'static str) {
    match rook_mode {
        RookMode::Auto => ("never", "danger-full-access"),
        RookMode::SmartApprove => ("on-request", "workspace-write"),
        RookMode::Approve => ("on-request", "read-only"),
        RookMode::Chat => ("never", "read-only"),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use test_case::test_case;

    #[test_case(RookMode::Auto, "never", "danger-full-access")]
    #[test_case(RookMode::SmartApprove, "on-request", "workspace-write")]
    #[test_case(RookMode::Approve, "on-request", "read-only")]
    #[test_case(RookMode::Chat, "never", "read-only")]
    fn test_map_rook_mode(mode: RookMode, expected_approval: &str, expected_sandbox: &str) {
        let (approval, sandbox) = map_rook_mode(mode);
        assert_eq!(approval, expected_approval);
        assert_eq!(sandbox, expected_sandbox);
    }
}
