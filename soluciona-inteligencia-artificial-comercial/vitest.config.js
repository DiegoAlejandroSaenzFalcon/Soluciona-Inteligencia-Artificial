import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['tests/**/*.test.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'tests/', '*.config.js', '*.config.ts', 'dashboard.html']
    },
    testTimeout: 10000,
    hookTimeout: 10000,
    teardownTimeout: 5000,
    setupFiles: ['./tests/setup.js'],
    // Disable Vite's module resolution for node:sqlite
    resolveSnapshot: false
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@core': path.resolve(__dirname, 'core'),
      '@config': path.resolve(__dirname, 'config')
    }
  },
  // Externalize node:sqlite to prevent Vite from trying to transform it
  optimizeDeps: {
    exclude: ['node:sqlite']
  },
  ssr: {
    external: ['node:sqlite']
  }
});