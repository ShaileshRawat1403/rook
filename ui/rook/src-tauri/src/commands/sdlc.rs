use std::path::PathBuf;

use rook_core::sdlc::{verify_repo, VerificationReport};

pub(crate) async fn verify_sdlc_repo_inner(
    repo_root: PathBuf,
) -> anyhow::Result<VerificationReport> {
    let repo_root = repo_root.canonicalize()?;

    if !repo_root.is_dir() {
        anyhow::bail!("repository path must be a directory");
    }

    verify_repo(&repo_root).await
}

#[tauri::command]
pub async fn verify_sdlc_repo(repo_root: String) -> Result<VerificationReport, String> {
    verify_sdlc_repo_inner(PathBuf::from(repo_root))
        .await
        .map_err(|err| format!("Unable to verify SDLC repository: {err}"))
}

#[cfg(test)]
mod tests {
    use super::{verify_sdlc_repo, verify_sdlc_repo_inner};
    use std::fs;

    #[tokio::test]
    async fn verifies_temp_cargo_repo() {
        let temp_dir = tempfile::tempdir().expect("tempdir");
        fs::write(
            temp_dir.path().join("Cargo.toml"),
            "[workspace]\nmembers = []\n",
        )
        .expect("write Cargo.toml");

        let report = verify_sdlc_repo_inner(temp_dir.path().to_path_buf())
            .await
            .expect("verification report");

        let expected_root = temp_dir.path().canonicalize().expect("canonical tempdir");

        assert_eq!(report.source, "rook");
        assert_eq!(report.repo_root, expected_root.display().to_string());
        assert_eq!(report.checks.len(), 3);
        assert!(report.checks.iter().all(|check| check.required));
        assert!(report
            .checks
            .iter()
            .all(|check| check.command.starts_with("cargo ")));
    }

    #[tokio::test]
    async fn invalid_path_returns_safe_error() {
        let temp_dir = tempfile::tempdir().expect("tempdir");
        let missing_path = temp_dir.path().join("missing");

        let error = verify_sdlc_repo(missing_path.display().to_string())
            .await
            .expect_err("invalid path should fail");

        assert!(error.starts_with("Unable to verify SDLC repository: "));
        assert!(!error.contains("command"));
    }

    #[tokio::test]
    async fn file_path_returns_safe_error() {
        let temp_dir = tempfile::tempdir().expect("tempdir");
        let file_path = temp_dir.path().join("Cargo.toml");
        fs::write(&file_path, "[workspace]\nmembers = []\n").expect("write Cargo.toml");

        let error = verify_sdlc_repo(file_path.display().to_string())
            .await
            .expect_err("file path should fail");

        assert!(error.starts_with("Unable to verify SDLC repository: "));
        assert!(error.contains("repository path must be a directory"));
        assert!(!error.contains("command"));
    }
}
