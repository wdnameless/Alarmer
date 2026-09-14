use std::collections::hash_map::DefaultHasher;
use std::collections::HashMap;
use std::hash::{Hash, Hasher};
use std::sync::{Mutex, OnceLock};
use tauri::{
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
    Manager,
};
use base64::Engine;
use msedge_tts::{tts::client::connect, tts::SpeechConfig, voice::{get_voices_list, Voice}};

static AUDIO_CACHE: OnceLock<Mutex<HashMap<String, String>>> = OnceLock::new();
static VOICES_CACHE: OnceLock<Mutex<Option<Vec<Voice>>>> = OnceLock::new();

fn get_or_fetch_voices() -> Result<Vec<Voice>, String> {
    let cell = VOICES_CACHE.get_or_init(|| Mutex::new(None));
    let mut guard = cell.lock().map_err(|e| format!("Voices lock error: {e}"))?;
    if let Some(voices) = &*guard {
        return Ok(voices.clone());
    }
    let voices = get_voices_list().map_err(|e| format!("Failed to fetch voices: {e}"))?;
    *guard = Some(voices.clone());
    Ok(voices)
}

#[tauri::command]
async fn synthesize_speech(text: String, voice_id: String) -> Result<String, String> {
    let mut hasher = DefaultHasher::new();
    text.hash(&mut hasher);
    let text_hash = hasher.finish();
    let cache_key = format!("{voice_id}::{text_hash:x}");

    let cache_mutex = AUDIO_CACHE.get_or_init(|| Mutex::new(HashMap::new()));
    if let Ok(guard) = cache_mutex.lock() {
        if let Some(cached_data) = guard.get(&cache_key) {
            return Ok(cached_data.clone());
        }
    }

    let audio_uri = tauri::async_runtime::spawn_blocking(move || {
        let voices = get_or_fetch_voices()?;
        
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
    .map_err(|e| format!("Task join error: {e}"))??;

    if let Ok(mut guard) = cache_mutex.lock() {
        guard.insert(cache_key, audio_uri.clone());
    }

    Ok(audio_uri)
}

#[tauri::command]
async fn set_companion_mode(app: tauri::AppHandle, open: bool) -> Result<(), String> {
    if let Some(win) = app.get_webview_window("main") {
        let new_width = if open { 680.0 } else { 340.0 };
        let _ = win.set_size(tauri::LogicalSize::new(new_width, 480.0));
    }
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .invoke_handler(tauri::generate_handler![synthesize_speech, set_companion_mode])
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
                api.prevent_close();
                let _ = window.hide();
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
