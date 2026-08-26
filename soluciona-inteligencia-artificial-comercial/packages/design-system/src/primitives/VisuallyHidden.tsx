// @soluciona/design-system/src/primitives/VisuallyHidden.tsx
// Componente para contenido solo accesible a lectores de pantalla

'use client';

import { HTMLAttributes, forwardRef } from 'react';

interface VisuallyHiddenProps extends HTMLAttributes<HTMLElement> {
  /** Contenido a ocultar visualmente */
  children: React.ReactNode;
}

/**
 * VisuallyHidden - Oculta contenido visualmente pero accesible para screen readers
 * 
 * @description
 * Usar para labels de inputs sin label visible, instrucciones de acceso,
 * estados de carga, etc.
 * 
 * @example
 * ```tsx
 * <input aria-label="Buscar" />
 * <VisuallyHidden>Resultados de búsqueda</VisuallyHidden>
 * ```
 */
export const VisuallyHidden = forwardRef<HTMLElement, VisuallyHiddenProps>(
  ({ children, style, ...props }, ref) => (
    <span
      ref={ref}
      style={{
        position: 'absolute',
        width: '1px',
        height: '1px',
        padding: 0,
        margin: '-1px',
        overflow: 'hidden',
        clip: 'rect(0, 0, 0, 0)',
        whiteSpace: 'nowrap',
        border: 0,
        ...style
      }}
      {...props}
    >
      {children}
    </span>
  )
);

VisuallyHidden.displayName = 'VisuallyHidden';