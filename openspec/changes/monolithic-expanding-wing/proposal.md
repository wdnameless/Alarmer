# Change: Monolithic Unified Expanding Wing Layout (Zero Gap, Never Drifting)

## Why
1. User feedback and screenshot show that separate OS windows (`WebviewWindow`) can be dragged apart by the OS mouse, look disjointed, and lack a physical visual connection.
2. In reality, modern pro desktop applications (like Cursor, Arc, Slack, Linear) achieve an "attached side window" by housing it inside a **single transparent Tauri window** that smoothly expands horizontally from 340px to 660px when opened.
3. In this architecture:
   - The left pane is the pure timer/clock window (340px) with its own rounded dark container, header and buttons.
   - The right pane is an attached "wing" companion window (320px) connected by a sleek physical magnetic bridge/docking seam.
   - They **CANNOT be separated or dragged apart** by definition because they share one unified window surface.
   - The timer on the left stays 100% stable at 340px with no squishing or deformation.

## Verification
- Click AI tab: The side window unfolds seamlessly to the right with a visible physical dock joint.
- Dragging the header moves both surfaces simultaneously with zero possibility of drift.
- Closing the AI pane smoothly folds the right wing back, returning the window to compact 340px.
