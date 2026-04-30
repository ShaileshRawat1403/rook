use anyhow::Result;
use crossterm::{
    event::{self, Event, KeyCode, KeyEventKind},
    execute,
    terminal::{disable_raw_mode, enable_raw_mode, EnterAlternateScreen, LeaveAlternateScreen},
};
use ratatui::{
    backend::CrosstermBackend,
    layout::{Constraint, Direction, Layout, Rect},
    style::{Color, Modifier, Style},
    text::{Line, Span},
    widgets::{Block, BorderType, Borders, Clear},
    Frame, Terminal,
};
use rook::model::ModelConfig;
use std::io;
use std::time::{Duration, Instant};
use tokio::sync::mpsc;

use crate::tui::{
    chat::ChatPanel,
    commands::SlashCommand,
    state::{
        AppCommand, AppState, ConfigStep, MessageRole, RunState, SharedState, TuiEvent, CYAN,
        GREEN, RED, TEXT_MUTED, TEXT_PRIMARY, YELLOW,
    },
};

pub const APP_TITLE: &str = "ROOK";
const APP_BG: Color = Color::Rgb(10, 12, 16);
const HEADER_BG: Color = Color::Rgb(13, 17, 23);
const FOOTER_BG: Color = Color::Rgb(11, 13, 17);
const PANEL_BORDER: Color = Color::Rgb(34, 40, 49);

pub fn run() -> Result<()> {
    let session_id = format!("rook-{}", chrono::Local::now().format("%Y%m%d-%H%M%S"));
    let state = std::sync::Arc::new(std::sync::Mutex::new(AppState::new(session_id)));
    let (tx, rx) = mpsc::channel(100);
    let (cmd_tx, _cmd_rx) = mpsc::channel(1);

    std::thread::spawn(move || {
        let tick_rate = Duration::from_millis(50);
        let mut last_tick = Instant::now();
        loop {
            let timeout = tick_rate
                .checked_sub(last_tick.elapsed())
                .unwrap_or_else(|| Duration::from_secs(0));

            // Poll for any terminal event. We intentionally do not panic here
            // when the terminal misbehaves: a transient poll/read failure
            // shouldn't tear down the whole TUI thread (which would leave the
            // user's terminal in raw mode). Errors are logged and the loop
            // continues; persistent failures will surface as a missing redraw.
            match event::poll(timeout) {
                Ok(true) => match event::read() {
                    Ok(Event::Key(key)) => {
                        futures::executor::block_on(tx.send(TuiEvent::Input(key))).ok();
                    }
                    Ok(Event::Resize(cols, rows)) => {
                        futures::executor::block_on(tx.send(TuiEvent::Resize { cols, rows }))
                            .ok();
                    }
                    Ok(_) => {
                        // Mouse / Paste / Focus events are not consumed by the
                        // TUI yet; ignore rather than panic on the unmatched
                        // variant.
                    }
                    Err(err) => {
                        tracing::warn!("crossterm event read failed: {err}");
                    }
                },
                Ok(false) => {}
                Err(err) => {
                    tracing::warn!("crossterm event poll failed: {err}");
                }
            }

            if last_tick.elapsed() >= tick_rate {
                futures::executor::block_on(tx.send(TuiEvent::Tick)).ok();
                last_tick = Instant::now();
            }
        }
    });

    run_tui(state, rx, cmd_tx)
}

pub fn run_with_state(
    state: SharedState,
    rx: mpsc::Receiver<TuiEvent>,
    cmd_tx: mpsc::Sender<AppCommand>,
) -> Result<()> {
    run_tui(state, rx, cmd_tx)
}

/// RAII guard that owns the terminal's raw-mode + alternate-screen state.
///
/// Restores cooked mode, leaves the alternate screen, and shows the cursor on
/// drop — including drop-via-panic. Without this, a panic anywhere inside the
/// event loop would leave the user staring at a corrupted terminal with no
/// echo and no visible cursor.
struct TerminalGuard;

impl TerminalGuard {
    fn enter() -> Result<Self> {
        enable_raw_mode()?;
        execute!(io::stdout(), EnterAlternateScreen)?;
        Ok(Self)
    }
}

