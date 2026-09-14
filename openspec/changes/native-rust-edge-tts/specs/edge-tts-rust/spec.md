## ADDED Requirements

### Requirement: Authentic Neural Voice Synthesis via Tauri Rust IPC
The application MUST synthesize authentic neural voices directly through the Rust backend using Microsoft Edge TTS WebSocket protocol and deliver MP3 audio to the frontend.

#### Scenario: User auditions any neural voice
- **WHEN** user clicks "Test voice" on Jenny, Guy, Dmitry, or Svetlana
- **THEN** Rust backend synthesizes distinct neural speech and the audio player plays it with crystal clarity.
