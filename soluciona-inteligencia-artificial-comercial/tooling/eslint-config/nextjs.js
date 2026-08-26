// @soluciona/eslint-config/nextjs.js
// Configuración para Next.js 15 App Router

import nextPlugin from '@next/eslint-plugin-next';
import { reactConfig } from './react.js';

export default [
  ...reactConfig,
  {
    plugins: { '@next/next': nextPlugin },
    rules: {
      '@next/next/no-html-link-for-pages': 'error',
      '@next/next/no-img-element': 'error',
      '@next/next/no-page-custom-font': 'warn',
      '@next/next/no-script-component-in-head': 'error',
      '@next/next/no-sync-scripts': 'error'
    }
  }
];