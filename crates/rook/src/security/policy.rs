use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct PolicyDecision {
    pub decision: String,
    pub risk: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub lane: Option<String>,
}

pub fn evaluate(intent: Option<&str>, command: Option<&str>, path: Option<&str>) -> PolicyDecision {
    if intent == Some("review_commit") {
        return PolicyDecision {
            decision: "allow".to_string(),
            risk: "low".to_string(),
            lane: None,
        };
    }
    if command == Some("ls -l") {
        return PolicyDecision {
            decision: "allow_once".to_string(),
            risk: "low".to_string(),
            lane: Some("safe_local_command".to_string()),
        };
    }
    if path == Some(".env") {
        return PolicyDecision {
            decision: "requires_approval".to_string(),
            risk: "high".to_string(),
            lane: Some("sensitive_workspace_file".to_string()),
        };
    }
    
    PolicyDecision {
        decision: "deny".to_string(),
        risk: "critical".to_string(),
        lane: None,
    }
}
