use crate::sdlc::checks::detect_checks;
use crate::sdlc::evidence::{create_evidence_receipt, EvidenceReceipt};
use crate::sdlc::runner::{run_check, CheckResult, CheckStatus};
use serde::{Deserialize, Serialize};
use std::path::Path;
use uuid::Uuid;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum VerificationPosture {
    Verified,
    Guarded,
    Blocked,
    Failed,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VerificationReport {
    pub schema_version: String,
    pub source: String,
    pub run_id: String,
    pub repo_root: String,
    pub checks: Vec<CheckResult>,
    pub posture: VerificationPosture,
    pub blocking_reasons: Vec<String>,
    pub evidence: Vec<EvidenceReceipt>,
}

fn derive_posture(results: &[CheckResult]) -> VerificationPosture {
    if results.is_empty() {
        return VerificationPosture::Guarded;
    }

    let required = results.iter().filter(|result| result.required);

    if required
        .clone()
        .any(|result| matches!(result.status, CheckStatus::Error))
    {
        return VerificationPosture::Failed;
    }

    if required
        .clone()
        .any(|result| matches!(result.status, CheckStatus::Failed | CheckStatus::TimedOut))
    {
        return VerificationPosture::Blocked;
    }

    if results.iter().any(|result| {
        matches!(
            result.status,
            CheckStatus::Failed | CheckStatus::TimedOut | CheckStatus::Error
        )
    }) {
        return VerificationPosture::Guarded;
    }

    VerificationPosture::Verified
}

fn blocking_reasons(results: &[CheckResult]) -> Vec<String> {
    results
        .iter()
        .filter(|result| result.required && !matches!(result.status, CheckStatus::Passed))
        .map(|result| format!("{} {}", result.label, result.status.as_str()))
        .collect()
}

pub async fn verify_repo(repo_root: &Path) -> anyhow::Result<VerificationReport> {
    let repo_root = repo_root.canonicalize()?;
    let run_id = Uuid::new_v4().to_string();
    let checks = detect_checks(&repo_root);
    let mut results = Vec::with_capacity(checks.len());

    for check in checks {
        results.push(run_check(&check).await?);
    }

    let evidence = results
        .iter()
        .map(|result| create_evidence_receipt(&run_id, result))
        .collect();

    Ok(VerificationReport {
        schema_version: "0.1.0".into(),
        source: "rook".into(),
        run_id,
        repo_root: repo_root.display().to_string(),
        posture: derive_posture(&results),
        blocking_reasons: blocking_reasons(&results),
        checks: results,
        evidence,
    })
}
