## ADDED Requirements

### Requirement: Authentic FLAC Ticking Audio
The application MUST play the user-supplied high-fidelity ticking audio sample on every second of countdown when ticking is enabled.

#### Scenario: Second tick playback
- **WHEN** timer decrements one second
- **THEN** user's FLAC ticking sound buffer is played through Web Audio API.
