# Change: Native High-Performance Rust Edge TTS Integration

## Why
Frontend Webview2 cannot bypass CORS or fetch raw WebSockets to Microsoft Edge TTS reliably without external dependencies. By adding `msedge-tts` to Tauri's Rust backend, Tauri exposes an IPC command `synthesize_edge_tts(text, voice_name) -> Result<String, String>` that returns a real Base64 MP3 stream. This guarantees 100% authentic, studio-quality neural voices for Jenny, Guy, Dmitry, Svetlana.

## Verification
- `cargo check --manifest-path src-tauri/Cargo.toml`
- `bun run build`
- In Settings, test each voice: Jenny, Guy, Dmitry, Svetlana each speak with their genuine distinct Microsoft Neural voice.