impl Drop for TerminalGuard {
    fn drop(&mut self) {
        // Best-effort restore. Errors here can't be propagated and panicking
        // during drop would only make things worse, so we swallow them.
        let _ = disable_raw_mode();
        let _ = execute!(io::stdout(), LeaveAlternateScreen, crossterm::cursor::Show);
    }
}

fn run_tui(
    state: SharedState,
    rx: mpsc::Receiver<TuiEvent>,
    cmd_tx: mpsc::Sender<AppCommand>,
) -> Result<()> {
    let _guard = TerminalGuard::enter()?;

    let backend = CrosstermBackend::new(io::stdout());
    let mut terminal = Terminal::new(backend)?;

    run_event_loop(&mut terminal, state, rx, cmd_tx)
    // `_guard` drops here, restoring the terminal regardless of whether the
    // event loop returned Ok, Err, or panicked.
}

/// Acquire the AppState mutex, recovering from poisoning rather than panicking.
///
/// std::sync::Mutex::lock returns Err if a previous holder panicked while
/// the lock was held. The default `.unwrap()` would then panic on every
/// subsequent lock attempt — including from the next user keystroke,
/// cascading the original panic into a terminal-killing loop. Recovering
/// the inner data lets the TUI keep running (state may be inconsistent;
/// the user can quit cleanly via Ctrl+C and the Drop guard restores the
/// terminal).
fn lock_state(state: &SharedState) -> std::sync::MutexGuard<'_, AppState> {
    state.lock().unwrap_or_else(|poison| {
        tracing::warn!("AppState mutex was poisoned; recovering inner state");
        poison.into_inner()
    })
}

