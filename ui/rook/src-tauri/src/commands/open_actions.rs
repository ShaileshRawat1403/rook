use std::fs;
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum EditorChoice {
    VsCode,
    Cursor,
}

impl EditorChoice {
    fn from_str(value: &str) -> Result<Self, String> {
        match value {
            "vscode" => Ok(EditorChoice::VsCode),
            "cursor" => Ok(EditorChoice::Cursor),
            other => Err(format!("Unsupported editor: {}", other)),
        }
    }

    fn binary(self) -> &'static str {
        match self {
            EditorChoice::VsCode => "code",
            EditorChoice::Cursor => "cursor",
        }
    }
}

/// Canonicalizes both paths and ensures that the target is the workspace
/// itself or a descendant of it. Rejects symlink escapes by relying on
/// canonicalize, which resolves symlinks before comparing.
pub fn ensure_path_inside_workspace(workspace: &Path, target: &Path) -> Result<PathBuf, String> {
    let canonical_workspace = workspace
        .canonicalize()
        .map_err(|error| format!("Workspace is not accessible: {}", error))?;
    let canonical_target = target
        .canonicalize()
        .map_err(|error| format!("Target is not accessible: {}", error))?;
    if !canonical_target.starts_with(&canonical_workspace) {
        return Err("Target resolves outside the workspace".to_string());
    }
    Ok(canonical_target)
}

fn ensure_directory(path: &Path) -> Result<(), String> {
    let metadata =
        fs::metadata(path).map_err(|error| format!("Path is not accessible: {}", error))?;
    if !metadata.is_dir() {
        return Err("Path is not a directory".to_string());
    }
    Ok(())
}

fn spawn_detached(mut command: Command) -> Result<(), String> {
    command
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .spawn()
        .map(|_| ())
        .map_err(|error| format!("Failed to launch: {}", error))
}

