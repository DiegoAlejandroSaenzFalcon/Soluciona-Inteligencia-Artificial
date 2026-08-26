// @soluciona/vitest-config/vitest.setup.node.ts
// Setup global para tests Node.js

import { vi } from 'vitest';

// Extender matchers personalizados
import '@vitest/globals';

// Mock de timers
vi.useFakeTimers();

// Configuración global de timeouts
vi.setConfig({
  testTimeout: 30000,
  hookTimeout: 10000
});

// Limpieza automática después de cada test
afterEach(() => {
  vi.clearAllMocks();
  vi.clearAllTimers();
});