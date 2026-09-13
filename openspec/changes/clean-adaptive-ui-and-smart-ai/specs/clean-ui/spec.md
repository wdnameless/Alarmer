## ADDED Requirements

### Requirement: Distinct Audio Voices
The audio system MUST output distinctly different voices for selected speakers (male vs female, Russian vs English) using remote cloud audio streaming and pitch modulation.

#### Scenario: Switching speakers
- **WHEN** user selects Guy (English male) vs Svetlana (Russian female)
- **THEN** audibly different voices and languages play.

### Requirement: Clean Responsive Minimalist Design
The main screen MUST be clean, devoid of unnecessary quick-capture bars or dense badge clusters, and responsively scale to window dimensions.

#### Scenario: User resizes or views timer
- **WHEN** user looks at Dashboard
- **THEN** only the beautiful circular dial and sleek controls are visible.

### Requirement: Conversational AI Command Execution & Rejection
The AI Co-Pilot MUST execute requested changes directly, or state that a request is not supported if outside the app's capabilities.

#### Scenario: User asks to set timer
- **WHEN** user writes "поставь таймер на 15 минут"
- **THEN** AI sets timer to 15m and responds.

#### Scenario: User asks for unsupported feature
- **WHEN** user writes "закажи пиццу"
- **THEN** AI politely responds that this action is not supported in Alarmer.