/// How a terminal candidate accepts its working directory.
///
/// `Arg(flag)` passes the path as an explicit, non-shell argument (the
/// terminal binary parses it itself, so quoting is not our concern).
/// `OpenWithPath` is macOS `open -a Terminal <path>` — `open` is a
/// LaunchServices wrapper, not a shell.
/// `Cwd` means the path enters via `Command::current_dir`; the binary
/// inherits it from the spawned process. We never interpolate the path
/// into a shell-parsed string.
#[derive(Debug, Clone)]
#[allow(dead_code)]
enum CwdMode {
    Arg(&'static str),
    OpenWithPath,
    Cwd,
}

#[derive(Debug, Clone)]
struct TerminalCandidate {
    binary: &'static str,
    extra_args: Vec<&'static str>,
    cwd_mode: CwdMode,
}

#[cfg(target_os = "macos")]
fn terminal_candidates() -> Vec<TerminalCandidate> {
    vec![TerminalCandidate {
        binary: "open",
        extra_args: vec!["-a", "Terminal"],
        cwd_mode: CwdMode::OpenWithPath,
    }]
}

#[cfg(target_os = "windows")]
fn terminal_candidates() -> Vec<TerminalCandidate> {
    vec![
        // Windows Terminal: -d expects a directory argument (parsed by wt
        // itself, not a shell string).
        TerminalCandidate {
            binary: "wt",
            extra_args: vec![],
            cwd_mode: CwdMode::Arg("-d"),
        },
        // cmd.exe fallback. The new console window inherits the cwd of the
        // launching process (set via Command::current_dir), so we never
        // build a `cd /d <path>` shell string.
        TerminalCandidate {
            binary: "cmd",
            extra_args: vec!["/C", "start", "", "cmd", "/K"],
            cwd_mode: CwdMode::Cwd,
        },
    ]
}

#[cfg(all(unix, not(target_os = "macos")))]
fn terminal_candidates() -> Vec<TerminalCandidate> {
    vec![
        TerminalCandidate {
            binary: "gnome-terminal",
            extra_args: vec![],
            cwd_mode: CwdMode::Arg("--working-directory"),
        },
        TerminalCandidate {
            binary: "konsole",
            extra_args: vec![],
            cwd_mode: CwdMode::Arg("--workdir"),
        },
        TerminalCandidate {
            binary: "x-terminal-emulator",
            extra_args: vec![],
            cwd_mode: CwdMode::Arg("--working-directory"),
        },
        // xterm: inherit cwd via Command::current_dir; no shell-string
        // path interpolation.
        TerminalCandidate {
            binary: "xterm",
            extra_args: vec![],
            cwd_mode: CwdMode::Cwd,
        },
    ]
}

fn build_terminal_command(candidate: &TerminalCandidate, path: &Path) -> Command {
    let mut cmd = Command::new(candidate.binary);
    for arg in &candidate.extra_args {
        cmd.arg(arg);
    }
    match candidate.cwd_mode {
        CwdMode::Arg(flag) => {
            cmd.arg(flag).arg(path);
        }
        CwdMode::OpenWithPath => {
            cmd.arg(path);
        }
        CwdMode::Cwd => {
            cmd.current_dir(path);
        }
    }
    cmd
}

#[tauri::command]
pub fn open_in_terminal(path: String) -> Result<(), String> {
    let path_buf = PathBuf::from(&path);
    ensure_directory(&path_buf)?;
    let candidates = terminal_candidates();
    let mut last_error = "No terminal candidates configured".to_string();
    for candidate in &candidates {
        let cmd = build_terminal_command(candidate, &path_buf);
        match spawn_detached(cmd) {
            Ok(()) => return Ok(()),
            Err(error) => last_error = format!("{}: {}", candidate.binary, error),
        }
    }
    Err(format!("Failed to launch terminal: {}", last_error))
}

fn build_editor_command(editor: EditorChoice, target: &Path) -> Command {
    let mut cmd = Command::new(editor.binary());
    cmd.arg(target);
    cmd
}

#[tauri::command]
pub fn open_in_editor(
    workspace_path: String,
    target_path: String,
    editor: String,
) -> Result<(), String> {
    let editor_choice = EditorChoice::from_str(&editor)?;
    let workspace = PathBuf::from(&workspace_path);
    let target = PathBuf::from(&target_path);
    let canonical_target = ensure_path_inside_workspace(&workspace, &target)?;
    spawn_detached(build_editor_command(editor_choice, &canonical_target))
}

#[cfg(test)]
mod tests {
    use super::{
        build_editor_command, build_terminal_command, ensure_path_inside_workspace,
        terminal_candidates, CwdMode, EditorChoice,
    };
    use std::ffi::OsStr;
    use std::fs;
    use std::path::Path;
    use tempfile::tempdir;

    #[test]
    fn editor_choice_parses_supported_values() {
        assert_eq!(
            EditorChoice::from_str("vscode").expect("vscode"),
            EditorChoice::VsCode
        );
        assert_eq!(
            EditorChoice::from_str("cursor").expect("cursor"),
            EditorChoice::Cursor
        );
    }

    #[test]
    fn editor_choice_rejects_unsupported_values() {
        let error = EditorChoice::from_str("notepad").expect_err("rejected");
        assert!(error.contains("Unsupported"));
    }

    #[test]
    fn editor_command_uses_expected_binary_and_path() {
        let cmd = build_editor_command(EditorChoice::VsCode, Path::new("/tmp/work"));
        assert_eq!(cmd.get_program(), "code");
        let args: Vec<&std::ffi::OsStr> = cmd.get_args().collect();
        assert_eq!(args, vec![std::ffi::OsStr::new("/tmp/work")]);

        let cursor_cmd = build_editor_command(EditorChoice::Cursor, Path::new("/tmp/work"));
        assert_eq!(cursor_cmd.get_program(), "cursor");
    }

    #[test]
    fn ensure_path_inside_workspace_accepts_descendants() {
        let dir = tempdir().expect("tempdir");
        let nested = dir.path().join("src");
        fs::create_dir_all(&nested).expect("nested");

        let canonical = ensure_path_inside_workspace(dir.path(), &nested).expect("ok");
        assert!(canonical.starts_with(dir.path().canonicalize().expect("root")));
    }