fn run_event_loop<F>(
    terminal: &mut Terminal<F>,
    state: SharedState,
    mut rx: mpsc::Receiver<TuiEvent>,
    cmd_tx: mpsc::Sender<AppCommand>,
) -> Result<()>
where
    F: io::Write + ratatui::backend::Backend,
{
    loop {
        while let Ok(event) = rx.try_recv() {
            match event {
                TuiEvent::Input(key) => {
                    if key.kind == KeyEventKind::Press {
                        match key.code {
                            KeyCode::Char('c')
                                if key
                                    .modifiers
                                    .contains(crossterm::event::KeyModifiers::CONTROL) =>
                            {
                                return Ok(());
                            }
                            KeyCode::Enter => {
                                let mut guard = lock_state(&state);

                                // High-Fidelity Provider Flow State Machine
                                match guard.config_step {
                                    ConfigStep::SelectProvider => {
                                        let selected_index = guard.selection_modal_index;
                                        guard.begin_provider_setup(selected_index);
                                        let should_prepare_models =
                                            guard.config_step == ConfigStep::SelectModel;
                                        drop(guard);
                                        if should_prepare_models {
                                            prepare_provider_models(&state);
                                        }
                                    }
                                    ConfigStep::EnterConfigKey => {
                                        let input = guard.input_buffer.clone();
                                        if guard.store_current_provider_input(input) {
                                            guard.input_buffer.clear();
                                            guard.advance_provider_setup();
                                            let should_prepare_models =
                                                guard.config_step == ConfigStep::SelectModel;
                                            drop(guard);
                                            if should_prepare_models {
                                                prepare_provider_models(&state);
                                            }
                                        }
                                    }
                                    ConfigStep::OAuthConfig => {
                                        let provider = guard.selected_provider.clone();
                                        drop(guard);

                                        let oauth_result = tokio::runtime::Handle::current()
                                            .block_on(async {
                                                let Some(provider) = provider else {
                                                    return Err(anyhow::anyhow!(
                                                        "No provider selected"
                                                    ));
                                                };
                                                let model =
                                                    ModelConfig::new(&provider.default_model)?
                                                        .with_canonical_limits(&provider.name);
                                                let instance = rook::providers::create(
                                                    &provider.name,
                                                    model,
                                                    Vec::new(),
                                                )
                                                .await?;
                                                instance
                                                    .configure_oauth()
                                                    .await
                                                    .map_err(|e| anyhow::anyhow!(e.to_string()))
                                            });

                                        let mut guard = lock_state(&state);
                                        match oauth_result {
                                            Ok(()) => {
                                                if let Some(key) =
                                                    guard.current_provider_key().cloned()
                                                {
                                                    guard.add_message(
                                                        MessageRole::System,
                                                        format!(
                                                            "OAuth connected for {}.",
                                                            key.name
                                                        ),
                                                    );
                                                }
                                                guard.pending_key_index += 1;
                                                guard.advance_provider_setup();
                                                let should_prepare_models =
                                                    guard.config_step == ConfigStep::SelectModel;
                                                drop(guard);
                                                if should_prepare_models {
                                                    prepare_provider_models(&state);
                                                }
                                            }
                                            Err(err) => {
                                                guard.add_message(
                                                    MessageRole::System,
                                                    format!("OAuth setup failed: {}", err),
                                                );
                                            }
                                        }
                                    }
                                    ConfigStep::SelectModel => {
                                        if let Some(model) = guard
                                            .selection_modal_items
                                            .get(guard.selection_modal_index)
                                            .cloned()
                                        {
                                            guard.pending_model = Some(model.clone());
                                            persist_provider_configuration(&mut guard);
                                            let _ = cmd_tx.blocking_send(AppCommand::ReloadSession);
                                        }
                                    }
                                    ConfigStep::ConfirmAdvancedSettings => {}
                                    _ => {
                                        // Normal Command/Chat flow
                                        if guard.show_selection_modal {
                                            let selected = guard
                                                .selection_modal_items
                                                .get(guard.selection_modal_index)
                                                .cloned();
                                            guard.show_selection_modal = false;
                                            if let Some(item) = selected {
                                                let title = guard.selection_modal_title.clone();
                                                if title.contains("MODELS") {
                                                    guard.active_model = item.clone();
                                                    guard.add_message(
                                                        MessageRole::System,
                                                        format!("Switched to model: {}", item),
                                                    );
                                                }
                                            }
                                        } else if guard.show_command_palette {
                                            let input = guard.input_buffer.clone();
                                            let filtered: Vec<SlashCommand> =
                                                SlashCommand::all_commands()
                                                    .into_iter()
                                                    .filter(|cmd| {
                                                        cmd.to_string().starts_with(&input)
                                                    })
                                                    .collect();

                                            if let Some(cmd) =
                                                filtered.get(guard.selected_command_index)
                                            {
                                                let cmd_str = cmd.to_string();
                                                guard.show_command_palette = false;

                                                match cmd {
                                                    SlashCommand::Provider => {
                                                        guard.open_provider_selection();
                                                        guard.input_buffer.clear();
                                                    }
                                                    SlashCommand::Model => {
                                                        let provider = guard
                                                            .selected_provider
                                                            .clone()
                                                            .or_else(|| {
                                                                guard
                                                                    .available_providers
                                                                    .iter()
                                                                    .find(|provider| {
                                                                        provider.name
                                                                            == guard.active_provider
                                                                    })
                                                                    .cloned()
                                                            });
                                                        if let Some(provider) = provider {
                                                            guard.selected_provider =
                                                                Some(provider.clone());
                                                            guard.temp_provider =
                                                                provider.name.clone();
                                                            guard.config_step =
                                                                ConfigStep::SelectModel;
                                                            guard.show_selection_modal = false;
                                                            drop(guard);
                                                            prepare_provider_models(&state);
                                                        } else {
                                                            guard.add_message(
                                                                MessageRole::System,
                                                                "No provider is configured yet. Use /provider first.".to_string(),
                                                            );
                                                        }
                                                    }
                                                    SlashCommand::Clear => {
                                                        let session_id =
                                                            guard.projected.thread.id.clone();
                                                        guard.emit(crate::tui::events::RunEvent::RunStarted { session_id });
                                                        guard.input_buffer.clear();
                                                    }
                                                    SlashCommand::Help => {
                                                        guard.add_message(MessageRole::System, "Available Commands: /provider, /model, /config, /clear, /help".to_string());
                                                        guard.input_buffer.clear();
                                                    }
                                                    _ => {
                                                        guard.input_buffer = cmd_str;
                                                    }
                                                }
                                            }
                                        } else if !guard.input_buffer.is_empty()
                                            && !guard.is_processing
                                        {
                                            let input = guard.input_buffer.clone();
                                            guard.is_processing = true;
                                            guard.emit(
                                                crate::tui::events::RunEvent::IntentCreated {
                                                    prompt: input.clone(),
                                                },
                                            );
                                            let _ = cmd_tx
                                                .blocking_send(AppCommand::SubmitPrompt(input));
                                            guard.input_buffer.clear();
                                        }
                                    }
                                }
                            }
                            KeyCode::Up => {
                                let mut guard = lock_state(&state);
                                if guard.show_selection_modal {
                                    if guard.selection_modal_index > 0 {
                                        guard.selection_modal_index -= 1;
                                    } else {
                                        guard.selection_modal_index =
                                            guard.selection_modal_items.len().saturating_sub(1);
                                    }
                                } else if guard.show_command_palette {
                                    let input = guard.input_buffer.clone();
                                    let filtered_count = SlashCommand::all_commands()
                                        .into_iter()
                                        .filter(|cmd| cmd.to_string().starts_with(&input))
                                        .count();
                                    if filtered_count > 0 {
                                        if guard.selected_command_index > 0 {
                                            guard.selected_command_index -= 1;
                                        } else {
                                            guard.selected_command_index = filtered_count - 1;
                                        }
                                    }
                                } else {
                                    guard.scroll_chat_up();
                                }
                            }
                            KeyCode::Down => {
                                let mut guard = lock_state(&state);
                                if guard.show_selection_modal {
                                    if guard.selection_modal_index
                                        < guard.selection_modal_items.len().saturating_sub(1)
                                    {
                                        guard.selection_modal_index += 1;
                                    } else {
                                        guard.selection_modal_index = 0;
                                    }
                                } else if guard.show_command_palette {
                                    let input = guard.input_buffer.clone();
                                    let filtered_count = SlashCommand::all_commands()
                                        .into_iter()
                                        .filter(|cmd| cmd.to_string().starts_with(&input))
                                        .count();
                                    if filtered_count > 0 {
                                        if guard.selected_command_index < filtered_count - 1 {
                                            guard.selected_command_index += 1;
                                        } else {
                                            guard.selected_command_index = 0;
                                        }
                                    }
                                } else {
                                    guard.scroll_chat_down();
                                }
                            }
                            KeyCode::Esc => {
                                let mut guard = lock_state(&state);
                                guard.show_command_palette = false;
                                guard.show_selection_modal = false;
                                guard.config_step = ConfigStep::None;
                            }
                            KeyCode::Char('a') | KeyCode::Char('A') => {
                                let mut guard = lock_state(&state);
                                if let Some(approval) = guard.projected.intervention.clone() {
                                    let id = approval.id.clone();
                                    guard.emit(crate::tui::events::RunEvent::ApprovalResolved {
                                        id: id.clone(),
                                        decision: crate::tui::events::ApprovalDecision::Approve,
                                    });
                                    drop(guard);
                                    let _ = cmd_tx.blocking_send(AppCommand::Approve(id));
                                } else if !guard.show_selection_modal {
                                    guard.input_buffer.push('a');
                                }
                            }
                            KeyCode::Char('r') | KeyCode::Char('R') => {
                                let mut guard = lock_state(&state);
                                if let Some(approval) = guard.projected.intervention.clone() {
                                    let id = approval.id.clone();
                                    guard.emit(crate::tui::events::RunEvent::ApprovalResolved {
                                        id: id.clone(),
                                        decision: crate::tui::events::ApprovalDecision::Reject,
                                    });
                                    drop(guard);
                                    let _ = cmd_tx.blocking_send(AppCommand::Reject(id));
                                } else if !guard.show_selection_modal {
                                    guard.input_buffer.push('r');
                                }
                            }
                            KeyCode::Char(c) => {
                                let mut guard = lock_state(&state);
                                if !guard.show_selection_modal {
                                    guard.input_buffer.push(c);

                                    if guard.input_buffer.starts_with('/') {
                                        guard.show_command_palette = true;
                                        let input = guard.input_buffer.clone();
                                        let filtered_count = SlashCommand::all_commands()
                                            .into_iter()
                                            .filter(|cmd| cmd.to_string().starts_with(&input))
                                            .count();
                                        if filtered_count == 0 {
                                            guard.show_command_palette = false;
                                        } else if guard.selected_command_index >= filtered_count {
                                            guard.selected_command_index = 0;
                                        }
                                    } else {
                                        guard.show_command_palette = false;
                                    }
                                }
                            }
                            KeyCode::Backspace => {
                                let mut guard = lock_state(&state);
                                if !guard.show_selection_modal {
                                    guard.input_buffer.pop();

                                    if guard.input_buffer.starts_with('/') {
                                        if guard.input_buffer.is_empty() {
                                            guard.show_command_palette = false;
                                        } else {
                                            guard.show_command_palette = true;
                                            let input = guard.input_buffer.clone();
                                            let filtered_count = SlashCommand::all_commands()
                                                .into_iter()
                                                .filter(|cmd| cmd.to_string().starts_with(&input))
                                                .count();
                                            if filtered_count == 0 {
                                                guard.show_command_palette = false;
                                            } else if guard.selected_command_index >= filtered_count
                                            {
                                                guard.selected_command_index = 0;
                                            }
                                        }
                                    } else {
                                        guard.show_command_palette = false;
                                    }
                                }
                            }
                            _ => {}
                        }
                    }
                }
                TuiEvent::Agent(agent_event) => {
                    let mut guard = lock_state(&state);
                    guard.handle_agent_event(agent_event);
                }
                TuiEvent::SessionError(err) => {
                    let mut guard = lock_state(&state);
                    guard.is_processing = false;
                    guard.emit(crate::tui::events::RunEvent::RunFailed(err.clone()));
                    guard.add_message(MessageRole::System, format!("Session failed: {}", err));
                }
                TuiEvent::Tick => {}
                TuiEvent::Resize { cols, rows } => {
                    // Sync the backend buffer to the new terminal size and
                    // clear so the next draw renders against fresh dimensions
                    // rather than a layout cached from the previous size.
                    if let Err(err) = terminal.resize(ratatui::layout::Rect {
                        x: 0,
                        y: 0,
                        width: cols,
                        height: rows,
                    }) {
                        tracing::warn!("terminal resize failed: {err}");
                    }
                    if let Err(err) = terminal.clear() {
                        tracing::warn!("terminal clear after resize failed: {err}");
                    }
                }
            }
        }

        let (
            thread,
            chat_scroll,
            input,
            is_processing,
            run_state,
            intervention,
            show_command_palette,
            selected_command_index,
            show_selection_modal,
            selection_modal_title,
            selection_modal_items,
            selection_modal_index,
            active_model,
            active_provider,
            config_step,
            posture,
        ) = {
            let guard = lock_state(&state);
            (
                guard.projected.thread.clone(),
                guard.chat_scroll,
                guard.input_buffer.clone(),
                guard.is_processing,
                guard.projected.run_state.clone(),
                guard.projected.intervention.clone(),
                guard.show_command_palette,
                guard.selected_command_index,
                guard.show_selection_modal,
                guard.selection_modal_title.clone(),
                guard.selection_modal_items.clone(),
                guard.selection_modal_index,
                guard.active_model.clone(),
                guard.active_provider.clone(),
                guard.config_step.clone(),
                guard.projected.posture.clone(),
            )
        };

        terminal.draw(|f: &mut Frame| {
            let frame_area = f.area();
            f.render_widget(Clear, frame_area);
            let main_chunks = split_main_layout(frame_area, intervention.is_some());

            render_workstation_header(
                f,
                main_chunks[0],
                &thread.id,
                &active_provider,
                &active_model,
                &posture,
            );

            // 2. Chat Area
            render_chat_surface(f, main_chunks[1], ChatPanel::new(thread, chat_scroll));

            // 3. Optional Approval Panel
            if let Some(approval) = &intervention {
                render_approval_panel(f, main_chunks[2], approval);
            }

            let composer_title = match config_step {
                ConfigStep::EnterConfigKey => "PROVIDER SETUP",
                ConfigStep::OAuthConfig => "OAUTH",
                ConfigStep::SelectProvider => "PROVIDER",
                ConfigStep::SelectModel => "MODEL",
                _ => "PROMPT",
            };

            let display_input = match config_step {
                ConfigStep::EnterConfigKey => {
                    let guard = lock_state(&state);
                    if guard
                        .current_provider_key()
                        .map(|key| key.secret)
                        .unwrap_or(false)
                    {
                        "*".repeat(input.len())
                    } else {
                        input.clone()
                    }
                }
                _ => input.clone(),
            };
            let placeholder = match config_step {
                ConfigStep::EnterConfigKey => {
                    let key_label = {
                        let guard = lock_state(&state);
                        guard.current_provider_key_label()
                    };
                    key_label
                        .map(|label| format!("Enter {} and press Enter.", label))
                        .unwrap_or_else(|| {
                            "Enter the provider setting and press Enter.".to_string()
                        })
                }
                ConfigStep::OAuthConfig => {
                    "Press Enter to start the provider OAuth flow.".to_string()
                }
                ConfigStep::SelectProvider => "Choose a provider from the list.".to_string(),
                ConfigStep::SelectModel => "Choose a model from the list.".to_string(),
                _ => "Describe the task, or use /provider /model /clear /help.".to_string(),
            };

            let composer = crate::tui::widgets::ComposerWidget {
                title: composer_title,
                placeholder: &placeholder,
                input: &display_input,
                is_processing,
            };
            render_footer_surface(
                f,
                main_chunks[3],
                composer,
                &run_state,
                &posture,
                &active_provider,
                &active_model,
            );

            // 6. Overlays (Command Palette or Selection Modal)
            if show_selection_modal {
                let area = centered_rect(50, 30, f.area());
                let modal = crate::tui::widgets::SelectionModalWidget {
                    title: &selection_modal_title,
                    items: selection_modal_items,
                    details: {
                        let guard = lock_state(&state);
                        guard.selection_modal_details.clone()
                    },
                    selected_index: selection_modal_index,
                };
                f.render_widget(ratatui::widgets::Clear, area);
                f.render_widget(modal, area);
            } else if show_command_palette {
                let filtered: Vec<SlashCommand> = SlashCommand::all_commands()
                    .into_iter()
                    .filter(|cmd| cmd.to_string().starts_with(&input))
                    .collect();

                let area = centered_rect(60, 40, f.area());
                let palette = crate::tui::widgets::CommandPaletteWidget {
                    commands: filtered,
                    selected_index: selected_command_index,
                };
                f.render_widget(ratatui::widgets::Clear, area);
                f.render_widget(palette, area);
            }
        })?;

        std::thread::sleep(Duration::from_millis(16));
    }
}

