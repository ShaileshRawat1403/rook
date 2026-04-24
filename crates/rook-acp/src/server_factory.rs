use anyhow::Result;
use std::sync::Arc;
use tracing::info;

use crate::server::{AcpProviderFactory, RookAcpAgent};

pub struct AcpServerFactoryConfig {
    pub builtins: Vec<String>,
    pub data_dir: std::path::PathBuf,
    pub config_dir: std::path::PathBuf,
}

pub struct AcpServer {
    config: AcpServerFactoryConfig,
}

impl AcpServer {
    pub fn new(config: AcpServerFactoryConfig) -> Self {
        Self { config }
    }

    pub async fn create_agent(&self) -> Result<Arc<RookAcpAgent>> {
        let config_path = self
            .config
            .config_dir
            .join(rook::config::base::CONFIG_YAML_NAME);
        let config = rook::config::Config::new(&config_path, "rook")?;

        let rook_mode = config
            .get_rook_mode()
            .unwrap_or(rook::config::RookMode::Auto);
        let disable_session_naming = config.get_rook_disable_session_naming().unwrap_or(false);

        let provider_factory: AcpProviderFactory =
            Arc::new(move |provider_name, model_config, extensions| {
                Box::pin(async move {
                    rook::providers::create(&provider_name, model_config, extensions).await
                })
            });

        let agent = RookAcpAgent::new(
            provider_factory,
            self.config.builtins.clone(),
            self.config.data_dir.clone(),
            self.config.config_dir.clone(),
            rook_mode,
            disable_session_naming,
        )
        .await?;
        info!("Created new ACP agent");

        Ok(Arc::new(agent))
    }
}
