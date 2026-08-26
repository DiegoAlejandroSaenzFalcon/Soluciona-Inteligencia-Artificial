// @soluciona/design-system/src/atoms/Label/Label.tsx
// Label - Etiqueta accesible para formularios

'use client';

import { LabelHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/utils/cn';

interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
  /** Texto de la etiqueta */
  children: React.ReactNode;
  /** Indica si el campo es requerido */
  required?: boolean;
  /** Tamaño del texto */
  size?: 'sm' | 'md' | 'lg';
  /** Clase adicional */
  className?: string;
}

const sizeStyles = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base'
};

export const Label = forwardRef<HTMLLabelElement, LabelProps>(
  ({ children, required, size = 'md', className, ...props }, ref) => {
    return (
      <label
        ref={ref}
        className={cn(
          'block font-medium text-text-secondary',
          sizeStyles[size],
          className
        )}
        {...props}
      >
        {children}
        {required && (
          <span className="text-text-error ml-1" aria-hidden="true">
            *
          </span>
        )}
      </label>
    );
  }
);

Label.displayName = 'Label';