fn prepare_provider_models(state: &SharedState) {
    let (provider, fallback_models, pending_values) = {
        let mut guard = lock_state(&state);
        let Some(provider) = guard.selected_provider.clone() else {
            return;
        };
        let fallback_models = if provider.known_models.is_empty() {
            vec![provider.default_model.clone()]
        } else {
            provider.known_models.clone()
        };
        let pending_values = guard.temp_config_values.clone();
        guard.show_selection_modal = false;
        guard.selection_modal_title = format!("{} MODELS", provider.display_name);
        guard.selection_modal_items.clear();
        guard.selection_modal_details.clear();
        guard.add_message(
            MessageRole::System,
            format!(
                "Checking {} and loading recommended models...",
                provider.display_name
            ),
        );
        (provider, fallback_models, pending_values)
    };

    let model_result = tokio::runtime::Handle::current().block_on(async {
        let config = rook::config::Config::global();
        for key in &provider.config_keys {
            if let Some(value) = pending_values.get(&key.name) {
                if key.secret {
                    config
                        .set_secret(&key.name, value)
                        .map_err(|err| anyhow::anyhow!(err.to_string()))?;
                } else {
                    config
                        .set_param(&key.name, value)
                        .map_err(|err| anyhow::anyhow!(err.to_string()))?;
                }
            }
        }

        let model =
            ModelConfig::new(&provider.default_model)?.with_canonical_limits(&provider.name);
        let instance = rook::providers::create(&provider.name, model, Vec::new()).await?;
        instance
            .fetch_recommended_models()
            .await
            .map_err(|err| anyhow::anyhow!(err.to_string()))
    });

    let mut guard = lock_state(&state);
    if guard
        .selected_provider
        .as_ref()
        .map(|selected| selected.name != provider.name)
        .unwrap_or(true)
    {
        return;
    }

    match model_result {
        Ok(models) => {
            let models = if models.is_empty() {
                fallback_models
            } else {
                models
            };
            guard.open_model_selection(models);
        }
        Err(err) => {
            guard.config_step = ConfigStep::EnterConfigKey;
            guard.show_selection_modal = false;
            guard.add_message(
                MessageRole::System,
                format!(
                    "Provider check failed for {}: {}",
                    provider.display_name, err
                ),
            );
        }
    }
}

