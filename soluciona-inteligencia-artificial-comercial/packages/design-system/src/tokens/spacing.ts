// @soluciona/design-system/src/tokens/spacing.ts
// Tokens de espaciado - Sistema armónico basado en ratio 1.5 (8px base)

/**
 * Espaciado base: 8px = 0.5rem
 * Ratio: 1.5x entre niveles para ritmo visual armónico
 */
export const spacing = {
  // Aliases semánticos para uso directo
  none: '0',
  xs: '0.25rem',    // 4px  - micro spacing, badges, icon gaps
  sm: '0.375rem',   // 6px  - tight spacing, form field gaps
  md: '0.5rem',     // 8px  - BASE - padding inputs, card gaps
  lg: '0.75rem',    // 12px - comfortable spacing, section gaps
  xl: '1rem',       // 16px - standard spacing, card padding
  '2xl': '1.5rem',  // 24px - large spacing, component gaps
  '3xl': '2rem',    // 32px - section spacing, page margins
  '4xl': '3rem',    // 48px - large section spacing
  '5xl': '4rem',    // 64px - hero spacing
  '6xl': '6rem'     // 96px - massive spacing
} as const;

/**
 * Espaciado semántico para casos de uso específicos
 */
export const semanticSpacing = {
  // Layout
  pagePadding: '1.5rem',      // xl - Padding horizontal páginas
  pagePaddingMobile: '1rem',  // lg - Padding móvil
  sectionGap: '2rem',         // 2xl - Gap entre secciones
  componentGap: '1rem',       // xl - Gap entre componentes
  cardPadding: '1rem',        // xl - Padding interno cards
  cardPaddingSm: '0.75rem',   // lg - Padding cards compactos

  // Formularios
  fieldGap: '0.5rem',         // md - Gap label-input
  fieldGroupGap: '1rem',      // xl - Gap entre campos
  formSectionGap: '1.5rem',   // 2xl - Gap secciones formulario

  // Navegación
  navItemGap: '0.125rem',     // 2px - Gap items nav
  navGroupGap: '0.75rem',     // lg - Gap grupos nav

  // Tablas
  cellPadding: '0.5rem 0.75rem', // md lg - Padding celdas
  rowGap: '0',                // Sin gap rows

  // Modales/Overlays
  modalPadding: '1.5rem',     // 2xl - Padding modal
  drawerPadding: '1rem',      // xl - Padding drawer
  toastGap: '0.5rem'          // md - Gap toasts
} as const;

export type Spacing = typeof spacing;
export type SemanticSpacing = typeof semanticSpacing;