// @soluciona/design-system/src/atoms/Switch/Switch.tsx
// Switch - Interruptor accesible

'use client';

import { forwardRef, InputHTMLAttributes } from 'react';
import { cn } from '@/utils/cn';

interface SwitchProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  /** Etiqueta */
  label?: string;
  /** Texto de ayuda */
  hint?: string;
  /** Mensaje de error */
  error?: string;
  /** Tamaño */
  size?: 'sm' | 'md' | 'lg';
  /** Deshabilitado */
  disabled?: boolean;
  /** ID personalizado */
  id?: string;
}

const sizeStyles = {
  sm: 'w-8 h-5',
  md: 'w-11 h-6',
  lg: 'w-14 h-7'
};

const thumbStyles = {
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6'
};

const thumbTranslate = {
  sm: 'translate-x-4',
  md: 'translate-x-5',
  lg: 'translate-x-7'
};

export const Switch = forwardRef<HTMLInputElement, SwitchProps>(
  (
    { label, hint, error, size = 'md', disabled, id, className, ...props },
    ref
  ) => {
    const generatedId = `switch-${Math.random().toString(36).slice(2, 9)}`;
    const switchId = id || generatedId;
    const hintId = `${switchId}-hint`;
    const errorId = `${switchId}-error`;

    return (
      <div className="flex items-start gap-3">
        <div className="relative flex items-center">
          <input
            ref={ref}
            type="checkbox"
            id={switchId}
            role="switch"
            className="peer absolute opacity-0 w-full h-full cursor-pointer"
            disabled={disabled}
            aria-invalid={!!error}
            aria-describedby={`${error ? errorId : ''} ${hint ? hintId : ''}`.trim() || undefined}
            {...props}
            ref={ref}
          />
          <span
            className={cn(
              'relative inline-flex items-center rounded-full border-2 transition-colors duration-200',
              'peer-focus-visible:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-brand-primary/40 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-bg-canvas',
              'peer-checked:bg-brand-primary peer-checked:border-brand-primary',
              'peer-checked:invalid:bg-rose-500 peer-checked:invalid:border-rose-500',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              sizeStyles[size],
              className
            )}
            aria-hidden="true"
          >
            <span
              className={cn(
                'absolute top-1/2 left-1 bg-white rounded-full shadow-sm transition-transform duration-200',
                'peer-checked:translate-x-full',
                thumbStyles[size],
                thumbTranslate[size]
              )}
              aria-hidden="true"
            />
          </span>
        </div>
        <div className="flex flex-col gap-1">
          {label && (
            <label htmlFor={switchId} className={cn('font-medium text-text-primary', disabled && 'opacity-50')}>
              {label}
            </label>
          )}
          {hint && !error && <p id={hintId} className="text-sm text-text-tertiary">{hint}</p>}
          {error && <p id={errorId} className="text-sm text-text-error" role="alert">{error}</p>}
        </div>
      </div>
    );
  }
);

Switch.displayName = 'Switch';