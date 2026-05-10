use crate::sdlc::checks::CheckDefinition;
use serde::{Deserialize, Serialize};
use std::process::Stdio;
use std::time::{Duration, Instant};
use tokio::process::Command;
use tokio::time::timeout;

const PREVIEW_MAX_CHARS: usize = 4_000;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum CheckStatus {
    Passed,
    Failed,
    TimedOut,
    Error,
}

impl CheckStatus {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Passed => "passed",
            Self::Failed => "failed",
            Self::TimedOut => "timed_out",
            Self::Error => "error",
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct CheckResult {
    pub id: String,
    pub label: String,
    pub command: String,
    pub cwd: String,
    pub required: bool,
    pub status: CheckStatus,
    pub exit_code: Option<i32>,
    pub duration_ms: u128,
    pub stdout_preview: String,
    pub stderr_preview: String,
}

fn preview(value: &[u8]) -> String {
    let text = String::from_utf8_lossy(value);
    let mut chars = text.chars();
    let preview: String = chars.by_ref().take(PREVIEW_MAX_CHARS).collect();

    if chars.next().is_some() {
        format!("{preview}\n...[truncated]")
    } else {
        preview
    }
}

fn is_allowlisted(check: &CheckDefinition) -> bool {
    let command = check.command();
    let args = command.args();

    match check.id() {
        "rust-fmt" => command.program() == "cargo" && args == ["fmt", "--all", "--", "--check"],
        "rust-clippy" => {
            command.program() == "cargo"
                && args
                    == [
                        "clippy",
                        "--workspace",
                        "--all-targets",
                        "--",
                        "-D",
                        "warnings",
                    ]
        }
        "rust-test" => command.program() == "cargo" && args == ["test", "--workspace"],
        "rook-ui-test" => command.program() == "pnpm" && args == ["test"],
        _ => false,
    }
}

fn result(
    check: &CheckDefinition,
    started: Instant,
    status: CheckStatus,
    exit_code: Option<i32>,
    stdout_preview: impl Into<String>,
    stderr_preview: impl Into<String>,
) -> CheckResult {
    CheckResult {
        id: check.id().to_string(),
        label: check.label().to_string(),
        command: check.command_display(),
        cwd: check.cwd().display().to_string(),
        required: check.required(),
        status,
        exit_code,
        duration_ms: started.elapsed().as_millis(),
        stdout_preview: stdout_preview.into(),
        stderr_preview: stderr_preview.into(),
    }
}

pub(crate) async fn run_check(check: &CheckDefinition) -> anyhow::Result<CheckResult> {
    let started = Instant::now();

    if !is_allowlisted(check) {
        return Ok(result(
            check,
            started,
            CheckStatus::Error,
            None,
            "",
            "check command is not allowlisted",
        ));
    }

    let mut command = Command::new(check.command().program());
    command
        .args(check.command().args())
        .current_dir(check.cwd())
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .kill_on_drop(true);

    match timeout(Duration::from_millis(check.timeout_ms()), command.output()).await {
        Ok(Ok(output)) => {
            let status = if output.status.success() {
                CheckStatus::Passed
            } else {
                CheckStatus::Failed
            };

            Ok(result(
                check,
                started,
                status,
                output.status.code(),
                preview(&output.stdout),
                preview(&output.stderr),
            ))
        }
        Ok(Err(err)) => Ok(result(
            check,
            started,
            CheckStatus::Error,
            None,
            "",
            err.to_string(),
        )),
        Err(_) => Ok(result(
            check,
            started,
            CheckStatus::TimedOut,
            None,
            "",
            "check timed out",
        )),
    }
}

#[cfg(test)]
mod tests {
    use super::preview;

    #[test]
    fn preview_truncates_on_character_boundaries() {
        let input = "é".repeat(4_001);

        let output = preview(input.as_bytes());

        assert!(output.ends_with("\n...[truncated]"));
    }
}
