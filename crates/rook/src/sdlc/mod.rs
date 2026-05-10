pub mod checks;
pub mod evidence;
pub mod runner;
pub mod verify;

pub use checks::{detect_checks, CheckDefinition, CheckKind, RiskLevel};
pub use evidence::{create_evidence_receipt, EvidenceReceipt};
pub use runner::{CheckResult, CheckStatus};
pub use verify::{verify_repo, VerificationPosture, VerificationReport};
