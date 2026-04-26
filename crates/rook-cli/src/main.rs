use anyhow::Result;
use std::env;
use std::process::ExitCode;

use rook::config::RookMode;
use rook::session::session_manager::SessionType;
use rook::session::SessionManager;
use rook_cli::cli::cli;
use rook_cli::error::{exit_code_from_err, CliError};
use rook_cli::logging;
use rook_cli::tui::state::{AppCommand, ProviderConfigField, ProviderOption, TuiEvent};

fn handle_error(err: anyhow::Error) -> ExitCode {
    if let Some(cli_error) = err.downcast_ref::<CliError>() {
        cli_error.print();
        return ExitCode::from(cli_error.exit_code);
    }

    let exit_code = exit_code_from_err(&err);
    eprintln!("error: {err}");
    ExitCode::from(exit_code)
}

#[tokio::main]
async fn main() -> Result<ExitCode> {
    if let Err(e) = logging::setup_logging(None) {
        eprintln!("Warning: Failed to initialize logging: {}", e);
    }

    let args: Vec<String> = env::args().collect();

    if args.len() <= 1 {
        match run_tui().await {
            Ok(_) => Ok(ExitCode::SUCCESS),
            Err(e) => Ok(handle_error(e)),
        }
    } else {
        let result = cli().await;

        #[cfg(feature = "otel")]
        if rook::otel::otlp::is_otlp_initialized() {
            tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
            rook::otel::otlp::shutdown_otlp();
        }

        match result {
            Ok(_) => Ok(ExitCode::SUCCESS),
            Err(e) => Ok(handle_error(e)),
        }
    }
}

async fn run_tui() -> Result<()> {
    let config = rook::config::Config::global();
    let rook_mode = config.get_rook_mode().unwrap_or(RookMode::Auto);
    let saved_provider = config.get_rook_provider().ok();
    let saved_model = config.get_rook_model().ok();
    let needs_setup = saved_provider.is_none();

    let (tx, rx) = tokio::sync::mpsc::channel(100);
    let (cmd_tx, mut cmd_rx) = tokio::sync::mpsc::channel(32);
    let session_id = SessionManager::instance()
        .create_session(
            std::env::current_dir()?,
            "CLI Session".to_string(),
            SessionType::User,
            rook_mode,
        )
        .await?
        .id;

    let mut initial_state = rook_cli::tui::state::AppState::new(session_id.clone());
    let mut provider_metadata = rook::providers::providers().await;
    provider_metadata.sort_by(|a, b| a.0.display_name.cmp(&b.0.display_name));
    initial_state.set_available_providers(
        provider_metadata
            .into_iter()
            .map(|(meta, _)| ProviderOption {
                name: meta.name,
                display_name: meta.display_name,
                description: meta.description,
                default_model: meta.default_model,
                known_models: meta.known_models.into_iter().map(|m| m.name).collect(),
                setup_steps: meta.setup_steps,
                config_keys: meta
                    .config_keys
                    .into_iter()
                    .map(|key| ProviderConfigField {
                        name: key.name,
                        required: key.required,
                        secret: key.secret,
                        default: key.default,
                        oauth_flow: key.oauth_flow,
                        device_code_flow: key.device_code_flow,
                        primary: key.primary,
                    })
                    .collect(),
            })
            .collect(),
    );
    if let Some(provider) = saved_provider {
        initial_state.active_provider = provider.clone();
        initial_state.selected_provider = initial_state
            .available_providers
            .iter()
            .find(|option| option.name == provider)
            .cloned();
    }
    if let Some(model) = saved_model {
        initial_state.active_model = model;
    }
    if needs_setup {
        initial_state.open_provider_selection();
        initial_state.selection_modal_title = "WELCOME TO ROOK: CHOOSE PROVIDER".to_string();
        initial_state.add_message(
            rook_cli::tui::state::MessageRole::System,
            "Welcome to Rook Enterprise. Please select a provider to begin.".to_string(),
        );
    }

    let state = std::sync::Arc::new(std::sync::Mutex::new(initial_state));

    let session_config = rook_cli::session::SessionBuilderConfig {
        session_id: Some(session_id),
        interactive: true,
        quiet: true,
        ..Default::default()
    };

    let state_for_tui = state.clone();
    let tx_for_input_capture = tx.clone();
    let cmd_tx_for_tui = cmd_tx.clone();
    let tui_handle = tokio::task::spawn_blocking(move || {
        let tx_capture = tx_for_input_capture.clone();
        std::thread::spawn(move || loop {
            if crossterm::event::poll(std::time::Duration::from_millis(50)).unwrap() {
                if let crossterm::event::Event::Key(key) = crossterm::event::read().unwrap() {
                    futures::executor::block_on(
                        tx_capture.send(rook_cli::tui::state::TuiEvent::Input(key)),
                    )
                    .ok();
                }
            }
            futures::executor::block_on(tx_capture.send(rook_cli::tui::state::TuiEvent::Tick))
                .ok();
        });

        rook_cli::tui::app::run_with_state(state_for_tui, rx, cmd_tx_for_tui)
    });

    let tx_for_session = tx.clone();
    tokio::spawn(async move {
        let mut session = rook_cli::session::build_session(
            session_config.clone(),
            Some(tx_for_session.clone()),
        )
        .await;

        while let Some(command) = cmd_rx.recv().await {
            match command {
                AppCommand::SubmitPrompt(input_text) => {
                    if let Err(err) = session
                        .process_message(
                            rook::conversation::message::Message::user().with_text(&input_text),
                            tokio_util::sync::CancellationToken::default(),
                            true,
                        )
                        .await
                    {
                        let _ = tx_for_session
                            .send(TuiEvent::SessionError(err.to_string()))
                            .await;
                    }
                }
                AppCommand::Approve(id) => {
                    session.handle_confirmation(id, rook::permission::PermissionConfirmation {
                        principal_type: rook::permission::permission_confirmation::PrincipalType::Tool,
                        permission: rook::permission::Permission::AllowOnce,
                    }).await;
                }
                AppCommand::Reject(id) => {
                    session.handle_confirmation(id, rook::permission::PermissionConfirmation {
                        principal_type: rook::permission::permission_confirmation::PrincipalType::Tool,
                        permission: rook::permission::Permission::DenyOnce,
                    }).await;
                }
                AppCommand::ReloadSession => {
                    session = rook_cli::session::build_session(
                        session_config.clone(),
                        Some(tx_for_session.clone()),
                    )
                    .await;
                }
            }
        }
    });

    tui_handle.await??;
    Ok(())
}