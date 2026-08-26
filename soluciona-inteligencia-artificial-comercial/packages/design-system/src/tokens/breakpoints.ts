// @soluciona/design-system/src/tokens/breakpoints.ts
// Tokens de breakpoints - Mobile-first

/**
 * Breakpoints estándar - Mobile-first approach
 * Basados en tamaños de dispositivo reales
 */
export const breakpoints = {
  xs: '320px',   // Móviles muy pequeños
  sm: '640px',   // Móviles grandes / tablets pequeños (portrait)
  md: '768px',   // Tablets (landscape) / laptops pequeños
  lg: '1024px',  // Laptops / desktop pequeño
  xl: '1280px',  // Desktop estándar
  '2xl': '1536px', // Desktop grande / ultrawide
  '3xl': '1920px'  // Full HD+
} as const;

/**
 * Breakpoints semánticos para uso en componentes
 */
export const semanticBreakpoints = {
  mobile: 'var(--breakpoint-xs)',
  tablet: 'var(--breakpoint-md)',
  desktop: 'var(--breakpoint-lg)',
  wide: 'var(--breakpoint-xl)',
  ultraWide: 'var(--breakpoint-2xl)',

  // Container max-widths
  container: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px'
  },

  // Sidebar breakpoints
  sidebar: {
    collapsed: '768px',   // md - sidebar colapsa a iconos
    hidden: '640px'       // sm - sidebar se oculta (drawer)
  }
} as const;

/**
 * Media queries como strings para uso en JS/TS
 */
export const mediaQueries = {
  xs: `(min-width: ${breakpoints.xs})`,
  sm: `(min-width: ${breakpoints.sm})`,
  md: `(min-width: ${breakpoints.md})`,
  lg: `(min-width: ${breakpoints.lg})`,
  xl: `(min-width: ${breakpoints.xl})`,
  '2xl': `(min-width: ${breakpoints['2xl']})`,
  '3xl': `(min-width: ${breakpoints['3xl']})`,

  // Mobile-first (max-width)
  mobileOnly: `(max-width: ${parseInt(breakpoints.sm) - 1}px)`,
  tabletOnly: `(min-width: ${breakpoints.sm}) and (max-width: ${parseInt(breakpoints.lg) - 1}px)`,
  desktopUp: `(min-width: ${breakpoints.lg})`,

  // Orientación
  portrait: '(orientation: portrait)',
  landscape: '(orientation: landscape)',

  // Hover capability
  hover: '(hover: hover)',
  noHover: '(hover: none)',

  // Reduced motion
  reducedMotion: '(prefers-reduced-motion: reduce)',
  noReducedMotion: '(prefers-reduced-motion: no-preference)',

  // Color scheme
  dark: '(prefers-color-scheme: dark)',
  light: '(prefers-color-scheme: light)'
} as const;

export type Breakpoints = typeof breakpoints;
export type SemanticBreakpoints = typeof semanticBreakpoints;
export type MediaQueries = typeof mediaQueries;