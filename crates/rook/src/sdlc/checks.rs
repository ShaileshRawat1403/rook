use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum CheckKind {
    Format,
    Lint,
    Typecheck,
    Test,
    Build,
    Schema,
    Security,
    Secrets,
    Eval,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum RiskLevel {
    Low,
    Medium,
    High,
    Critical,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub(crate) struct CheckCommand {
    program: String,
    args: Vec<String>,
}

impl CheckCommand {
    fn new(program: impl Into<String>, args: impl IntoIterator<Item = impl Into<String>>) -> Self {
        Self {
            program: program.into(),
            args: args.into_iter().map(Into::into).collect(),
        }
    }

    pub(crate) fn program(&self) -> &str {
        &self.program
    }

    pub(crate) fn args(&self) -> &[String] {
        &self.args
    }

    pub(crate) fn display(&self) -> String {
        if self.args.is_empty() {
            self.program.clone()
        } else {
            format!("{} {}", self.program, self.args.join(" "))
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct CheckDefinition {
    id: String,
    kind: CheckKind,
    label: String,
    command: CheckCommand,
    cwd: PathBuf,
    required: bool,
    timeout_ms: u64,
    risk: RiskLevel,
}

impl CheckDefinition {
    pub fn id(&self) -> &str {
        &self.id
    }

    pub fn kind(&self) -> CheckKind {
        self.kind
    }

    pub fn label(&self) -> &str {
        &self.label
    }

    pub fn command_display(&self) -> String {
        self.command.display()
    }

    pub fn cwd(&self) -> &Path {
        &self.cwd
    }

    pub fn required(&self) -> bool {
        self.required
    }

    pub fn timeout_ms(&self) -> u64 {
        self.timeout_ms
    }

    pub fn risk(&self) -> RiskLevel {
        self.risk
    }

    pub(crate) fn command(&self) -> &CheckCommand {
        &self.command
    }
}

pub fn detect_checks(repo_root: &Path) -> Vec<CheckDefinition> {
    let mut checks = Vec::new();

    if repo_root.join("Cargo.toml").exists() {
        checks.push(CheckDefinition {
            id: "rust-fmt".into(),
            kind: CheckKind::Format,
            label: "Rust format check".into(),
            command: CheckCommand::new("cargo", ["fmt", "--all", "--", "--check"]),
            cwd: repo_root.to_path_buf(),
            required: true,
            timeout_ms: 120_000,
            risk: RiskLevel::Low,
        });

        checks.push(CheckDefinition {
            id: "rust-clippy".into(),
            kind: CheckKind::Lint,
            label: "Rust clippy".into(),
            command: CheckCommand::new(
                "cargo",
                [
                    "clippy",
                    "--workspace",
                    "--all-targets",
                    "--",
                    "-D",
                    "warnings",
                ],
            ),
            cwd: repo_root.to_path_buf(),
            required: true,
            timeout_ms: 240_000,
            risk: RiskLevel::Medium,
        });

        checks.push(CheckDefinition {
            id: "rust-test".into(),
            kind: CheckKind::Test,
            label: "Rust tests".into(),
            command: CheckCommand::new("cargo", ["test", "--workspace"]),
            cwd: repo_root.to_path_buf(),
            required: true,
            timeout_ms: 300_000,
            risk: RiskLevel::Medium,
        });
    }

    let rook_ui_root = repo_root.join("ui").join("rook");
    if rook_ui_root.join("package.json").exists() {
        checks.push(CheckDefinition {
            id: "rook-ui-test".into(),
            kind: CheckKind::Test,
            label: "Rook UI tests".into(),
            command: CheckCommand::new("pnpm", ["test"]),
            cwd: rook_ui_root,
            required: false,
            timeout_ms: 180_000,
            risk: RiskLevel::Medium,
        });
    }

    checks
}
