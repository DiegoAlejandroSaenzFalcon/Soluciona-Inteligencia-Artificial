// @soluciona/eslint-config/react.js
// Configuración para React/Next.js

import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import jsxA11yPlugin from 'eslint-plugin-jsx-a11y';
import tailwindPlugin from 'eslint-plugin-tailwindcss';
import { baseConfig } from './base.js';

export default [
  ...baseConfig,
  {
    settings: {
      react: { version: '19.0' }
    }
  },
  reactPlugin.configs.recommended,
  reactPlugin.configs['jsx-runtime'],
  {
    plugins: {
      'react-hooks': reactHooksPlugin,
      'jsx-a11y': jsxA11yPlugin,
      tailwindcss: tailwindPlugin
    },
    rules: {
      ...reactHooksPlugin.configs.recommended.rules,
      ...jsxA11yPlugin.configs.recommended.rules,
      'react/self-closing-comp': 'error',
      'react/no-unstable-nested-components': 'warn',
      'react/require-hooks-at-top-level': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'jsx-a11y/anchor-is-valid': 'warn',
      'jsx-a11y/click-events-have-key-events': 'warn',
      'jsx-a11y/no-noninteractive-element-interactions': 'warn',
      'tailwindcss/no-custom-classname': 'warn',
      'tailwindcss/enforces-shorthand': 'warn'
    }
  }
];