use tauri::{
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
    Manager,
};
use base64::Engine;
use msedge_tts::{tts::client::connect, tts::SpeechConfig, voice::get_voices_list};

#[tauri::command]
async fn synthesize_speech(text: String, voice_id: String) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let voices = get_voices_list().map_err(|e| format!("Failed to fetch voices: {e}"))?;
        
        // Match voice by ID or name substring
        let target_voice = voices
            .iter()
            .find(|v| {
                v.name.contains(&voice_id)
                    || v.short_name.as_deref().map_or(false, |s| s.contains(&voice_id))
            })
            .or_else(|| {
                if voice_id.contains("Jenny") {
                    voices.iter().find(|v| v.name.contains("JennyNeural"))
                } else if voice_id.contains("Guy") {
                    voices.iter().find(|v| v.name.contains("GuyNeural"))
                } else if voice_id.contains("Dmitry") {
                    voices.iter().find(|v| v.name.contains("DmitryNeural"))
                } else if voice_id.contains("Svetlana") {
                    voices.iter().find(|v| v.name.contains("SvetlanaNeural"))
                } else {
                    None
                }
            })
            .ok_or_else(|| format!("Voice {voice_id} not found in Edge TTS voice catalog"))?;

        let config = SpeechConfig::from(target_voice);
        let mut client = connect().map_err(|e| format!("WebSocket connect failed: {e}"))?;
        let audio = client
            .synthesize(&text, &config)
            .map_err(|e| format!("Synthesis failed: {e}"))?;

        if audio.audio_bytes.is_empty() {
            return Err("Synthesized 0 bytes".to_string());
        }

        let b64 = base64::engine::general_purpose::STANDARD.encode(&audio.audio_bytes);
        Ok(format!("data:audio/mp3;base64,{b64}"))
    })
    .await
    .map_err(|e| format!("Task join error: {e}"))?
}

#[tauri::command]
async fn toggle_ai_companion_window(app: tauri::AppHandle) -> Result<(), String> {
    if let Some(existing) = app.get_webview_window("ai-copilot") {
        if existing.is_visible().unwrap_or(false) {
            let _ = existing.close();
            return Ok(());
        } else {
            let _ = existing.show();
            let _ = existing.set_focus();
            return Ok(());
        }
    }

    let (x, y) = if let Some(main_win) = app.get_webview_window("main") {
        let pos = main_win.outer_position().unwrap_or_default();
        let size = main_win.outer_size().unwrap_or_default();
        (pos.x as f64 + size.width as f64 + 12.0, pos.y as f64)
    } else {
        (100.0, 100.0)
    };

    let builder = tauri::WebviewWindowBuilder::new(
        &app,
        "ai-copilot",
        tauri::WebviewUrl::App("index.html?window=ai-copilot".into()),
    )
    .title("Alarmer — AI Co-Pilot")
    .inner_size(340.0, 480.0)
    .position(x, y)
    .resizable(true)
    .decorations(false)
    .transparent(true)
    .always_on_top(false);

    builder.build().map_err(|e| format!("Failed to create window: {e}"))?;
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_notification::init())
        .invoke_handler(tauri::generate_handler![synthesize_speech, toggle_ai_companion_window])
        .setup(|app| {
            // Build Tray Menu
            let show_i = MenuItem::with_id(app, "show", "Показать Alarmer", true, None::<&str>)?;
            let hide_i = MenuItem::with_id(app, "hide", "Скрыть в трей", true, None::<&str>)?;
            let quit_i = MenuItem::with_id(app, "quit", "Выход", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show_i, &hide_i, &quit_i])?;

            let default_icon = app.default_window_icon().cloned();

            // Setup Tray Icon
            let mut builder = TrayIconBuilder::new()
                .menu(&menu)
                .tooltip("Alarmer — Умный будильник и таймер");
            let hourglass_bytes = include_bytes!("../icons/icon.ico");
            if let Ok(icon) = tauri::image::Image::from_bytes(hourglass_bytes) {
                builder = builder.icon(icon.clone());
                if let Some(win) = app.get_webview_window("main") {
                    let _ = win.set_icon(icon);
                }
            } else if let Some(icon) = default_icon {
                builder = builder.icon(icon);
            }

            let _tray = builder
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "show" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.unminimize();
                            let _ = window.set_focus();
                        }
                    }
                    "hide" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.hide();
                        }
                    }
                    "quit" => {
                        app.exit(0);
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let tauri::tray::TrayIconEvent::Click {
                        button: tauri::tray::MouseButton::Left,
                        button_state: tauri::tray::MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            if window.is_visible().unwrap_or(false) {
                                let _ = window.hide();
                            } else {
                                let _ = window.show();
                                let _ = window.unminimize();
                                let _ = window.set_focus();
                            }
                        }
                    }
                })
                .build(app)?;

            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                // Prevent exit, hide window to tray instead
                api.prevent_close();
                let _ = window.hide();
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
