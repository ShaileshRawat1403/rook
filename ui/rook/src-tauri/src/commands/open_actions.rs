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
pub fn ensure_path_inside_workspace(
    workspace: &Path,
    target: &Path,
) -> Result<PathBuf, String> {
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
    let metadata = fs::metadata(path)
        .map_err(|error| format!("Path is not accessible: {}", error))?;
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

/// Returns an ordered list of (binary, args) candidate commands to try for
/// opening a terminal at `path`. The caller spawns them in order and stops
/// at the first that succeeds.
#[cfg(target_os = "macos")]
fn terminal_candidates(path: &Path) -> Vec<(String, Vec<String>)> {
    vec![(
        "open".into(),
        vec!["-a".into(), "Terminal".into(), path.to_string_lossy().into_owned()],
    )]
}

#[cfg(target_os = "windows")]
fn terminal_candidates(path: &Path) -> Vec<(String, Vec<String>)> {
    let path_str = path.to_string_lossy().into_owned();
    vec![
        ("wt".into(), vec!["-d".into(), path_str.clone()]),
        (
            "cmd".into(),
            vec![
                "/C".into(),
                "start".into(),
                "".into(),
                "cmd".into(),
                "/K".into(),
                format!("cd /d {}", path_str),
            ],
        ),
    ]
}

#[cfg(all(unix, not(target_os = "macos")))]
fn terminal_candidates(path: &Path) -> Vec<(String, Vec<String>)> {
    let path_str = path.to_string_lossy().into_owned();
    vec![
        (
            "gnome-terminal".into(),
            vec!["--working-directory".into(), path_str.clone()],
        ),
        ("konsole".into(), vec!["--workdir".into(), path_str.clone()]),
        (
            "x-terminal-emulator".into(),
            vec!["--working-directory".into(), path_str.clone()],
        ),
        (
            "xterm".into(),
            vec!["-e".into(), format!("cd {} && exec $SHELL", path_str)],
        ),
    ]
}

#[tauri::command]
pub fn open_in_terminal(path: String) -> Result<(), String> {
    let path_buf = PathBuf::from(&path);
    ensure_directory(&path_buf)?;
    let candidates = terminal_candidates(&path_buf);
    let mut last_error = "No terminal candidates configured".to_string();
    for (binary, args) in candidates {
        let mut cmd = Command::new(&binary);
        cmd.args(&args);
        match spawn_detached(cmd) {
            Ok(()) => return Ok(()),
            Err(error) => last_error = format!("{}: {}", binary, error),
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
        build_editor_command, ensure_path_inside_workspace, terminal_candidates, EditorChoice,
    };
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
        let error = ensure_path_inside_workspace(inside.path(), outside.path())
            .expect_err("escape");
        assert!(error.contains("outside"));
    }

    #[test]
    fn ensure_path_inside_workspace_rejects_missing_target() {
        let dir = tempdir().expect("tempdir");
        let missing = dir.path().join("ghost");
        let error = ensure_path_inside_workspace(dir.path(), &missing)
            .expect_err("missing");
        assert!(error.contains("not accessible"));
    }

    #[test]
    fn terminal_candidates_include_path_in_arguments() {
        let candidates = terminal_candidates(Path::new("/tmp/work"));
        assert!(!candidates.is_empty(), "platform must register a candidate");
        let mentions_path = candidates
            .iter()
            .all(|(_, args)| args.iter().any(|arg| arg.contains("/tmp/work")));
        assert!(mentions_path, "every candidate must reference the target path");
    }

    #[test]
    #[cfg(target_os = "macos")]
    fn macos_terminal_candidate_uses_open_a_terminal() {
        let candidates = terminal_candidates(Path::new("/tmp/work"));
        let (binary, args) = &candidates[0];
        assert_eq!(binary, "open");
        assert_eq!(args[0], "-a");
        assert_eq!(args[1], "Terminal");
        assert_eq!(args[2], "/tmp/work");
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

        let error = ensure_path_inside_workspace(inside.path(), &link)
            .expect_err("symlink escape");
        assert!(error.contains("outside"));
    }
}
