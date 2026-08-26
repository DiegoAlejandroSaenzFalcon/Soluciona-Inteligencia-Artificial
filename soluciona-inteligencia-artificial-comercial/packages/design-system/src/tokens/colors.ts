// @soluciona/design-system/src/tokens/colors.ts
// Tokens de color - Primitivas y Semánticas
// NO se usan directamente en componentes, solo vía tokens semánticos

/**
 * Paleta primitiva - Colores base sin significado semántico
 * Basada en escalas Tailwind v4 / Radix UI
 */
export const primitiveColors = {
  // Azul - Marca principal
  blue: {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a',
    950: '#172554'
  },
  // Esmeralda - Éxito
  emerald: {
    50: '#ecfdf5',
    100: '#d1fae5',
    200: '#a7f3d0',
    300: '#6ee7b7',
    400: '#34d399',
    500: '#10b981',
    600: '#059669',
    700: '#047857',
    800: '#065f46',
    900: '#064e3b',
    950: '#022c22'
  },
  // Ámbar - Advertencia
  amber: {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#f59e0b',
    600: '#d97706',
    700: '#b45309',
    800: '#92400e',
    900: '#78350f',
    950: '#451a03'
  },
  // Rosa - Error/Peligro
  rose: {
    50: '#fff1f2',
    100: '#ffe4e6',
    200: '#fecdd3',
    300: '#fda4af',
    400: '#fb7185',
    500: '#f43f5e',
    600: '#e11d48',
    700: '#be123c',
    800: '#9f1239',
    900: '#881337',
    950: '#4c0519'
  },
  // Pizarra - Neutros (fondos, texto, bordes)
  slate: {
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a',
    950: '#020617'
  },
  // Blanco/Negro puros
  white: '#ffffff',
  black: '#000000'
} as const;

/**
 * Tokens semánticos - Lo que usan los componentes
 * Cada token tiene UN propósito claro
 */
export const semanticColors = {
  // Fondos - Jerarquía de elevación
  background: {
    canvas: 'var(--color-slate-950)',           // Fondo principal app
    surface: 'var(--color-slate-900)',          // Cards, paneles
    elevated: 'var(--color-slate-800)',         // Modales, dropdowns
    overlay: 'var(--color-slate-950/90)',       // Overlays, backdrops
    input: 'var(--color-slate-800)',            // Inputs, selects, textareas
    inputHover: 'var(--color-slate-700)',
    inputFocus: 'var(--color-slate-700)'
  },

  // Bordes - Jerarquía de énfasis
  border: {
    subtle: 'var(--color-slate-700)',           // Divisores sutiles, líneas finas
    default: 'var(--color-slate-600)',          // Bordes normales
    strong: 'var(--color-slate-500)',           // Focus, énfasis
    focus: 'var(--color-blue-500)',             // Focus ring
    error: 'var(--color-rose-500)',
    success: 'var(--color-emerald-500)',
    warning: 'var(--color-amber-500)'
  },

  // Texto - Jerarquía de legibilidad
  text: {
    primary: 'var(--color-slate-50)',           // Títulos, contenido principal
    secondary: 'var(--color-slate-400)',        // Descripciones, labels
    tertiary: 'var(--color-slate-500)',         // Placeholders, meta info
    inverse: 'var(--color-slate-950)',          // Sobre fondos de marca
    link: 'var(--color-blue-400)',
    linkHover: 'var(--color-blue-300)',
    error: 'var(--color-rose-400)',
    success: 'var(--color-emerald-400)',
    warning: 'var(--color-amber-400)'
  },

  // Marca - Identidad visual
  brand: {
    primary: 'var(--color-blue-500)',
    primaryHover: 'var(--color-blue-600)',
    primaryActive: 'var(--color-blue-700)',
    primarySubtle: 'var(--color-blue-500/10)',
    onPrimary: 'var(--color-white)'
  },

  // Estados semánticos (NUNCA colores directos)
  state: {
    info: {
      bg: 'var(--color-blue-500/10)',
      border: 'var(--color-blue-500/30)',
      text: 'var(--color-blue-400)',
      icon: 'var(--color-blue-500)'
    },
    success: {
      bg: 'var(--color-emerald-500/10)',
      border: 'var(--color-emerald-500/30)',
      text: 'var(--color-emerald-400)',
      icon: 'var(--color-emerald-500)'
    },
    warning: {
      bg: 'var(--color-amber-500/10)',
      border: 'var(--color-amber-500/30)',
      text: 'var(--color-amber-400)',
      icon: 'var(--color-amber-500)'
    },
    error: {
      bg: 'var(--color-rose-500/10)',
      border: 'var(--color-rose-500/30)',
      text: 'var(--color-rose-400)',
      icon: 'var(--color-rose-500)'
    }
  }
} as const;

// Export combinado para CSS-in-JS si se necesita
export const colors = {
  primitive: primitiveColors,
  semantic: semanticColors
} as const;

export type PrimitiveColors = typeof primitiveColors;
export type SemanticColors = typeof semanticColors;