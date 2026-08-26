// @soluciona/design-system/src/tokens/z-index.ts
// Tokens de z-index - Capas ordenadas y predecibles

/**
 * Capas de apilamiento - Cada nivel tiene propósito específico
 * Valores espaciados para permitir inserción intermedia
 */
export const zIndex = {
  hide: -1,
  base: 0,
  dropdown: 100,       // Dropdown menus, select options
  sticky: 200,         // Sticky headers, table headers
  overlay: 300,        // Modal overlays, drawer backdrops
  modal: 400,          // Modal content, dialogs
  popover: 500,        // Popovers, tooltips with portal
  tooltip: 600,        // Tooltips (sobre popovers)
  toast: 700,          // Toasts, notifications (siempre visibles)
  max: 9999            // Solo para casos extremos
} as const;

/**
 * Z-index semánticos
 */
export const semanticZIndex = {
  header: 'var(--z-sticky)',
  sidebar: 'var(--z-sticky)',
  modalBackdrop: 'var(--z-overlay)',
  modal: 'var(--z-modal)',
  popover: 'var(--z-popover)',
  tooltip: 'var(--z-tooltip)',
  dropdown: 'var(--z-dropdown)',
  toast: 'var(--z-toast)',
  commandPalette: 'var(--z-toast)'  // Sobre todo
} as const;

export type ZIndex = typeof zIndex;
export type SemanticZIndex = typeof semanticZIndex;