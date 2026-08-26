// @soluciona/design-system/src/atoms/Button/Button.tsx
// Button - Componente de acción primario/secundario/terciario

'use client';

import { forwardRef, ButtonHTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/utils/cn';
import { Loader2 } from 'lucide-react';

/**
 * Variantes semánticas usando CVA
 * Cada variante comunica INTENCIÓN, no apariencia
 */
const buttonVariants = cva(
  [
    'inline-flex items-center justify-center gap-2',
    'font-semibold transition-all duration-100 ease-out',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-canvas',
    'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none',
    'active:scale-[0.98]', // Feedback táctil inmediato
    'select-none'
  ],
  {
    variants: {
      variant: {
        primary: [
          'bg-brand-primary text-brand-on-primary',
          'hover:bg-brand-primary-hover',
          'active:bg-brand-primary-active',
          'focus-visible:ring-brand-primary',
          'border border-transparent'
        ],
        secondary: [
          'bg-bg-elevated text-text-primary',
          'hover:bg-bg-input-hover',
          'active:bg-bg-input-focus',
          'focus-visible:ring-border-strong',
          'border border-border-default'
        ],
        ghost: [
          'bg-transparent text-text-secondary',
          'hover:bg-bg-input-hover text-text-primary',
          'active:bg-bg-input-focus',
          'focus-visible:ring-border-strong',
          'border border-transparent'
        ],
        danger: [
          'bg-state-error-bg text-text-error',
          'hover:bg-state-error-bg/80',
          'active:bg-state-error-bg',
          'focus-visible:ring-border-error',
          'border border-border-error'
        ],
        outline: [
          'bg-transparent text-text-primary',
          'hover:bg-bg-input-hover',
          'active:bg-bg-input-focus',
          'focus-visible:ring-border-strong',
          'border border-border-default'
        ],
        link: [
          'bg-transparent text-text-link',
          'hover:text-text-link-hover underline',
          'active:text-text-link',
          'focus-visible:ring-border-strong',
          'border border-transparent p-0'
        ]
      },
      size: {
        xs: 'px-2.5 py-1.5 text-xs gap-1.5 min-h-[28px]',
        sm: 'px-3 py-1.5 text-sm gap-2 min-h-[32px]',
        md: 'px-4 py-2 text-sm gap-2 min-h-[40px]',
        lg: 'px-5 py-2.5 text-base gap-2.5 min-h-[48px]',
        xl: 'px-6 py-3 text-lg gap-3 min-h-[56px]'
      },
      fullWidth: {
        true: 'w-full'
      },
      loading: {
        true: 'relative text-transparent'
      }
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
      fullWidth: false,
      loading: false
    }
  }
);

/**
 * Spinner interno para estado de carga
 */
function ButtonSpinner({ size }: { size: VariantProps<typeof buttonVariants>['size'] }) {
  const sizeMap = { xs: 12, sm: 14, md: 16, lg: 20, xl: 24 };
  return (
    <Loader2
      className="animate-spin absolute inset-0 flex items-center justify-center"
      size={sizeMap[size || 'md']}
      strokeWidth={3}
      aria-hidden="true"
    />
  );
}

export interface ButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type'>,
    VariantProps<typeof buttonVariants> {
  /** Texto o contenido del botón */
  children: React.ReactNode;
  /** Ícono opcional al inicio */
  startIcon?: React.ReactNode;
  /** Ícono opcional al final */
  endIcon?: React.ReactNode;
  /** Estado de carga - muestra spinner y desactiva */
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant,
      size,
      fullWidth,
      loading,
      startIcon,
      endIcon,
      className,
      disabled,
      'aria-label': ariaLabel,
      'aria-describedby': ariaDescribedBy,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        type="button"
        className={cn(buttonVariants({ variant, size, fullWidth, loading }), className)}
        disabled={isDisabled}
        aria-disabled={isDisabled}
        aria-busy={loading}
        aria-label={ariaLabel}
        aria-describedby={ariaDescribedBy}
        {...props}
      >
        {loading ? (
          <>
            <span className="absolute inset-0 flex items-center justify-center" aria-hidden="true">
              <ButtonSpinner size={size} />
            </span>
            <span className="sr-only">Cargando…</span>
          </>
        ) : (
          <>
            {startIcon && <span className="flex-shrink-0" aria-hidden="true">{startIcon}</span>}
            <span>{children}</span>
            {endIcon && <span className="flex-shrink-0" aria-hidden="true">{endIcon}</span>}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

export { buttonVariants };