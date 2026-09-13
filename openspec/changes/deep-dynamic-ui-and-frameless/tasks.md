# Tasks: Deep Generative UI and Zero-Margin Frameless Window

- [ ] Grant complete window manipulation permissions in `src-tauri/capabilities/default.json` <!-- id: 0 -->
- [ ] Eliminate outer padding, green border, and margin in `src/App.tsx` and `src/index.css` <!-- id: 1 -->
- [ ] Connect robust window minimize, close/hide, and resize actions in `src/services/window.ts` and `src/components/TitleBar.tsx` <!-- id: 2 -->
- [ ] Implement Deep Dynamic UI schema (DSL) with component visibility, dial scale, button styles in `src/types/dynamicUi.ts` <!-- id: 3 -->
- [ ] Upgrade AI generative engine in `src/services/aiDynamicUi.ts` to parse component layouts and styling <!-- id: 4 -->
- [ ] Adapt `Timer.tsx` and `RadialDial.tsx` to render dynamically based on layout config <!-- id: 5 -->
- [ ] Verify with `bun run build` and `cargo check` <!-- id: 6 -->
- [ ] Test in live runtime <!-- id: 7 -->
