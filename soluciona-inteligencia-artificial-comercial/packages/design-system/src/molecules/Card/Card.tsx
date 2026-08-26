// @soluciona/design-system/src/molecules/Card/Card.tsx
// Card - Contenedor flexible para contenido

'use client';

import { forwardRef, ReactNode, HTMLAttributes } from 'react';
import { cn } from '@/utils/cn';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Variante visual */
  variant?: 'default' | 'outlined' | 'elevated' | 'filled';
  /** Padding interno */
  padding?: 'none' | 'sm' | 'md' | 'lg';
  /** Hover effect */
  hoverable?: boolean;
  /** Contenido */
  children: ReactNode;
}

const variantStyles = {
  default: 'bg-bg-surface border border-border-default',
  outlined: 'bg-transparent border-2 border-border-default',
  elevated: 'bg-bg-surface shadow-md',
  filled: 'bg-bg-elevated border border-border-subtle'
};

const paddingStyles = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6'
};

export const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    { variant = 'default', padding = 'md', hoverable = false, className, children, ...props },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={cn(
          'rounded-xl transition-shadow duration-200',
          variantStyles[variant],
          paddingStyles[padding],
          hoverable && 'hover:shadow-lg hover:border-brand-primary/50 cursor-pointer',
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

// CardHeader - Cabecera de la card
interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  title?: string;
  description?: string;
  action?: ReactNode;
}

export const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ title, description, action, className, children, ...props }, ref) => {
    return (
      <div ref={ref} className={cn('flex items-start justify-between gap-4 mb-4', className)} {...props}>
        <div className="flex-1 min-w-0">
          {title && <h3 className="text-lg font-semibold text-text-primary">{title}</h3>}
          {description && <p className="text-sm text-text-tertiary mt-1">{description}</p>}
          {children}
        </div>
        {action && <div className="flex-shrink-0 mt-1">{action}</div>}
      </div>
    );
  }
);

CardHeader.displayName = 'CardHeader';

// CardContent - Contenido principal
export const CardContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('', className)} {...props} />
  )
);

CardContent.displayName = 'CardContent';

// CardFooter - Pie de la card
interface CardFooterProps extends HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export const CardFooter = forwardRef<HTMLDivElement, CardFooterProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex items-center gap-2 mt-4 pt-4 border-t border-border-default', className)}
      {...props}
    />
  )
);

CardFooter.displayName = 'CardFooter';

// Card compuestos
Card.Header = CardHeader;
Card.Content = CardContent;
Card.Footer = CardFooter;