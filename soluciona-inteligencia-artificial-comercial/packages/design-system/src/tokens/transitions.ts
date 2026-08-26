// @soluciona/design-system/src/tokens/transitions.ts
// Tokens de transición - Movimiento con significado

/**
 * Duraciones y easings estandarizados
 * Respetan prefers-reduced-motion SIEMPRE
 */
export const transitions = {
  // Duraciones
  duration: {
    instant: '0ms',
    fast: '100ms',      // hover, focus, tap feedback
    normal: '200ms',    // toggles, expand/collapse, simple animations
    slow: '300ms',      // modals, sheets, complex transitions
    slower: '500ms'     // page transitions, complex sequences
  },

  // Easings - Material Design easing
  easing: {
    linear: 'linear',
    easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
    easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
    easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',  // Material standard
    easeOutBack: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
    easeInBack: 'cubic-bezier(0.6, -0.28, 0.735, 0.045)',
    spring: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)'
  }
} as const;

/**
 * Transiciones compuestas para uso directo
 * Cada una tiene PROPÓSITO específico
 */
export const semanticTransitions = {
  // Micro-interacciones
  micro: 'color var(--duration-fast) var(--easing-easeOut), background-color var(--duration-fast) var(--easing-easeOut), border-color var(--duration-fast) var(--easing-easeOut)',
  microTransform: 'transform var(--duration-fast) var(--easing-easeOut)',

  // Botones
  button: 'background-color var(--duration-fast) var(--easing-easeOut), border-color var(--duration-fast) var(--easing-easeOut), color var(--duration-fast) var(--easing-easeOut), box-shadow var(--duration-fast) var(--easing-easeOut), transform var(--duration-fast) var(--easing-easeOut)',
  buttonActive: 'transform var(--duration-instant) var(--easing-easeOut)',

  // Inputs
  input: 'border-color var(--duration-fast) var(--easing-easeOut), box-shadow var(--duration-fast) var(--easing-easeOut), background-color var(--duration-fast) var(--easing-easeOut)',
  inputFocus: 'border-color var(--duration-fast) var(--easing-easeOut), box-shadow var(--duration-fast) var(--easing-easeOut)',

  // Cards
  card: 'box-shadow var(--duration-normal) var(--easing-easeOut), border-color var(--duration-normal) var(--easing-easeOut), transform var(--duration-normal) var(--easing-easeOut)',

  // Modales/Overlays
  modalEnter: 'opacity var(--duration-normal) var(--easing-easeOut), transform var(--duration-normal) var(--easing-easeOut)',
  modalExit: 'opacity var(--duration-fast) var(--easing-easeIn), transform var(--duration-fast) var(--easing-easeIn)',
  overlayEnter: 'opacity var(--duration-normal) var(--easing-easeOut)',
  overlayExit: 'opacity var(--duration-fast) var(--easing-easeIn)',

  // Dropdowns/Popovers
  dropdownEnter: 'opacity var(--duration-fast) var(--easing-easeOut), transform var(--duration-fast) var(--easing-easeOut)',
  dropdownExit: 'opacity var(--duration-fast) var(--easing-easeIn), transform var(--duration-fast) var(--easing-easeIn)',

  // Toasts
  toastEnter: 'opacity var(--duration-normal) var(--easing-easeOut), transform var(--duration-normal) var(--easing-easeOut)',
  toastExit: 'opacity var(--duration-fast) var(--easing-easeIn), transform var(--duration-fast) var(--easing-easeIn)',

  // Tabs/Panels
  tabSwitch: 'opacity var(--duration-fast) var(--easing-easeOut), transform var(--duration-fast) var(--easing-easeOut)',

  // Sidebar/Navigation
  sidebar: 'width var(--duration-normal) var(--easing-easeInOut), transform var(--duration-normal) var(--easing-easeInOut)',
  navItem: 'background-color var(--duration-fast) var(--easing-easeOut), color var(--duration-fast) var(--easing-easeOut)',

  // Tablas/Data
  rowHover: 'background-color var(--duration-fast) var(--easing-easeOut)',
  sortTransition: 'opacity var(--duration-fast) var(--easing-easeOut)',

  // Loading/Skeleton
  skeletonPulse: 'opacity var(--duration-slow) var(--easing-easeInOut) infinite alternate'
} as const;

/**
 * CSS para prefers-reduced-motion
 * DEBE incluirse en GlobalStyles
 */
export const reducedMotionCSS = `
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
`;

export type Transitions = typeof transitions;
export type SemanticTransitions = typeof semanticTransitions;