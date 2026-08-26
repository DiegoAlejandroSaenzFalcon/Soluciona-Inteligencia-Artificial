// @soluciona/design-system/src/atoms/Skeleton/Skeleton.tsx
// Skeleton - Placeholder animado para carga de contenido

'use client';

import { forwardRef, HTMLAttributes } from 'react';
import { cn } from '@/utils/cn';

interface SkeletonProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  /** Variante visual */
  variant?: 'text' | 'circular' | 'rectangular' | 'card' | 'table-row';
  /** Ancho (para variant text) */
  width?: string | number;
  /** Alto */
  height?: string | number;
  /** Border radius personalizado */
  radius?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | 'full';
  /** Animación */
  animation?: 'pulse' | 'wave' | 'none';
  /** Clase adicional */
  className?: string;
}

const radiusStyles = {
  none: 'rounded-none',
  sm: 'rounded-sm',
  md: 'rounded-md',
  lg: 'rounded-lg',
  xl: 'rounded-xl',
  full: 'rounded-full'
};

const variantStyles = {
  text: 'h-4 max-w-full',
  circular: 'rounded-full',
  rectangular: 'rounded-lg',
  card: 'rounded-xl',
  'table-row': 'h-12'
};

export const Skeleton = forwardRef<HTMLDivElement, SkeletonProps>(
  (
    { variant = 'text', width, height, radius = 'md', animation = 'pulse', className, style, ...props },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={cn(
          'bg-slate-700/50 animate-pulse',
          variantStyles[variant],
          radiusStyles[radius],
          className
        )}
        style={{
          width: width ? (typeof width === 'number' ? `${width}px` : width) : undefined,
          height: height ? (typeof height === 'number' ? `${height}px` : height) : undefined,
          ...style
        }}
        {...props}
      >
        {animation === 'wave' && (
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-[shimmer_1.5s_infinite]" />
        )}
      </div>
    );
  }
);

Skeleton.displayName = 'Skeleton';

// CSS para animación shimmer (se inyecta via GlobalStyles)
/*
@keyframes shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}
*/

/**
 * Skeleton predefinidos para patrones comunes
 */

interface SkeletonCardProps extends HTMLAttributes<HTMLDivElement> {
  /** Tiene imagen */
  hasImage?: boolean;
  /** Número de líneas de texto */
  lines?: number;
  /** Ancho de la tarjeta */
  width?: string;
}

export const SkeletonCard = forwardRef<HTMLDivElement, SkeletonCardProps>(
  ({ hasImage = true, lines = 3, width, className, ...props }, ref) => {
    return (
      <div ref={ref} className={cn('space-y-3', className)} style={{ width }} {...props}>
        {hasImage && (
          <Skeleton variant="rectangular" width="100%" height="160" radius="lg" />
        )}
        <div className="space-y-2 px-1">
          <Skeleton variant="text" width="40%" height={20} />
          {Array.from({ length: lines - 1 }).map((_, i) => (
            <Skeleton key={i} variant="text" width={`${60 + Math.random() * 30}%`} height={16} />
          ))}
        </div>
      </div>
    );
  }
);

SkeletonCard.displayName = 'SkeletonCard';

interface SkeletonTableRowProps extends HTMLAttributes<HTMLDivElement> {
  /** Número de columnas */
  columns?: number;
  /** Anchos relativos de columnas */
  columnWidths?: number[];
}

export const SkeletonTableRow = forwardRef<HTMLDivElement, SkeletonTableRowProps>(
  ({ columns = 4, columnWidths, className, ...props }, ref) => {
    const widths = columnWidths || Array.from({ length: columns }, () => 100 / columns);

    return (
      <div ref={ref} className={cn('grid gap-4', className)} style={{ gridTemplateColumns: widths.map(w => `${w}%`).join(' ') }} {...props}>
        {widths.map((_, i) => (
          <Skeleton key={i} variant="text" width="100%" height={16} />
        ))}
      </div>
    );
  }
);

SkeletonTableRow.displayName = 'SkeletonTableRow';

interface SkeletonListProps extends HTMLAttributes<HTMLDivElement> {
  /** Número de items */
  items?: number;
  /** Tiene avatar */
  hasAvatar?: boolean;
  /** Líneas de texto por item */
  lines?: number;
}

export const SkeletonList = forwardRef<HTMLDivElement, SkeletonListProps>(
  ({ items = 5, hasAvatar = true, lines = 2, className, ...props }, ref) => {
    return (
      <div ref={ref} className={cn('space-y-4', className)} {...props}>
        {Array.from({ length: items }).map((_, i) => (
          <div key={i} className={cn('flex gap-3 items-start', hasAvatar && 'pl-12')}>
            {hasAvatar && <Skeleton variant="circular" size="md" className="-ml-12" />}
            <div className="space-y-2 flex-1 min-w-0">
              <Skeleton variant="text" width="30%" height={20} />
              {Array.from({ length: lines - 1 }).map((_, j) => (
                <Skeleton key={j} variant="text" width={`${60 + Math.random() * 30}%`} height={14} />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }
);

SkeletonList.displayName = 'SkeletonList';