fn persist_provider_configuration(state: &mut AppState) {
    let Some(model) = state.pending_model.clone() else {
        return;
    };

    state.active_model = model;
    state.active_provider = state.temp_provider.clone();
    state.config_step = ConfigStep::None;
    state.show_selection_modal = false;

    let config = rook::config::Config::global();
    let _ = config.set_param("ROOK_PROVIDER", &state.active_provider);
    let _ = config.set_param("ROOK_MODEL", &state.active_model);

    for key in &state.pending_primary_keys {
        if let Some(value) = state.temp_config_values.get(&key.name) {
            if key.secret {
                let _ = config.set_secret(&key.name, value);
            } else {
                let _ = config.set_param(&key.name, value);
            }
        }
    }

    for key in &state.pending_advanced_keys {
        if let Some(value) = state.temp_config_values.get(&key.name) {
            if key.secret {
                let _ = config.set_secret(&key.name, value);
            } else {
                let _ = config.set_param(&key.name, value);
            }
        }
    }

    let msg = format!(
        "Connected and saved {}/{}",
        state.active_provider, state.active_model
    );
    state.add_message(MessageRole::System, msg);
    state.pending_model = None;
    state.temp_key.clear();
    state.temp_provider.clear();
    state.pending_primary_keys.clear();
    state.pending_advanced_keys.clear();
    state.pending_key_index = 0;
    state.temp_config_values.clear();
    state.selection_modal_items.clear();
    state.selection_modal_details.clear();
}

