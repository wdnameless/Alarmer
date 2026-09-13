# Change: True Narrow-Window Responsiveness

## Why
On narrow window widths (~220-300px), navigation text labels overflow ("На...") and the sub-mode bar wraps awkwardly.

## What Changes
- Navigation tabs switch to compact icon-only badges when space is tight (`w < 340px`) or hide text on small widths.
- Sub-mode buttons (`Таймер`, `Тренировка`, `Секундомер`, `Будильники`) become compact scroll-free icon/short chips.
- RadialDial auto-scales its diameter based on available container dimensions without clipping.

## Verification
- `bun run build`.
- Live test window down to 220px width.
