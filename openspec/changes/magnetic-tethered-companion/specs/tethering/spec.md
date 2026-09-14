## ADDED Requirements

### Requirement: Magnetic Multi-Window Tethering
The application MUST magnetically tether the AI Companion window to the main timer window so dragging, minimizing, or restoring the main window synchronously updates the companion window.

#### Scenario: Dragging the main window
- **WHEN** user drags the main timer window across the desktop
- **THEN** the AI companion window follows smoothly alongside it, maintaining its relative right-docked position.

#### Scenario: Minimizing or restoring main window
- **WHEN** user minimizes the main window
- **THEN** the companion window minimizes simultaneously.
