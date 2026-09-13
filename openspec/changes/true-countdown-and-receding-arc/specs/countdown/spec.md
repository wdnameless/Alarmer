## ADDED Requirements

### Requirement: Immediate Countdown Execution on Release
Releasing the rotary dial MUST start the active countdown timer immediately and audibly, decrementing remaining seconds without delay.

#### Scenario: Drag and release
- **WHEN** user drags to 27:00 and releases
- **THEN** timer transitions to 26:59 after 1 second, the white progress line shortens towards 12 o'clock, and tick audio plays.
