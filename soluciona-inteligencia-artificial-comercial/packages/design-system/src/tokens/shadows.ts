// @soluciona/design-system/src/tokens/shadows.ts
// Tokens de sombras - Elevación con propósito

/**
 * Sombras basadas en Material Design 3 / Radix UI
 * Cada nivel comunica elevación y foco
 */
export const shadows = {
  xs: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  sm: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.15)',
  inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
  focus: '0 0 0 3px var(--color-blue-500/40)',
  focusError: '0 0 0 3px var(--color-rose-500/40)',
  focusSuccess: '0 0 0 3px var(--color-emerald-500/40)'
} as const;

/**
 * Sombras semánticas para uso directo
 */
export const semanticShadows = {
  card: 'var(--shadow-sm)',
  cardHover: 'var(--shadow-md)',
  cardActive: 'var(--shadow-lg)',
  dropdown: 'var(--shadow-lg)',
  modal: 'var(--shadow-xl)',
  modalOverlay: '0 25px 50px -12px rgb(0 0 0 / 0.25)',
  tooltip: 'var(--shadow-md)',
  toast: 'var(--shadow-lg)',
  floating: 'var(--shadow-xl)',
  focusRing: 'var(--shadow-focus)'
} as const;

export type Shadows = typeof shadows;
export type SemanticShadows = typeof semanticShadows;