    #[test]
    fn ensure_path_inside_workspace_accepts_workspace_itself() {
        let dir = tempdir().expect("tempdir");
        let _canonical = ensure_path_inside_workspace(dir.path(), dir.path()).expect("ok");
    }

    #[test]
    fn ensure_path_inside_workspace_rejects_external_paths() {
        let inside = tempdir().expect("inside");
        let outside = tempdir().expect("outside");
        let error =
            ensure_path_inside_workspace(inside.path(), outside.path()).expect_err("escape");
        assert!(error.contains("outside"));
    }

    #[test]
    fn ensure_path_inside_workspace_rejects_missing_target() {
        let dir = tempdir().expect("tempdir");
        let missing = dir.path().join("ghost");
        let error = ensure_path_inside_workspace(dir.path(), &missing).expect_err("missing");
        assert!(error.contains("not accessible"));
    }

    #[test]
    fn terminal_candidates_register_at_least_one_per_platform() {
        let candidates = terminal_candidates();
        assert!(!candidates.is_empty(), "platform must register a candidate");
    }

    #[test]
    fn no_candidate_interpolates_a_path_into_a_shell_string() {
        // For every candidate, the path must arrive as either a non-shell
        // argument (Arg flag value or OpenWithPath) or via Command::current_dir.
        // Concatenated shell strings like "cd /d <path>" or
        // "cd <path> && exec $SHELL" are forbidden because they re-introduce
        // shell quoting risks for paths with spaces, $, backticks, quotes.
        let path = Path::new("/tmp/has space/work");
        for candidate in terminal_candidates() {
            let cmd = build_terminal_command(&candidate, path);
            for arg in cmd.get_args() {
                let arg_str = arg.to_string_lossy();
                assert!(
                    !arg_str.contains(" && "),
                    "{} candidate built a shell-AND string: {:?}",
                    candidate.binary,
                    arg_str
                );
                assert!(
                    !arg_str.starts_with("cd ") && !arg_str.contains("cd /d "),
                    "{} candidate built a cd-prefixed shell string: {:?}",
                    candidate.binary,
                    arg_str
                );
            }
        }
    }

    #[test]
    fn cwd_mode_candidates_set_current_dir_not_arg() {
        // Find a candidate that uses Cwd (one is registered on every
        // non-macOS target via the cmd fallback / xterm). Skip on macOS where
        // no Cwd candidate is registered.
        let path = Path::new("/tmp/work");
        let cwd_candidate = terminal_candidates()
            .into_iter()
            .find(|c| matches!(c.cwd_mode, CwdMode::Cwd));
        if let Some(candidate) = cwd_candidate {
            let cmd = build_terminal_command(&candidate, path);
            assert_eq!(cmd.get_current_dir(), Some(path));
            // path must not appear as an argument
            for arg in cmd.get_args() {
                assert_ne!(arg, OsStr::new("/tmp/work"));
            }
        }
    }

    #[test]
    #[cfg(target_os = "macos")]
    fn macos_terminal_candidate_uses_open_a_terminal() {
        let candidates = terminal_candidates();
        let candidate = candidates
            .first()
            .expect("at least one macOS candidate registered");
        assert_eq!(candidate.binary, "open");
        let cmd = build_terminal_command(candidate, Path::new("/tmp/work"));
        let args: Vec<&OsStr> = cmd.get_args().collect();
        assert_eq!(args[0], OsStr::new("-a"));
        assert_eq!(args[1], OsStr::new("Terminal"));
        assert_eq!(args[2], OsStr::new("/tmp/work"));
    }

    #[test]
    #[cfg(unix)]
    fn ensure_path_inside_workspace_rejects_symlink_escapes() {
        use std::os::unix::fs::symlink;
        let outside = tempdir().expect("outside");
        let inside = tempdir().expect("inside");
        let secret = outside.path().join("secret.txt");
        fs::write(&secret, "secret").expect("secret");
        let link = inside.path().join("link.txt");
        symlink(&secret, &link).expect("symlink");

        let error = ensure_path_inside_workspace(inside.path(), &link).expect_err("symlink escape");
        assert!(error.contains("outside"));
    }
}