fn render_codex_status_line(
    f: &mut Frame,
    area: Rect,
    run_state: &RunState,
    posture: &crate::tui::projection::AuditPosture,
    provider: &str,
    model: &str,
) {
    if area.width == 0 || area.height == 0 {
        return;
    }

    let phases = [
        ("Intent", matches!(run_state, RunState::Understanding)),
        ("Plan", matches!(run_state, RunState::Planning)),
        (
            "Execute",
            matches!(run_state, RunState::Acting | RunState::WaitingForApproval),
        ),
        ("Verify", matches!(run_state, RunState::Verifying)),
        (
            "Output",
            matches!(run_state, RunState::Completed | RunState::Idle),
        ),
    ];
    let phase_spans: Vec<Span> = phases
        .iter()
        .enumerate()
        .flat_map(|(idx, (label, active))| {
            let mut spans = vec![Span::styled(
                format!(" {} ", label),
                Style::default()
                    .fg(if *active { Color::Black } else { TEXT_MUTED })
                    .bg(if *active {
                        CYAN
                    } else {
                        Color::Rgb(29, 34, 42)
                    })
                    .add_modifier(if *active {
                        Modifier::BOLD
                    } else {
                        Modifier::empty()
                    }),
            )];
            if idx < phases.len() - 1 {
                spans.push(Span::styled(" › ", Style::default().fg(TEXT_MUTED)));
            }
            spans
        })
        .collect();

    let detail = format!(
        "Phase {}  Provider {}/{}  Posture {:?}",
        run_state, provider, model, posture
    );

    let mut lines = vec![Line::from(phase_spans)];
    if area.height > 1 {
        lines.push(Line::from(vec![Span::styled(
            detail,
            Style::default().fg(TEXT_MUTED),
        )]));
    }

    let paragraph = ratatui::widgets::Paragraph::new(lines).style(Style::default().bg(FOOTER_BG));

    f.render_widget(paragraph, area);
}

