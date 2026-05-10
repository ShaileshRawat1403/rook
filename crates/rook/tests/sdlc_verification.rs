use rook::sdlc::{
    create_evidence_receipt, detect_checks, CheckResult, CheckStatus, VerificationPosture,
};
use std::fs;

#[test]
fn detects_rust_and_rook_ui_checks_from_repo_shape() {
    let temp_dir = tempfile::tempdir().expect("tempdir");
    fs::write(temp_dir.path().join("Cargo.toml"), "[workspace]\n").expect("write Cargo.toml");
    fs::create_dir_all(temp_dir.path().join("ui/rook")).expect("create ui dir");
    fs::write(
        temp_dir.path().join("ui/rook/package.json"),
        r#"{"scripts":{"test":"vitest run"}}"#,
    )
    .expect("write package.json");

    let checks = detect_checks(temp_dir.path());
    let ids = checks.iter().map(|check| check.id()).collect::<Vec<_>>();

    assert_eq!(
        ids,
        vec!["rust-fmt", "rust-clippy", "rust-test", "rook-ui-test"]
    );
    assert!(checks.iter().any(|check| {
        check.id() == "rook-ui-test" && check.command_display() == "pnpm test" && !check.required()
    }));
}

#[test]
fn evidence_receipt_uses_stable_status_text_and_digest() {
    let result = CheckResult {
        id: "rust-test".into(),
        label: "Rust tests".into(),
        command: "cargo test --workspace".into(),
        cwd: "/repo".into(),
        required: true,
        status: CheckStatus::Passed,
        exit_code: Some(0),
        duration_ms: 25,
        stdout_preview: "ok".into(),
        stderr_preview: String::new(),
    };

    let receipt = create_evidence_receipt("run-1", &result);

    assert_eq!(receipt.schema_version, "0.1.0");
    assert_eq!(receipt.run_id, "run-1");
    assert_eq!(receipt.check_id, "rust-test");
    assert_eq!(receipt.status, "passed");
    assert_eq!(receipt.claim, "Rust tests passed");
    assert_eq!(receipt.digest.len(), 64);
}

#[tokio::test]
async fn verify_repo_without_detected_checks_is_guarded_and_does_not_run_commands() {
    let temp_dir = tempfile::tempdir().expect("tempdir");

    let report = rook::sdlc::verify_repo(temp_dir.path())
        .await
        .expect("verify repo");

    assert_eq!(report.schema_version, "0.1.0");
    assert_eq!(report.posture, VerificationPosture::Guarded);
    assert!(report.checks.is_empty());
    assert!(report.evidence.is_empty());
    assert!(report.blocking_reasons.is_empty());
}
