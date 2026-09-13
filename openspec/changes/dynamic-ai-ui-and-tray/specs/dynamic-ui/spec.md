## ADDED Requirements

### Requirement: Generative Dynamic Interface via AI
The application SHALL allow users to modify the interface in real time by describing desired aesthetics, layout, colors, fonts, or element sizes in plain natural language.

#### Scenario: User requests Matrix-style interface
- **WHEN** user types "сделай неоновый зеленый стиль матрицы с моноширинным шрифтом"
- **THEN** the AI updates the theme colors, glow intensities, fonts, and radial dial layout dynamically without reloading.

### Requirement: Frameless Window Resizing
The application SHALL provide responsive edge and corner resize zones so users can freely stretch or shrink the window while keeping frameless styling.

#### Scenario: User drags bottom-right corner to expand window
- **WHEN** user grabs the bottom-right corner and drags outward
- **THEN** the window width and height smoothly resize in real-time according to mouse movement.

### Requirement: Persistent System Tray and Close-to-Tray
The application SHALL display a system tray icon with tooltip and menu. Clicking the close button SHALL hide the window to tray instead of terminating background processes.

#### Scenario: Window hidden to tray on close
- **WHEN** user clicks the close '✕' button
- **THEN** the window disappears from taskbar, a notification confirms background operation, and the tray icon remains active.
