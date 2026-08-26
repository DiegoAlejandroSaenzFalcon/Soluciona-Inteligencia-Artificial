// @soluciona/design-system/src/atoms/Avatar/Avatar.tsx
// Avatar - Imagen de perfil con fallback a iniciales

'use client';

import { forwardRef, HTMLAttributes, useMemo } from 'react';
import { cn } from '@/utils/cn';

interface AvatarProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  /** URL de la imagen */
  src?: string | null;
  /** Texto alternativo / nombre para iniciales */
  alt?: string;
  /** Tamaño */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  /** Forma */
  shape?: 'circle' | 'square';
  /** Indicador de estado (online, away, busy, offline) */
  status?: 'online' | 'away' | 'busy' | 'offline';
  /** Texto de fallback si no hay src ni alt */
  fallback?: string;
}

const sizeStyles = {
  xs: 'w-6 h-6 text-[10px]',
  sm: 'w-8 h-8 text-[11px]',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-16 h-16 text-lg',
  '2xl': 'w-24 h-24 text-xl'
};

const statusSizeStyles = {
  xs: 'w-1.5 h-1.5',
  sm: 'w-2 h-2',
  md: 'w-2.5 h-2.5',
  lg: 'w-3 h-3',
  xl: 'w-4 h-4',
  '2xl': 'w-5 h-5'
};

const statusColors = {
  online: 'bg-emerald-500',
  away: 'bg-amber-500',
  busy: 'bg-rose-500',
  offline: 'bg-slate-400'
};

export const Avatar = forwardRef<HTMLDivElement, AvatarProps>(
  (
    {
      src,
      alt,
      size = 'md',
      shape = 'circle',
      status,
      fallback,
      className,
      ...props
    },
    ref
  ) => {
    const initials = useMemo(() => {
      if (!alt) return fallback || '?';
      const parts = alt.trim().split(/\s+/);
      if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }, [alt, fallback]);

    const hasImage = Boolean(src);
    const showFallback = !hasImage;

    return (
      <div
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center overflow-hidden bg-bg-elevated',
          'bg-cover bg-center',
          sizeStyles[size],
          shape === 'circle' ? 'rounded-full' : 'rounded-lg',
          className
        )}
        {...props}
      >
        {hasImage ? (
          <img
            src={src}
            alt={alt || ''}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <span className="font-medium text-text-primary" aria-hidden="true">
            {initials}
          </span>
        )}
        {status && (
          <span
            className={cn(
              'absolute bottom-0 right-0 border-2 border-bg-canvas rounded-full',
              statusSizeStyles[size],
              statusColors[status]
            )}
            aria-label={`Estado: ${status}`}
          />
        )}
      </div>
    );
  }
);

Avatar.displayName = 'Avatar';

// Componente para grupo de avatares apilados
export interface AvatarGroupProps extends HTMLAttributes<HTMLDivElement> {
  /** Avatares a mostrar */
  children: React.ReactNode;
  /** Máximo de avatares visibles antes de mostrar "+N" */
  max?: number;
  /** Tamaño de los avatares */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  /** Espaciado entre avatares (negativo para overlap) */
  overlap?: boolean;
}

export const AvatarGroup = forwardRef<HTMLDivElement, AvatarGroupProps>(
  (
    { children, max = 5, size = 'md', overlap = true, className, ...props },
    ref
  ) => {
    const childArray = React.Children.toArray(children);
    const visibleChildren = childArray.slice(0, max);
    const remainingCount = childArray.length - max;

    return (
      <div
        ref={ref}
        className={cn('flex items-center', overlap ? '-space-x-2' : 'space-x-2', className)}
        {...props}
      >
        {visibleChildren.map((child, index) =>
          React.cloneElement(child as React.ReactElement, {
            key: child.key || index,
            size,
            className: cn(
              child.props.className,
              overlap && index > 0 && 'ring-2 ring-bg-canvas'
            )
          })
        )}
        {remainingCount > 0 && (
          <div
            className={cn(
              sizeStyles[size],
              shape === 'circle' ? 'rounded-full' : 'rounded-lg',
              'bg-brand-primary/10 text-brand-primary font-medium flex items-center justify-center ring-2 ring-bg-canvas'
            )}
            aria-label={`${remainingCount} personas más`}
          >
            +{remainingCount}
          </div>
        )}
      </div>
    );
  }
);

AvatarGroup.displayName = 'AvatarGroup';