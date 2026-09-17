import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    // Component tests need a DOM; the service suites are environment-agnostic
    // (they install their own localStorage) and run unchanged under jsdom.
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text-summary'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.{test,spec}.{ts,tsx}', 'src/test/**', 'src/vite-env.d.ts'],
      // Floors sit just under today's numbers so the check is a ratchet against
      // regressions rather than an aspiration nobody meets. Both P0 defects this
      // project shipped lived in the untested lifecycle of a component, which is
      // the gap these thresholds exist to stop widening.
      thresholds: {
        statements: 53,
        branches: 50,
        functions: 50,
        lines: 54,
      },
    },
  },
});
