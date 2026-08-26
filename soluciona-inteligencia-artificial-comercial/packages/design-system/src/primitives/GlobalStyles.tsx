// @soluciona/design-system/src/primitives/GlobalStyles.tsx
// Estilos globales - Reset + CSS Variables + Base styles

'use client';

import { useTheme } from './ThemeProvider';

export function GlobalStyles() {
  const { resolvedTheme } = useTheme();

  // CSS Variables generadas dinámicamente desde tokens
  const cssVariables = {
    // Colors - Primitive (referencias para semánticas)
    '--color-blue-50': '#eff6ff',
    '--color-blue-100': '#dbeafe',
    '--color-blue-200': '#bfdbfe',
    '--color-blue-300': '#93c5fd',
    '--color-blue-400': '#60a5fa',
    '--color-blue-500': '#3b82f6',
    '--color-blue-600': '#2563eb',
    '--color-blue-700': '#1d4ed8',
    '--color-blue-800': '#1e40af',
    '--color-blue-900': '#1e3a8a',
    '--color-blue-950': '#172554',

    '--color-emerald-50': '#ecfdf5',
    '--color-emerald-100': '#d1fae5',
    '--color-emerald-200': '#a7f3d0',
    '--color-emerald-300': '#6ee7b7',
    '--color-emerald-400': '#34d399',
    '--color-emerald-500': '#10b981',
    '--color-emerald-600': '#059669',
    '--color-emerald-700': '#047857',
    '--color-emerald-800': '#065f46',
    '--color-emerald-900': '#064e3b',
    '--color-emerald-950': '#022c22',

    '--color-amber-50': '#fffbeb',
    '--color-amber-100': '#fef3c7',
    '--color-amber-200': '#fde68a',
    '--color-amber-300': '#fcd34d',
    '--color-amber-400': '#fbbf24',
    '--color-amber-500': '#f59e0b',
    '--color-amber-600': '#d97706',
    '--color-amber-700': '#b45309',
    '--color-amber-800': '#92400e',
    '--color-amber-900': '#78350f',
    '--color-amber-950': '#451a03',

    '--color-rose-50': '#fff1f2',
    '--color-rose-100': '#ffe4e6',
    '--color-rose-200': '#fecdd3',
    '--color-rose-300': '#fda4af',
    '--color-rose-400': '#fb7185',
    '--color-rose-500': '#f43f5e',
    '--color-rose-600': '#e11d48',
    '--color-rose-700': '#be123c',
    '--color-rose-800': '#9f1239',
    '--color-rose-900': '#881337',
    '--color-rose-950': '#4c0519',

    '--color-slate-50': '#f8fafc',
    '--color-slate-100': '#f1f5f9',
    '--color-slate-200': '#e2e8f0',
    '--color-slate-300': '#cbd5e1',
    '--color-slate-400': '#94a3b8',
    '--color-slate-500': '#64748b',
    '--color-slate-600': '#475569',
    '--color-slate-700': '#334155',
    '--color-slate-800': '#1e293b',
    '--color-slate-900': '#0f172a',
    '--color-slate-950': '#020617',

    '--color-white': '#ffffff',
    '--color-black': '#000000',

    // Semantic Colors
    '--bg-canvas': 'var(--color-slate-950)',
    '--bg-surface': 'var(--color-slate-900)',
    '--bg-elevated': 'var(--color-slate-800)',
    '--bg-overlay': 'var(--color-slate-950/90)',
    '--bg-input': 'var(--color-slate-800)',
    '--bg-input-hover': 'var(--color-slate-700)',
    '--bg-input-focus': 'var(--color-slate-700)',

    '--border-subtle': 'var(--color-slate-700)',
    '--border-default': 'var(--color-slate-600)',
    '--border-strong': 'var(--color-slate-500)',
    '--border-focus': 'var(--color-blue-500)',
    '--border-error': 'var(--color-rose-500)',
    '--border-success': 'var(--color-emerald-500)',
    '--border-warning': 'var(--color-amber-500)',

    '--text-primary': 'var(--color-slate-50)',
    '--text-secondary': 'var(--color-slate-400)',
    '--text-tertiary': 'var(--color-slate-500)',
    '--text-inverse': 'var(--color-slate-950)',
    '--text-link': 'var(--color-blue-400)',
    '--text-link-hover': 'var(--color-blue-300)',
    '--text-error': 'var(--color-rose-400)',
    '--text-success': 'var(--color-emerald-400)',
    '--text-warning': 'var(--color-amber-400)',

    '--brand-primary': 'var(--color-blue-500)',
    '--brand-primary-hover': 'var(--color-blue-600)',
    '--brand-primary-active': 'var(--color-blue-700)',
    '--brand-primary-subtle': 'var(--color-blue-500/10)',
    '--brand-on-primary': 'var(--color-white)',

    // State colors
    '--state-info-bg': 'var(--color-blue-500/10)',
    '--state-info-border': 'var(--color-blue-500/30)',
    '--state-info-text': 'var(--color-blue-400)',

    '--state-success-bg': 'var(--color-emerald-500/10)',
    '--state-success-border': 'var(--color-emerald-500/30)',
    '--state-success-text': 'var(--color-emerald-400)',

    '--state-warning-bg': 'var(--color-amber-500/10)',
    '--state-warning-border': 'var(--color-amber-500/30)',
    '--state-warning-text': 'var(--color-amber-400)',

    '--state-error-bg': 'var(--color-rose-500/10)',
    '--state-error-border': 'var(--color-rose-500/30)',
    '--state-error-text': 'var(--color-rose-400)',

    // Spacing
    '--space-0': '0',
    '--space-1': '0.25rem',
    '--space-2': '0.375rem',
    '--space-3': '0.5rem',
    '--space-4': '0.75rem',
    '--space-5': '1rem',
    '--space-6': '1.5rem',
    '--space-7': '2rem',
    '--space-8': '3rem',
    '--space-9': '4rem',
    '--space-10': '6rem',

    // Typography
    '--font-sans': 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    '--font-mono': 'JetBrains Mono, Fira Code, Menlo, Monaco, Consolas, monospace',
    '--font-display': 'Inter, system-ui, sans-serif',

    '--text-xs': '0.75rem',
    '--text-sm': '0.875rem',
    '--text-base': '1rem',
    '--text-lg': '1.125rem',
    '--text-xl': '1.25rem',
    '--text-2xl': '1.5rem',
    '--text-3xl': '1.875rem',
    '--text-4xl': '2.25rem',
    '--text-5xl': '3rem',

    '--leading-xs': '1.5',
    '--leading-sm': '1.5',
    '--leading-base': '1.6',
    '--leading-lg': '1.6',
    '--leading-xl': '1.5',
    '--leading-2xl': '1.4',
    '--leading-3xl': '1.3',
    '--leading-4xl': '1.2',

    '--font-normal': '400',
    '--font-medium': '500',
    '--font-semibold': '600',
    '--font-bold': '700',

    // Radii
    '--radius-none': '0',
    '--radius-xs': '0.125rem',
    '--radius-sm': '0.25rem',
    '--radius-md': '0.375rem',
    '--radius-lg': '0.5rem',
    '--radius-xl': '0.75rem',
    '--radius-2xl': '1rem',
    '--radius-full': '9999px',

    // Shadows
    '--shadow-xs': '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    '--shadow-sm': '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
    '--shadow-md': '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    '--shadow-lg': '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    '--shadow-xl': '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
    '--shadow-inner': 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
    '--shadow-focus': '0 0 0 3px var(--color-blue-500/40)',

    // Transitions
    '--duration-instant': '0ms',
    '--duration-fast': '100ms',
    '--duration-normal': '200ms',
    '--duration-slow': '300ms',
    '--duration-slower': '500ms',

    '--easing-linear': 'linear',
    '--easing-easeIn': 'cubic-bezier(0.4, 0, 1, 1)',
    '--easing-easeOut': 'cubic-bezier(0, 0, 0.2, 1)',
    '--easing-easeInOut': 'cubic-bezier(0.4, 0, 0.2, 1)',

    // Z-index
    '--z-hide': '-1',
    '--z-base': '0',
    '--z-dropdown': '100',
    '--z-sticky': '200',
    '--z-overlay': '300',
    '--z-modal': '400',
    '--z-popover': '500',
    '--z-tooltip': '600',
    '--z-toast': '700',

    // Breakpoints
    '--breakpoint-xs': '320px',
    '--breakpoint-sm': '640px',
    '--breakpoint-md': '768px',
    '--breakpoint-lg': '1024px',
    '--breakpoint-xl': '1280px',
    '--breakpoint-2xl': '1536px',
    '--breakpoint-3xl': '1920px'
  };

  const style = Object.entries(cssVariables)
    .map(([key, value]) => `${key}: ${value};`)
    .join(' ');

  return (
    <style
      id="soluciona-design-system-globals"
      dangerouslySetInnerHTML={{
        __html: `
          /* ============================================
             SOLUCIA DESIGN SYSTEM - GLOBAL STYLES
             Generado automáticamente desde tokens
          ============================================ */

          /* ===== CSS VARIABLES ===== */
          :root, [data-theme="dark"] {
            ${style}
          }

          [data-theme="light"] {
            /* Override para modo claro */
            --bg-canvas: var(--color-slate-50);
            --bg-surface: var(--color-white);
            --bg-elevated: var(--color-slate-50);
            --bg-overlay: var(--color-white/90);
            --bg-input: var(--color-white);
            --bg-input-hover: var(--color-slate-100);
            --bg-input-focus: var(--color-slate-100);

            --border-subtle: var(--color-slate-200);
            --border-default: var(--color-slate-300);
            --border-strong: var(--color-slate-400);

            --text-primary: var(--color-slate-950);
            --text-secondary: var(--color-slate-600);
            --text-tertiary: var(--color-slate-400);
            --text-inverse: var(--color-white);

            --bg-canvas: var(--color-slate-50);
            --bg-surface: var(--color-white);
            --bg-elevated: var(--color-slate-50);
            --bg-overlay: var(--color-white/90);
            --bg-input: var(--color-white);
            --bg-input-hover: var(--color-slate-100);
            --bg-input-focus: var(--color-slate-100);
          }

          /* ===== RESET MODERNO ===== */
          *, *::before, *::after {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }

          html {
            font-size: 16px;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
            text-rendering: optimizeLegibility;
            scroll-behavior: smooth;
          }

          @media (prefers-reduced-motion: reduce) {
            html { scroll-behavior: auto; }
          }

          body {
            font-family: var(--font-sans);
            font-size: var(--text-base);
            line-height: var(--leading-base);
            font-weight: var(--font-normal);
            color: var(--text-primary);
            background-color: var(--bg-canvas);
            min-height: 100vh;
          }

          /* ===== TIPOGRAFÍA BASE ===== */
          h1, h2, h3, h4, h5, h6 {
            font-family: var(--font-display);
            font-weight: var(--font-bold);
            line-height: 1.2;
            color: var(--text-primary);
          }

          h1 { font-size: var(--text-5xl); }
          h2 { font-size: var(--text-4xl); }
          h3 { font-size: var(--text-3xl); }
          h4 { font-size: var(--text-2xl); }
          h5 { font-size: var(--text-xl); }
          h6 { font-size: var(--text-lg); }

          p {
            line-height: var(--leading-base);
            color: var(--text-secondary);
          }

          a {
            color: var(--text-link);
            text-decoration: none;
            transition: color var(--duration-fast) var(--easing-easeOut);
          }

          a:hover { color: var(--text-link-hover); }
          a:focus-visible {
            outline: none;
            box-shadow: var(--shadow-focus);
            border-radius: var(--radius-sm);
          }

          /* ===== FORMULARIOS BASE ===== */
          input, textarea, select, button {
            font-family: inherit;
            font-size: inherit;
            line-height: inherit;
            color: inherit;
          }

          input, textarea, select {
            background-color: var(--bg-input);
            border: 1px solid var(--border-default);
            border-radius: var(--radius-md);
            padding: var(--space-3) var(--space-4);
            color: var(--text-primary);
            transition: var(--transition-normal);
          }

          input:hover, textarea:hover, select:hover {
            border-color: var(--border-strong);
            background-color: var(--bg-input-hover);
          }

          input:focus, textarea:focus, select:focus {
            outline: none;
            border-color: var(--border-focus);
            box-shadow: var(--shadow-focus);
            background-color: var(--bg-input-focus);
          }

          input::placeholder, textarea::placeholder {
            color: var(--text-tertiary);
          }

          input:disabled, textarea:disabled, select:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }

          label {
            display: block;
            font-size: var(--text-sm);
            font-weight: var(--font-medium);
            color: var(--text-secondary);
            margin-bottom: var(--space-2);
          }

          /* ===== BOTONES BASE ===== */
          button {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: var(--space-2);
            border: none;
            border-radius: var(--radius-md);
            font-weight: var(--font-semibold);
            cursor: pointer;
            transition: var(--transition-normal);
            white-space: nowrap;
          }

          button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }

          button:focus-visible {
            outline: none;
            box-shadow: var(--shadow-focus);
          }

          /* ===== TABLAS BASE ===== */
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: var(--text-sm);
          }

          th, td {
            padding: var(--space-3) var(--space-4);
            text-align: left;
            border-bottom: 1px solid var(--border-subtle);
          }

          th {
            font-size: var(--text-xs);
            font-weight: var(--font-semibold);
            text-transform: uppercase;
            letter-spacing: 0.04em;
            color: var(--text-tertiary);
            background-color: var(--bg-surface);
          }

          tr:hover td {
            background-color: var(--bg-elevated);
          }

          /* ===== SCROLLBAR PERSONALIZADO ===== */
          ::-webkit-scrollbar {
            width: 8px;
            height: 8px;
          }

          ::-webkit-scrollbar-track {
            background: var(--bg-surface);
          }

          ::-webkit-scrollbar-thumb {
            background: var(--border-default);
            border-radius: var(--radius-full);
          }

          ::-webkit-scrollbar-thumb:hover {
            background: var(--border-strong);
          }

          /* Firefox */
          * { scrollbar-width: thin; scrollbar-color: var(--border-default) var(--bg-surface); }

          /* ===== SELECCIÓN ===== */
          ::selection {
            background-color: var(--brand-primary-subtle);
            color: var(--text-primary);
          }

          /* ===== FOCUS VISIBLE GLOBAL ===== */
          :focus-visible {
            outline: none;
            box-shadow: var(--shadow-focus);
            border-radius: var(--radius-sm);
          }

          /* ===== REDUCED MOTION ===== */
          @media (prefers-reduced-motion: reduce) {
            *, *::before, *::after {
              animation-duration: 0.01ms !important;
              animation-iteration-count: 1 !important;
              transition-duration: 0.01ms !important;
              scroll-behavior: auto !important;
            }
          }

          /* ===== UTILIDADES ===== */
          .sr-only {
            position: absolute;
            width: 1px;
            height: 1px;
            padding: 0;
            margin: -1px;
            overflow: hidden;
            clip: rect(0, 0, 0, 0);
            white-space: nowrap;
            border: 0;
          }

          .skip-link {
            position: absolute;
            top: -100%;
            left: var(--space-4);
            padding: var(--space-3) var(--space-4);
            background: var(--brand-primary);
            color: var(--brand-on-primary);
            border-radius: var(--radius-md);
            z-index: var(--z-toast);
            transition: top var(--duration-fast) var(--easing-easeOut);
          }

          .skip-link:focus {
            top: var(--space-4);
          }

          /* ===== PRINT ===== */
          @media print {
            .no-print { display: none !important; }
            body { background: white; color: black; }
            a { text-decoration: underline; }
          }
        `
      }}
    />
  );
}