## ADDED Requirements

### Requirement: Escalating Alarm With Acknowledgement
An alarm MUST ramp its volume up, repeat until acknowledged, and offer a snooze action.

#### Scenario: Volume ramps up
- **WHEN** an alarm starts ringing
- **THEN** playback volume increases gradually rather than starting at full volume.

#### Scenario: Alarm repeats when ignored
- **WHEN** the user does not acknowledge an alarm
- **THEN** the signal repeats periodically until acknowledged.

#### Scenario: Snooze defers the alarm
- **WHEN** the user picks 10 minutes
- **THEN** the alarm re-fires after 10 minutes.

### Requirement: Per-Alarm Sound Resolution
Each alarm MUST play its own configured sound, including a user-supplied custom file.

#### Scenario: Two alarms with different sounds
- **WHEN** two alarms with different configured sounds fire
- **THEN** each plays its own sound rather than one global signal.
