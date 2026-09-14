## ADDED Requirements

### Requirement: Swiss Precision Dial (Dieter Rams Aesthetic)
The radial dial MUST present a tactile, analog clock face featuring 60 hairline tick marks with distinct major tick marks at 5-minute intervals and clean numerals at 12, 3, 6, 9.

#### Scenario: Visual dial inspection
- **WHEN** user views the primary timer
- **THEN** an elegant, matte monochrome dial with 12/3/6/9 indicators and an analog progress arc is rendered.

### Requirement: Interactive Schedule Accordion Card
When the AI assistant parses a multi-line workout plan, it MUST display an interactive preview accordion allowing the user to modify or delete individual alarms before batch creation.

#### Scenario: User reviews generated schedule
- **WHEN** AI returns schedule decomposition
- **THEN** user can adjust times, remove specific items, and click "Подтвердить и создать" to deploy.

### Requirement: Schedule JSON Import/Export
The application MUST allow exporting all configured alarms, workouts, and settings to a JSON file and importing them back.

#### Scenario: User exports data
- **WHEN** user clicks "Экспорт в JSON" in Settings
- **THEN** a complete JSON snapshot file is generated and downloaded.
