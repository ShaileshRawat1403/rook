use anyhow::Result;
use crate::commands::term::Shell;
use rook::config::Config;
use rook::permission::PermissionInspector;
use rook::permission::permission_inspector::PermissionCheckResult;
use rook::conversation::message::ToolRequest;
use rmcp::model::CallToolRequestParams;
use serde_json::Value;

pub async fn handle_policy_check(request_json: String) -> Result<()> {
    let tool_request: ToolRequest = serde_json::from_str(&request_json)?;
    let config = Config::global();
    let provider = crate::providers::provider_registry::get_provider(&config.get_rook_provider()?).await?;
    let inspector = PermissionInspector::new(Arc::new(config.permission_manager().clone()), provider);
    
    // In a real session, we'd have a session_id and mode.
    // For eval, we can assume Approve mode or similar.
    let rook_mode = rook::config::RookMode::SmartApprove;
    
    let results = inspector
        .inspect("eval-session", &[tool_request], &[], rook_mode)
        .await?;

    let check_result = inspector.process_inspection_results(&[tool_request], &results);
    
    println!("{}", serde_json::to_string_pretty(&check_result)?);
    
    Ok(())
}
