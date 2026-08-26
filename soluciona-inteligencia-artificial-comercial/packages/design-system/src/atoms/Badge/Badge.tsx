// @soluciona/design-system/src/atoms/Badge/Badge.tsx
// Badge - Etiqueta de estado, categoría o contador

'use client';

import { forwardRef, HTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/utils/cn';

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 font-medium transition-colors duration-100',
  {
    variants: {
      variant: {
        default: 'bg-brand-primary/10 text-brand-primary border border-brand-primary/20',
        primary: 'bg-brand-primary text-brand-on-primary',
        secondary: 'bg-bg-elevated text-text-primary border border-border-default',
        success: 'bg-state-success-bg text-state-success-text border border-state-success-border',
        warning: 'bg-state-warning-bg text-state-warning-text border border-state-warning-border',
        danger: 'bg-state-error-bg text-state-error-text border border-state-error-border',
        info: 'bg-state-info-bg text-state-info-text border border-state-info-border',
        outline: 'bg-transparent text-text-primary border border-border-default'
      },
      size: {
        xs: 'px-1.5 py-0.5 text-xs gap-1',
        sm: 'px-2 py-0.5 text-xs gap-1',
        md: 'px-2.5 py-1 text-sm gap-1.5',
        lg: 'px-3 py-1 text-base gap-2'
      },
      rounded: {
        none: 'rounded-none',
        sm: 'rounded-sm',
        md: 'rounded-md',
        lg: 'rounded-lg',
        full: 'rounded-full'
      }
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
      rounded: 'full'
    }
  }
);

export interface BadgeProps
  extends Omit<HTMLAttributes<HTMLSpanElement>, 'color'>,
    VariantProps<typeof badgeVariants> {
  /** Contenido del badge */
  children: React.ReactNode;
  /** Variante semántica */
  variant?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info' | 'outline';
  /** Tamaño */
  size?: 'xs' | 'sm' | 'md' | 'lg';
  /** Redondeo */
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'full';
  /** Punto indicador (para estados online/offline, etc.) */
  dot?: boolean;
  /** Color personalizado del punto */
  dotColor?: string;
}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  (
    {
      children,
      variant = 'default',
      size = 'md',
      rounded = 'full',
      dot,
      dotColor,
      className,
      ...props
    },
    ref
  ) => {
    return (
      <span
        ref={ref}
        className={cn(badgeVariants({ variant, size, rounded }), className)}
        {...props}
      >
        {dot && (
          <span
            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: dotColor || 'currentColor' }}
            aria-hidden="true"
          />
        )}
        {children}
      </span>
    );
  }
);

Badge.displayName = 'Badge';