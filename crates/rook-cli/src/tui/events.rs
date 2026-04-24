use serde::{Deserialize, Serialize};
use crate::tui::state::{ApprovalRequest, MessageRole};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum RunEvent {
    RunStarted { session_id: String },
    IntentCreated { prompt: String },
    StepProposed { 
        call_id: String, 
        tool_name: String, 
        arguments: serde_json::Value 
    },
    ApprovalRequested(ApprovalRequest),
    ApprovalResolved { 
        id: String, 
        decision: ApprovalDecision 
    },
    StepStarted { call_id: String },
    StepCompleted { 
        call_id: String, 
        result: Result<serde_json::Value, String> 
    },
    ArtifactCreated { 
        path: String, 
        content: String 
    },
    MessageAdded {
        id: String,
        role: MessageRole,
        content: String,
        timestamp: i64,
    },
    RunCompleted,
    RunFailed(String),
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum ApprovalDecision {
    Approve,
    Reject,
    Modify(String),
}

#[derive(Debug, Clone)]
pub enum AppEvent {
    Quit,
    Tick,
    Input(crossterm::event::KeyEvent),
    Run(RunEvent),
}
