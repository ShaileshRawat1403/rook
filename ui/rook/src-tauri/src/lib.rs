mod commands;
mod services;
mod types;

use services::rook_config::RookConfig;
use services::personas::PersonaStore;
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager, Emitter,
};
#[allow(unused_imports)]
use tauri_plugin_global_shortcut::{Code, Modifiers, Shortcut, ShortcutState};
use tauri_plugin_window_state::StateFlags;

fn toggle_window(window: &tauri::WebviewWindow) {
    if window.is_visible().unwrap_or(false) {
        let _ = window.hide();
    } else {
        let _ = window.show();
        let _ = window.set_focus();
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(
            tauri_plugin_log::Builder::new()
                .level(log::LevelFilter::Info)
                .targets([tauri_plugin_log::Target::new(
                    tauri_plugin_log::TargetKind::Stdout,
                )])
                .build(),
        )
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(
            tauri_plugin_window_state::Builder::default()
                .with_state_flags(StateFlags::all() & !StateFlags::VISIBLE)
                .build(),
        )
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(
            tauri_plugin_single_instance::init(|app, argv, _cwd| {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
                if argv.len() > 1 {
                    let url = &argv[1];
                    if url.starts_with("rook://") {
                        let _ = app.emit("deep-link", url);
                    }
                }
            }),
        )
        .setup(|app| {
            let show_hide = MenuItem::with_id(app, "show_hide", "Show/Hide Rook", true, None::<&str>)?;
            let quit = MenuItem::with_id(app, "quit", "Quit Rook", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show_hide, &quit])?;

            let _tray = TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                .tooltip("Rook")
                .on_menu_event(|app, event| {
                    match event.id.as_ref() {
                        "show_hide" => {
                            if let Some(window) = app.get_webview_window("main") {
                                toggle_window(&window);
                            }
                        }
                        "quit" => {
                            app.exit(0);
                        }
                        _ => {}
                    }
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click { button: MouseButton::Left, button_state: MouseButtonState::Up, .. } = event {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            toggle_window(&window);
                        }
                    }
                })
                .build(app)?;

            #[cfg(desktop)]
            {
                use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};

                let cmd_comma = Shortcut::new(Some(Modifiers::META), Code::Comma);
                let cmd_b = Shortcut::new(Some(Modifiers::META), Code::KeyB);
                let cmd_n = Shortcut::new(Some(Modifiers::META), Code::KeyN);
                let cmd_k = Shortcut::new(Some(Modifiers::META), Code::KeyK);

                let _ = app.global_shortcut().on_shortcuts([cmd_comma, cmd_b, cmd_n, cmd_k], |app, shortcut, event| {
                    if event.state == ShortcutState::Pressed {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                            let _ = app.emit("shortcut", shortcut.to_string());
                        }
                    }
                });
            }

            Ok(())
        })
        .manage(PersonaStore::new())
        .manage(RookConfig::new());

    #[cfg(feature = "app-test-driver")]
    let builder = builder.plugin(tauri_plugin_app_test_driver::init());

    builder
        .invoke_handler(tauri::generate_handler![
            commands::agents::list_personas,
            commands::agents::create_persona,
            commands::agents::update_persona,
            commands::agents::delete_persona,
            commands::agents::refresh_personas,
            commands::agents::export_persona,
            commands::agents::import_personas,
            commands::agents::save_persona_avatar,
            commands::agents::save_persona_avatar_bytes,
            commands::agents::get_avatars_dir,
            commands::acp::get_rook_serve_url,
            commands::skills::create_skill,
            commands::skills::list_skills,
            commands::skills::delete_skill,
            commands::skills::update_skill,
            commands::skills::export_skill,
            commands::skills::import_skills,
            commands::projects::list_projects,
            commands::projects::create_project,
            commands::projects::update_project,
            commands::projects::delete_project,
            commands::projects::get_project,
            commands::projects::reorder_projects,
            commands::projects::list_archived_projects,
            commands::projects::archive_project,
            commands::projects::restore_project,
            commands::doctor::run_doctor,
            commands::doctor::run_doctor_fix,
            commands::extensions::list_extensions,
            commands::extensions::add_extension,
            commands::extensions::remove_extension,
            commands::extensions::toggle_extension,
            commands::git::get_git_state,
            commands::git_changes::get_changed_files,
            commands::git::git_switch_branch,
            commands::git::git_stash,
            commands::git::git_init,
            commands::git::git_fetch,
            commands::git::git_pull,
            commands::git::git_create_branch,
            commands::git::git_create_worktree,
            commands::credentials::get_provider_config,
            commands::credentials::save_provider_field,
            commands::credentials::delete_provider_config,
            commands::credentials::check_all_provider_status,
            commands::credentials::restart_app,
            commands::model_setup::authenticate_model_provider,
            commands::agent_setup::check_agent_installed,
            commands::agent_setup::check_agent_auth,
            commands::agent_setup::install_agent,
            commands::agent_setup::authenticate_agent,
            commands::sentinel::get_sentinel_mode,
            commands::sentinel::sentinel_evaluate,
            commands::path_resolver::resolve_path,
            commands::system::get_home_dir,
            commands::system::save_exported_session_file,
            commands::system::path_exists,
            commands::system::list_directory_entries,
            commands::system::inspect_attachment_paths,
            commands::system::list_files_for_mentions,
            commands::system::read_image_attachment,
            commands::workspace_manifest::read_workspace_manifest,
            commands::open_actions::open_in_terminal,
            commands::open_actions::open_in_editor,
            commands::work_items::list_work_items,
            commands::work_items::get_work_item,
            commands::work_items::create_work_item,
            commands::work_items::update_work_item,
            commands::work_items::delete_work_item,
            commands::notifications::request_notification_permission,
            commands::notifications::send_notification,
            commands::notifications::send_approval_notification,
            commands::notifications::send_task_completed_notification,
            commands::notifications::send_task_failed_notification,
        ])
        .setup(|_app| Ok(()))
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|_app, _event| {});
}
