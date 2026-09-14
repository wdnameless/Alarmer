## ADDED Requirements

### Requirement: Winter Monochrome Token Set
The application MUST ship a 'winter' theme using a near-monochrome palette where surface
elevation is expressed as small lightness steps and borders are 1px hairlines, with no
gradients and no glow effects.

#### Scenario: Winter theme is the default
- **WHEN** the application starts for the first time
- **THEN** the Winter theme is active.

#### Scenario: Legacy themes remain available
- **WHEN** the user opens Settings
- **THEN** the previous themes can still be selected.

### Requirement: Single Warm Marker Colour
Exactly one warm colour MUST be used, and only to denote the present moment — the current
time line, the progress arc, and the active dial knop.

#### Scenario: Nothing else glows
- **WHEN** the user inspects the main screen
- **THEN** no element other than the present-moment marker uses the warm colour.

### Requirement: Numerals Use a Monospace Face
All numeric readouts (time, minutes, counts) MUST render in JetBrains Mono so digits do
not shift while counting down, with Inter used for labels and controls.

#### Scenario: Digits do not jitter
- **WHEN** the countdown decrements
- **THEN** digit positions remain fixed.
