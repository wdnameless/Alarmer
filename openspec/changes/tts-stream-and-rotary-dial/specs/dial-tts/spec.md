## ADDED Requirements

### Requirement: Distinct Voice Auditioning
The TTS engine MUST produce clearly distinct vocal timbres (e.g. Male vs Female, Russian vs English) for each selectable voice option in settings.

#### Scenario: User switches from Svetlana to Dmitry
- **WHEN** user selects Dmitry
- **THEN** speech plays with a deep male timbre, distinct from Svetlana's female pitch.

### Requirement: Continuous Rotary Dial Animation
Dragging the dial knob MUST rotate the knob and the neon progress arc smoothly and continuously in real time following the cursor angle.

#### Scenario: User drags dial
- **WHEN** user clicks and rotates the knob
- **THEN** the knob and arc follow the cursor angle continuously, and time numbers update correspondingly.
