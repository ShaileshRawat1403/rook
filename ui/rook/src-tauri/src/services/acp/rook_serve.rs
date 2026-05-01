use tauri_plugin_shell::ShellExt;

use std::path::PathBuf;
use std::time::{Duration, Instant};

use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::{Child, Command};
use tokio::sync::OnceCell;

const ROOK_SERVE_CONNECT_TIMEOUT: Duration = Duration::from_secs(10);
const ROOK_SERVE_CONNECT_RETRY_DELAY: Duration = Duration::from_millis(100);
const LOCALHOST: &str = "127.0.0.1";
// ---------------------------------------------------------------------------
// RookServeProcess — singleton that owns the long-lived `rook serve` child
// ---------------------------------------------------------------------------

/// A long-lived `rook serve` process that accepts WebSocket connections.
///
/// Each WebSocket connection to the `/acp` endpoint creates an independent
/// ACP agent inside the server, so a single process can serve any number of
/// concurrent sessions.
pub struct RookServeProcess {
    port: u16,
    _child: Option<Child>,
}

/// Global singleton — initialised once at app startup.
static ROOK_SERVE: OnceCell<RookServeProcess> = OnceCell::const_new();

impl RookServeProcess {
    /// Return the WebSocket URL for connecting to this server.
    pub fn ws_url(&self) -> String {
        format!("ws://{LOCALHOST}:{}/acp", self.port)
    }

    /// Get a reference to the running process, or an error if it was never
    /// started (should not happen in normal operation).
    pub async fn get(app_handle: tauri::AppHandle) -> Result<&'static RookServeProcess, String> {
        ROOK_SERVE
            .get_or_try_init(|| async { Self::spawn(app_handle).await })
            .await
    }

    async fn spawn(app_handle: tauri::AppHandle) -> Result<RookServeProcess, String> {
        let port = resolve_serve_port()?;

        // Debug: log before attempting spawn
        log::info!("Checking for existing rook serve on port {port}...");

        if is_server_ready(port).await {
            log::info!("Using existing rook serve on port {port}");
            return Ok(RookServeProcess { port, _child: None });
        }

        log::info!("No existing server, will spawn new one...");

        // Use a stable working directory for the long-lived server process.
        // Individual sessions will set their own cwd via the ACP protocol.
        let working_dir = default_serve_working_dir();
        std::fs::create_dir_all(&working_dir).map_err(|e| {
            format!(
                "Failed to create rook serve working directory {}: {e}",
                working_dir.display()
            )
        })?;

        let mut command: Command = get_rook_command(&app_handle)?;
        let binary_display = command.as_std().get_program().to_string_lossy().to_string();

        command
            .arg("serve")
            .arg("--host")
            .arg(LOCALHOST)
            .arg("--port")
            .arg(port.to_string())
            .current_dir(&working_dir)
            .stdin(std::process::Stdio::null())
            .stdout(std::process::Stdio::piped())
            .stderr(std::process::Stdio::piped())
            .kill_on_drop(true);

        log::info!(
            "Spawning long-lived rook serve: binary={binary_display} port={port} cwd={}",
            working_dir.display(),
        );

        let mut child = command.spawn().map_err(|error| {
            format!(
                "Failed to spawn rook serve (binary: {binary_display}, cwd: {}): {error}",
                working_dir.display()
            )
        })?;

        // Stream stdout/stderr to the log so failures are diagnosable. Without
        // this, an early-exit child surfaces only an exit code with no context.
        forward_child_output(&mut child);

        wait_for_server_ready(port, &mut child).await?;

        log::info!("Rook serve is ready on port {port}");

        Ok(RookServeProcess {
            port,
            _child: Some(child),
        })
    }
}

pub fn get_rook_command(app_handle: &tauri::AppHandle) -> Result<Command, String> {
    if let Ok(override_path) = std::env::var("ROOK_BIN") {
        let trimmed = override_path.trim();
        if trimmed.is_empty() {
            return Err("ROOK_BIN is set but empty; unset it or point at a rook CLI binary".into());
        }
        return Ok(Command::new(trimmed));
    }

    if let Some(cli_path) = resolve_workspace_cli() {
        log::info!("Using workspace rook CLI at {}", cli_path.display());
        return Ok(Command::new(cli_path));
    }

    let tauri_command = app_handle
        .shell()
        .sidecar("rook")
        .map_err(|e| format!("could not resolve rook binary: {e}"))?;
    let std_command: std::process::Command = tauri_command.into();
    let resolved = PathBuf::from(std_command.get_program());

    if resolves_to_current_exe(&resolved) {
        return Err(format!(
            "Refusing to spawn 'rook serve' against the desktop app binary itself ({}). \
             In dev mode the sidecar lookup falls back to this binary when no rook CLI \
             has been built. Build the CLI with `cargo build -p rook-cli` or set \
             ROOK_BIN to an explicit rook binary path.",
            resolved.display()
        ));
    }

    Ok(std_command.into())
}