fn render_chat_surface(f: &mut Frame, area: Rect, chat: ChatPanel) {
    if area.width < 4 || area.height < 3 {
        return;
    }

    let block = Block::default()
        .borders(Borders::ALL)
        .border_type(BorderType::Rounded)
        .border_style(Style::default().fg(PANEL_BORDER))
        .style(Style::default().bg(APP_BG))
        .title(Span::styled(" SESSION ", Style::default().fg(TEXT_MUTED)));
    let inner = block.inner(area);
    f.render_widget(block, area);
    f.render_widget(chat, inner);
}

fn render_footer_surface(
    f: &mut Frame,
    area: Rect,
    composer: crate::tui::widgets::ComposerWidget<'_>,
    run_state: &RunState,
    posture: &crate::tui::projection::AuditPosture,
    provider: &str,
    model: &str,
) {
    if area.width < 4 || area.height < 4 {
        return;
    }

    let block = Block::default()
        .borders(Borders::TOP)
        .border_style(Style::default().fg(PANEL_BORDER))
        .style(Style::default().bg(FOOTER_BG));
    let inner = block.inner(area);
    f.render_widget(block, area);

    let rows = Layout::default()
        .direction(Direction::Vertical)
        .constraints([Constraint::Length(2), Constraint::Min(3)])
        .split(inner);

    render_codex_status_line(f, rows[0], run_state, posture, provider, model);
    f.render_widget(composer, rows[1]);
}

