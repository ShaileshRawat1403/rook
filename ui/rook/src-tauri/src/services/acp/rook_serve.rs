use tauri_plugin_shell::ShellExt;

use std::path::PathBuf;
use std::time::{Duration, Instant};

use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::{Child, Command};
use tokio::sync::OnceCell;

const ROOK_SERVE_CONNECT_TIMEOUT: Duration = Duration::from_secs(30);
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

        if is_server_ready(port).await {
            log::info!("Using existing rook serve on port {port}");
            return Ok(RookServeProcess { port, _child: None });
        }

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
        return Ok(Command::new(override_path));
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
    Ok(std_command.into())
}

/// In dev builds the Tauri app binary is also named `rook`, so resolving
/// `sidecar("rook")` silently returns the Tauri app itself. Walk up past the
/// Tauri crate to the outer workspace root and use its rook CLI binary.
fn resolve_workspace_cli() -> Option<PathBuf> {
    let current_exe = std::env::current_exe().ok()?;
    let mut dir = current_exe.parent()?.to_path_buf();
    let mut best: Option<PathBuf> = None;

    while dir.pop() {
        if dir.join("Cargo.lock").is_file() {
            for profile in ["debug", "release"] {
                let candidate = dir.join("target").join(profile).join("rook");
                if candidate.is_file() && candidate != current_exe {
                    best = Some(candidate);
                }
            }
        }
    }
    best
}

async fn wait_for_server_ready(port: u16, child: &mut Child) -> Result<(), String> {
    let deadline = Instant::now() + ROOK_SERVE_CONNECT_TIMEOUT;

    loop {
        match is_server_ready(port).await {
            true => return Ok(()),
            false => {
                if let Some(status) = child
                    .try_wait()
                    .map_err(|e| format!("Failed to poll rook serve process: {e}"))?
                {
                    return Err(format!(
                        "Rook serve exited before becoming ready: {status}"
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