/// True when `candidate` resolves to the same on-disk file as `current_exe`.
/// Compares canonical paths when possible so symlinks don't fool us.
fn resolves_to_current_exe(candidate: &std::path::Path) -> bool {
    let Ok(current_exe) = std::env::current_exe() else {
        return false;
    };
    match (candidate.canonicalize(), current_exe.canonicalize()) {
        (Ok(a), Ok(b)) => a == b,
        _ => candidate == current_exe,
    }
}

/// In dev builds the Tauri app binary is also named `rook`, so resolving
/// `sidecar("rook")` silently returns the Tauri app itself. Walk up past the
/// Tauri crate to the outer workspace root and use its rook CLI binary.
///
/// Skips any candidate that canonicalizes to the current executable so we can
/// never accidentally spawn ourselves even if path comparison would otherwise
/// fool us (symlinks, target dirs that contain the Tauri binary, etc.).
fn resolve_workspace_cli() -> Option<PathBuf> {
    let current_exe = std::env::current_exe().ok()?;
    let mut dir = current_exe.parent()?.to_path_buf();
    let mut best: Option<PathBuf> = None;

    while dir.pop() {
        if dir.join("Cargo.lock").is_file() {
            for profile in ["debug", "release"] {
                let candidate = dir.join("target").join(profile).join("rook");
                if candidate.is_file() && !resolves_to_current_exe(&candidate) {
                    best = Some(candidate);
                }
            }
        }
    }
    best
}

async fn wait_for_server_ready(port: u16, child: &mut Child) -> Result<(), String> {
    let deadline = Instant::now() + ROOK_SERVE_CONNECT_TIMEOUT;

    // First check quickly if port is already available (existing process)
    if is_server_ready(port).await {
        log::info!("Rook serve is ready on port {port}");
        return Ok(());
    }

    // Wait for port to become available
    loop {
        match is_server_ready(port).await {
            true => {
                log::info!("Rook serve is ready on port {port}");
                return Ok(());
            }
            false => {
                // Check if process exited already
                if let Ok(Some(status)) = child.try_wait() {
                    return Err(format!(
                        "Rook serve exited before becoming ready: exit status: {}",
                        status
                    ));
                }

                if Instant::now() >= deadline {
                    return Err(format!("Timed out waiting for rook serve on port {port}"));
                }

                tokio::time::sleep(ROOK_SERVE_CONNECT_RETRY_DELAY).await;
            }
        }
    }
}

async fn is_server_ready(port: u16) -> bool {
    let addr = format!("{LOCALHOST}:{port}");
    tokio::net::TcpStream::connect(&addr).await.is_ok()
}

fn default_serve_working_dir() -> PathBuf {
    dirs::home_dir()
        .unwrap_or_else(|| PathBuf::from("/tmp"))
        .join(".rook")
        .join("artifacts")
}

fn reserve_free_port() -> Result<u16, String> {
    let listener = std::net::TcpListener::bind((LOCALHOST, 0))
        .map_err(|error| format!("Failed to reserve Rook serve port: {error}"))?;
    listener
        .local_addr()
        .map(|address| address.port())
        .map_err(|error| format!("Failed to resolve reserved Rook serve port: {error}"))
}

fn resolve_serve_port() -> Result<u16, String> {
    if let Ok(value) = std::env::var("ROOK_SERVE_PORT") {
        let trimmed = value.trim();
        if trimmed.is_empty() {
            return reserve_free_port();
        }

        let port = trimmed
            .parse::<u16>()
            .map_err(|error| format!("Invalid ROOK_SERVE_PORT `{trimmed}`: {error}"))?;
        return Ok(port);
    }

    reserve_free_port()
}

fn forward_child_output(child: &mut Child) {
    if let Some(stdout) = child.stdout.take() {
        tokio::spawn(async move {
            let mut lines = BufReader::new(stdout).lines();
            while let Ok(Some(line)) = lines.next_line().await {
                log::info!("[rook serve stdout] {line}");
            }
        });
    }
    if let Some(stderr) = child.stderr.take() {
        tokio::spawn(async move {
            let mut lines = BufReader::new(stderr).lines();
            while let Ok(Some(line)) = lines.next_line().await {
                log::warn!("[rook serve stderr] {line}");
            }
        });
    }
}