fn render_approval_panel(f: &mut Frame, area: Rect, approval: &crate::tui::state::ApprovalRequest) {
    let widget = crate::tui::bottom_pane::ApprovalOverlayWidget { request: approval };
    f.render_widget(widget, area);
}

fn render_workstation_header(
    f: &mut Frame,
    area: Rect,
    session_id: &str,
    provider: &str,
    model: &str,
    posture: &crate::tui::projection::AuditPosture,
) {
    if area.width == 0 || area.height == 0 {
        return;
    }

    let line = Line::from(vec![
        Span::styled(
            format!(" {} ", APP_TITLE),
            Style::default()
                .fg(Color::Black)
                .bg(CYAN)
                .add_modifier(Modifier::BOLD),
        ),
        Span::raw(" "),
        Span::styled("session ", Style::default().fg(TEXT_MUTED)),
        Span::styled(short_session(session_id), Style::default().fg(TEXT_PRIMARY)),
        Span::raw("  "),
        Span::styled("mode ", Style::default().fg(TEXT_MUTED)),
        Span::styled(
            format!("{}/{}", provider, model),
            Style::default().fg(TEXT_PRIMARY),
        ),
        Span::raw("  "),
        Span::styled("posture ", Style::default().fg(TEXT_MUTED)),
        Span::styled(
            match posture {
                crate::tui::projection::AuditPosture::Blocked => "blocked",
                crate::tui::projection::AuditPosture::Guarded => "guarded",
                crate::tui::projection::AuditPosture::Open => "open",
            },
            Style::default().fg(match posture {
                crate::tui::projection::AuditPosture::Blocked => YELLOW,
                crate::tui::projection::AuditPosture::Guarded => GREEN,
                crate::tui::projection::AuditPosture::Open => RED,
            }),
        ),
    ]);

    let paragraph = ratatui::widgets::Paragraph::new(line).style(Style::default().bg(HEADER_BG));
    f.render_widget(paragraph, area);
}

fn short_session(session_id: &str) -> String {
    session_id.chars().take(12).collect()
}

fn centered_rect(percent_x: u16, percent_y: u16, r: Rect) -> Rect {
    let popup_layout = Layout::default()
        .direction(Direction::Vertical)
        .constraints([
            Constraint::Percentage((100 - percent_y) / 2),
            Constraint::Percentage(percent_y),
            Constraint::Percentage((100 - percent_y) / 2),
        ])
        .split(r);

    Layout::default()
        .direction(Direction::Horizontal)
        .constraints([
            Constraint::Percentage((100 - percent_x) / 2),
            Constraint::Percentage(percent_x),
            Constraint::Percentage((100 - percent_x) / 2),
        ])
        .split(popup_layout[1])[1]
}

fn split_main_layout(area: Rect, has_approval: bool) -> Vec<Rect> {
    let header_height = 1;
    let approval_height = if has_approval && area.height >= 24 {
        7
    } else {
        0
    };
    let footer_height = if area.height >= 22 {
        6
    } else if area.height >= 16 {
        5
    } else if area.height >= 14 {
        4
    } else {
        3
    };

    Layout::default()
        .direction(Direction::Vertical)
        .constraints([
            Constraint::Length(header_height),
            Constraint::Min(4),
            Constraint::Length(approval_height),
            Constraint::Length(footer_height),
        ])
        .split(area)
        .to_vec()
}
