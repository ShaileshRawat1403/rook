use anyhow::Result;
use rook::security::policy::{evaluate, PolicyDecision};

pub async fn handle_policy_check(intent: Option<String>, command: Option<String>, path: Option<String>) -> Result<()> {
    let decision = evaluate(
        intent.as_deref(),
        command.as_deref(),
        path.as_deref(),
    );
    
    println!("{}", serde_json::to_string_pretty(&decision)?);
    
    Ok(())
}
