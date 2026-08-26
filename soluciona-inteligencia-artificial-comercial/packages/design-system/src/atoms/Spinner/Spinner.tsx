// @soluciona/design-system/src/atoms/Spinner/Spinner.tsx
// Spinner - Indicador de carga accesible

'use client';

import { forwardRef, HTMLAttributes } from 'react';
import { cn } from '@/utils/cn';

interface SpinnerProps extends Omit<HTMLAttributes<HTMLDivElement>, 'color'> {
  /** Tamaño */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  /** Color del spinner */
  color?: 'primary' | 'secondary' | 'white' | 'currentColor';
  /** Etiqueta para screen readers */
  label?: string;
  /** Clase adicional */
  className?: string;
}

const sizeStyles = {
  xs: 'w-3 h-3 border-[2px]',
  sm: 'w-4 h-4 border-[2px]',
  md: 'w-6 h-6 border-[2px]',
  lg: 'w-8 h-8 border-[3px]',
  xl: 'w-12 h-12 border-[4px]'
};

const colorStyles = {
  primary: 'border-brand-primary/20 border-t-brand-primary',
  secondary: 'border-border-default/20 border-t-text-secondary',
  white: 'border-white/20 border-t-white',
  currentColor: 'border-currentColor/20 border-t-currentColor'
};

export const Spinner = forwardRef<HTMLDivElement, SpinnerProps>(
  (
    { size = 'md', color = 'primary', label = 'Cargando…', className, ...props },
    ref
  ) => {
    return (
      <div
        ref={ref}
        role="status"
        aria-live="polite"
        aria-label={label}
        className={cn(
          'inline-block animate-spin rounded-full',
          sizeStyles[size],
          colorStyles[color],
          className
        )}
        {...props}
      >
        <span className="sr-only">{label}</span>
      </div>
    );
  }
);

Spinner.displayName = 'Spinner';

/**
 * Spinner overlay para cubrir contenido completo
 */
interface SpinnerOverlayProps extends HTMLAttributes<HTMLDivElement> {
  /** Tamaño del spinner interno */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  /** Color del spinner */
  color?: 'primary' | 'secondary' | 'white' | 'currentColor';
  /** Etiqueta para screen readers */
  label?: string;
  /** Si está visible */
  isOpen?: boolean;
}

export const SpinnerOverlay = forwardRef<HTMLDivElement, SpinnerOverlayProps>(
  (
    { size = 'md', color = 'primary', label = 'Cargando…', isOpen = true, className, children, ...props },
    ref
  ) => {
    if (!isOpen) return null;

    return (
      <div
        ref={ref}
        className={cn(
          'fixed inset-0 z-[var(--z-toast)] flex items-center justify-center',
          'bg-black/50 backdrop-blur-sm',
          className
        )}
        {...props}
      >
        <div className="bg-bg-elevated rounded-xl p-6 shadow-xl flex flex-col items-center gap-4 min-w-[200px]">
          <Spinner size={size} color="primary" label={label} />
          {children && <p className="text-text-secondary text-sm text-center">{children}</p>}
        </div>
      </div>
    );
  }
);

SpinnerOverlay.displayName = 'SpinnerOverlay';