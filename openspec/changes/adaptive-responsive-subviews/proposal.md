# Change: Full Responsiveness & Auto-Fitting for Alarms, Settings & Dashboard Views

## Why
On user screenshot, in the Alarms sub-tab, buttons and inputs are overflowing off the right edge ("БУДИЛЬНИКИ И НАПОМИНАНИЯ", "08:00 AM", "Утренняя разминка", "+"). Fixed-width or flex-row elements with rigid margins caused content to clip when the window width is constrained. Everything must adaptively wrap, flex, and fit within the container.

## Verification
- Review and fix `src/components/Alarms.tsx` layout classes (use `w-full max-w-[320px]`, `flex-wrap`, proper inputs grid).
- Ensure `src/components/DashboardView.tsx` wraps and scrolls cleanly.
- `bun run build`.
