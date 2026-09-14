# Change: Hand-Drawn Custom Icons, Upright Side Button & Dedicated Expanding Split Sidebar

## Why
1. The AI button on the right edge was visually inverted (`-rotate-90`). It needs a clean, upright orientation.
2. Replace stock AI icons (`Sparkles`, standard Lucide icons) with custom minimalist hand-drawn / bespoke geometric SVG vectors (hand-drawn organic hourglass, hand-drawn spark/ink star, hand-drawn dial clock, hand-drawn gears).
3. When clicking the AI trigger button, the main window must NOT be obscured or replaced. Instead, the right sidebar should genuinely expand horizontally side-by-side (flex row split layout) so the user can see the timer dial on the left while talking to the AI sidebar on the right.

## Verification
- AI trigger button text is upright and properly readable.
- Icons across the app are unique, hand-crafted minimalist SVGs.
- Clicking the AI button expands a genuine side-by-side right sidebar (`w-[320px]`) smoothly next to the timer, without switching tabs or covering the timer.
