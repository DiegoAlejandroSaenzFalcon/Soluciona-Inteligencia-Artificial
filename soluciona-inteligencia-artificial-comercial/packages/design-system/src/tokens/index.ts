// @soluciona/design-system/src/tokens/index.ts
// Barrel export - Todos los tokens de diseño

export * from './colors';
export * from './spacing';
export * from './typography';
export * from './shadows';
export * from './radii';
export * from './transitions';
export * from './z-index';
export * from './breakpoints';

// Token completo para CSS-in-JS o theme providers
import { colors } from './colors';
import { spacing } from './spacing';
import { typography } from './typography';
import { shadows } from './shadows';
import { radii } from './radii';
import { transitions } from './transitions';
import { zIndex } from './z-index';
import { breakpoints } from './breakpoints';

export const tokens = {
  colors,
  spacing,
  typography,
  shadows,
  radii,
  transitions,
  zIndex,
  breakpoints
} as const;

export type Tokens = typeof tokens;