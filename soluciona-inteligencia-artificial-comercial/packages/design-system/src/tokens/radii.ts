// @soluciona/design-system/src/tokens/radii.ts
// Tokens de radio de borde - Consistencia geométrica

/**
 * Radios base - Sistema de 4px (0.25rem)
 */
export const radii = {
  none: '0',
  xs: '0.125rem',   // 2px - micro elements
  sm: '0.25rem',    // 4px - badges, pills, small buttons
  md: '0.375rem',   // 6px - inputs, buttons, selects
  lg: '0.5rem',     // 8px - cards, modals, dropdowns
  xl: '0.75rem',    // 12px - panels, sheets
  '2xl': '1rem',    // 16px - large sheets, drawers
  full: '9999px'    // pills, avatars, circular
} as const;

/**
 * Radios semánticos
 */
export const semanticRadii = {
  badge: 'var(--radius-full)',
  button: 'var(--radius-md)',
  buttonSm: 'var(--radius-sm)',
  buttonLg: 'var(--radius-lg)',
  input: 'var(--radius-md)',
  select: 'var(--radius-md)',
  card: 'var(--radius-lg)',
  cardSm: 'var(--radius-md)',
  modal: 'var(--radius-xl)',
  modalSm: 'var(--radius-lg)',
  popover: 'var(--radius-lg)',
  tooltip: 'var(--radius-md)',
  avatar: 'var(--radius-full)',
  tag: 'var(--radius-sm)'
} as const;

export type Radii = typeof radii;
export type SemanticRadii = typeof semanticRadii;