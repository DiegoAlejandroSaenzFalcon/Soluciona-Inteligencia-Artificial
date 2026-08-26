// @soluciona/design-system/src/tokens/typography.ts
// Tokens de tipografía - Inter + JetBrains Mono

/**
 * Familias tipográficas
 * Inter: UI general, legible en tamaños pequeños
 * JetBrains Mono: Código, números tabulares, datos técnicos
 * Cal Sans (opcional): Display headlines grandes
 */
export const fontFamily = {
  sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
  mono: ['JetBrains Mono', 'Fira Code', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
  display: ['Inter', 'system-ui', 'sans-serif'] // Cal Sans si se añade
} as const;

/**
 * Tamaños tipográficos con line-height integrado
 * Escala modular: 1.25 ratio (Major Third)
 */
export const fontSize = {
  xs: ['0.75rem', { lineHeight: '1.5' }],      // 12px - labels, captions, badges
  sm: ['0.875rem', { lineHeight: '1.5' }],     // 14px - body small, inputs
  base: ['1rem', { lineHeight: '1.6' }],       // 16px - BASE body text
  lg: ['1.125rem', { lineHeight: '1.6' }],     // 18px - body large, lead
  xl: ['1.25rem', { lineHeight: '1.5' }],      // 20px - h5, subheadings
  '2xl': ['1.5rem', { lineHeight: '1.4' }],    // 24px - h4
  '3xl': ['1.875rem', { lineHeight: '1.3' }],  // 30px - h3
  '4xl': ['2.25rem', { lineHeight: '1.2' }],   // 36px - h2
  '5xl': ['3rem', { lineHeight: '1.1' }],      // 48px - h1
  '6xl': ['3.75rem', { lineHeight: '1' }]      // 60px - display
} as const;

/**
 * Pesos tipográficos
 */
export const fontWeight = {
  normal: '400',
  medium: '500',
  semibold: '600',
  bold: '700'
} as const;

/**
 * Tracking (letter-spacing)
 */
export const letterSpacing = {
  tighter: '-0.05em',
  tight: '-0.025em',
  normal: '0',
  wide: '0.025em',
  wider: '0.05em',
  widest: '0.1em'
} as const;

/**
 * Tokens semánticos de tipografía para uso directo
 */
export const semanticTypography = {
  // Headings
  heading1: { fontSize: '3rem', lineHeight: '1.1', fontWeight: '700', letterSpacing: '-0.025em' },      // 48px
  heading2: { fontSize: '2.25rem', lineHeight: '1.2', fontWeight: '700', letterSpacing: '-0.025em' },  // 36px
  heading3: { fontSize: '1.875rem', lineHeight: '1.3', fontWeight: '600', letterSpacing: '0' },         // 30px
  heading4: { fontSize: '1.5rem', lineHeight: '1.4', fontWeight: '600', letterSpacing: '0' },           // 24px
  heading5: { fontSize: '1.25rem', lineHeight: '1.5', fontWeight: '600', letterSpacing: '0' },          // 20px
  heading6: { fontSize: '1rem', lineHeight: '1.6', fontWeight: '600', letterSpacing: '0' },             // 16px

  // Body
  bodyLarge: { fontSize: '1.125rem', lineHeight: '1.6', fontWeight: '400' },   // 18px
  body: { fontSize: '1rem', lineHeight: '1.6', fontWeight: '400' },             // 16px
  bodySmall: { fontSize: '0.875rem', lineHeight: '1.5', fontWeight: '400' },    // 14px

  // UI
  label: { fontSize: '0.875rem', lineHeight: '1.5', fontWeight: '500' },        // 14px
  caption: { fontSize: '0.75rem', lineHeight: '1.5', fontWeight: '400' },       // 12px
  overline: { fontSize: '0.75rem', lineHeight: '1.5', fontWeight: '600', letterSpacing: '0.1em', textTransform: 'uppercase' },

  // Datos técnicos / Código
  code: { fontSize: '0.875rem', lineHeight: '1.6', fontFamily: 'mono' },
  codeSmall: { fontSize: '0.75rem', lineHeight: '1.5', fontFamily: 'mono' },
  numbers: { fontSize: 'inherit', lineHeight: 'inherit', fontFamily: 'mono', fontVariantNumeric: 'tabular-nums' }
} as const;

export type FontSize = typeof fontSize;
export type FontWeight = typeof fontWeight;
export type SemanticTypography = typeof semanticTypography;