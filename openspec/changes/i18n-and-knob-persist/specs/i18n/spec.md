## ADDED Requirements

### Requirement: Knob Time Persistence on Release
Releasing pointer drag on the radial dial knob MUST commit and retain the newly selected duration without reverting to the previous time.

#### Scenario: User sets 36 minutes
- **WHEN** user rotates knob to 36:00 and releases pointer
- **THEN** timer remains at 36:00 and starts from 36:00 upon pressing Play.

### Requirement: Dual Language Localization (EN / RU)
The entire application MUST support English and Russian languages, switchable dynamically from the settings panel.

#### Scenario: User switches to English
- **WHEN** user selects English in settings
- **THEN** all dashboard tabs, settings labels, timer buttons, and AI headers display in English.
