import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { reactConfig } from '@soluciona/vitest-config/react.js';

export default defineConfig({
  ...reactConfig,
  plugins: [react()],
  test: {
    ...reactConfig.test,
    setupFiles: ['./vitest.setup.ts']
  }
});