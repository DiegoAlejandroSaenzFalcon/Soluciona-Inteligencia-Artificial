// @soluciona/design-system/src/atoms/Separator/Separator.tsx
// Separator - Divisor visual accesible

'use client';

import { forwardRef, HTMLAttributes } from 'react';
import { cn } from '@/utils/cn';

interface SeparatorProps extends Omit<HTMLAttributes<HTMLDivElement>, 'role'> {
  /** Orientación */
  orientation?: 'horizontal' | 'vertical';
  /** Variante visual */
  variant?: 'solid' | 'dashed' | 'dotted';
  /** Tamaño/grosor */
  size?: 'thin' | 'medium' | 'thick';
  /** Texto decorativo en el medio */
  label?: string;
  /** Posición del label */
  labelPosition?: 'start' | 'center' | 'end';
  /** Clase adicional */
  className?: string;
}

const sizeStyles = {
  thin: 'border-t',
  medium: 'border-t-2',
  thick: 'border-t-4'
};

const variantStyles = {
  solid: 'border-solid',
  dashed: 'border-dashed',
  dotted: 'border-dotted'
};

export const Separator = forwardRef<HTMLDivElement, SeparatorProps>(
  (
    { orientation = 'horizontal', variant = 'solid', size = 'thin', label, labelPosition = 'center', className, ...props },
    ref
  ) => {
    const isVertical = orientation === 'vertical';

    if (label) {
      return (
        <div ref={ref} className={cn('flex items-center gap-3 w-full', className)} {...props}>
          <div className={cn('flex-1', variantStyles[variant], sizeStyles[size], isVertical ? 'h-full w-0' : 'h-0 w-full')} />
          <span className={cn(
            'px-2 text-xs font-medium text-text-tertiary whitespace-nowrap',
            isVertical && 'rotate-90 origin-center'
          )} aria-hidden="true">
            {label}
          </span>
          <div className={cn('flex-1', variantStyles[variant], sizeStyles[size], isVertical ? 'h-full w-0' : 'h-0 w-full')} />
        </div>
      );
    }

    return (
      <hr
        ref={ref}
        role="separator"
        aria-orientation={orientation}
        className={cn(
          'border-border-default',
          variantStyles[variant],
          sizeStyles[size],
          isVertical ? 'w-0 h-full' : 'w-full h-0',
          className
        )}
        {...props}
      />
    );
  }
);

Separator.displayName = 'Separator';

// Separator con label centrado (para separar secciones con título)
interface SectionSeparatorProps extends HTMLAttributes<HTMLDivElement> {
  /** Texto del separador */
  label: string;
  /** Alineación */
  align?: 'start' | 'center' | 'end';
  /** Tamaño */
  size?: 'thin' | 'medium' | 'thick';
  /** Variante */
  variant?: 'solid' | 'dashed' | 'dotted';
  /** Clase adicional */
  className?: string;
}

export const SectionSeparator = forwardRef<HTMLDivElement, SectionSeparatorProps>(
  ({ label, align = 'center', size = 'thin', variant = 'solid', className, ...props }, ref) => {
    return (
      <div ref={ref} className={cn('flex items-center gap-3 w-full', className)} {...props}>
        <div className={cn('flex-1 border-t border-border-default', size === 'medium' && 'border-t-2', size === 'thick' && 'border-t-4', variant === 'dashed' && 'border-dashed', variant === 'dotted' && 'border-dotted')} />
        <span className={cn(
          'px-3 text-sm font-medium text-text-tertiary whitespace-nowrap',
          'bg-bg-canvas' // Para cubrir la línea detrás del texto
        )} aria-hidden="true">
          {label}
        </span>
        <div className={cn('flex-1 border-t border-border-default', size === 'medium' && 'border-t-2', size === 'thick' && 'border-t-4', variant === 'dashed' && 'border-dashed', variant === 'dotted' && 'border-dotted')} />
      </div>
    );
  }
);

SectionSeparator.displayName = 'SectionSeparator';