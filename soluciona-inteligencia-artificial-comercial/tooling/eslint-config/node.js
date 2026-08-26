// @soluciona/eslint-config/node.js
// Configuración para paquetes Node.js (Backend, CLI, Scripts)

import { baseConfig } from './base.js';
import globals from 'globals';

export default [
  ...baseConfig,
  {
    languageOptions: {
      globals: {
        ...globals.es2024,
        ...globals.node
      }
    },
    rules: {
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/require-await': 'error',
      'no-console': ['warn', { allow: ['warn', 'error', 'info'] }]
    }
  }
];