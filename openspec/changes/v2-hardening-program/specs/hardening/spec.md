## ADDED Requirements

### Requirement: Single AI Engine and Zero Dead Code
The codebase MUST contain exactly one live AI intent engine, with all superseded modules and unreferenced methods deleted.

#### Scenario: Dead module audit
- **WHEN** grep is run for AITrainer, WorkoutPlayer, Stopwatch, AIDynamicUIBar, aiDynamicUi, aiAssistant
- **THEN** zero references exist outside deleted files.

### Requirement: Versioned Persistent Store
Application state MUST persist to a native Tauri store file with an explicit schema version, and import MUST validate structure before applying.

#### Scenario: Corrupted import
- **WHEN** user imports a malformed JSON file
- **THEN** the import is rejected with a clear error and application state remains intact.

#### Scenario: Schema migration
- **WHEN** stored schema version is older than current
- **THEN** data is migrated forward without loss.

### Requirement: Render Error Containment
Every top-level module MUST be wrapped in an error boundary that shows a recovery action instead of a blank window.

#### Scenario: Module throws during render
- **WHEN** a component throws
- **THEN** a recovery panel with a restart action is shown and the rest of the app stays interactive.

### Requirement: Strict Content Security Policy
The Tauri window MUST run under an explicit CSP allowlist rather than a null policy.

#### Scenario: CSP enforcement
- **WHEN** the app loads
- **THEN** only self-origin plus configured AI/TTS HTTPS hosts are permitted.

### Requirement: TTS Audio Cache
Synthesized speech MUST be cached by content hash so repeated phrases replay without a new network round trip.

#### Scenario: Repeated phrase
- **WHEN** the same phrase and voice are spoken twice
- **THEN** the second playback is served from cache with no new synthesis request.
