use crate::sdlc::runner::CheckResult;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use uuid::Uuid;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EvidenceReceipt {
    pub schema_version: String,
    pub receipt_id: String,
    pub run_id: String,
    pub claim: String,
    pub proof_type: String,
    pub source: String,
    pub check_id: String,
    pub status: String,
    pub command: String,
    pub cwd: String,
    pub duration_ms: u128,
    pub digest: String,
}

pub fn create_evidence_receipt(run_id: &str, result: &CheckResult) -> EvidenceReceipt {
    let serialized = serde_json::to_vec(result).unwrap_or_default();
    let mut hasher = Sha256::new();
    hasher.update(serialized);
    let digest = format!("{:x}", hasher.finalize());

    EvidenceReceipt {
        schema_version: "0.1.0".into(),
        receipt_id: Uuid::new_v4().to_string(),
        run_id: run_id.into(),
        claim: format!("{} {}", result.label, result.status.as_str()),
        proof_type: "command_result".into(),
        source: "rook".into(),
        check_id: result.id.clone(),
        status: result.status.as_str().into(),
        command: result.command.clone(),
        cwd: result.cwd.clone(),
        duration_ms: result.duration_ms,
        digest,
    }
}
