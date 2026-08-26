// @soluciona/vitest-config/node.js
// Configuración Vitest para Node.js (Backend)

import { defineConfig } from 'vitest/config';
import { baseConfig } from './base.js';

export const nodeConfig = defineConfig({
  ...baseConfig,
  test: {
    ...baseConfig.test,
    environment: 'node',
    include: ['**/*.test.{ts,tsx}'],
    setupFiles: ['./vitest.setup.node.ts']
  }
});

export default nodeConfig;