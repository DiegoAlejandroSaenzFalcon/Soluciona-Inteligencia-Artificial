// @soluciona/vitest-config/react.js
// Configuración Vitest para React

import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { baseConfig } from './base.js';

export const reactConfig = defineConfig({
  ...baseConfig,
  plugins: [react()],
  test: {
    ...baseConfig.test,
    environment: 'happy-dom',
    include: ['**/*.test.{ts,tsx}'],
    setupFiles: ['./vitest.setup.ts'],
    css: true
  }
});

export default reactConfig;