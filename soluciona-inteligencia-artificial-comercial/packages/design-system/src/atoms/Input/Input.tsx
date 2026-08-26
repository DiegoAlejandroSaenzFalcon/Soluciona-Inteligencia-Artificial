// @soluciona/design-system/src/atoms/Input/Input.tsx
// Input - Campo de texto accesible con validación integrada

'use client';

import { forwardRef, InputHTMLAttributes, useId } from 'react';
import { cn } from '@/utils/cn';

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  /** Etiqueta del campo */
  label?: string;
  /** Texto de ayuda / hint */
  hint?: string;
  /** Mensaje de error (muestra estado error) */
  error?: string;
  /** ID del mensaje de error para aria-describedby */
  errorId?: string;
  /** Tamaño del input */
  size?: 'sm' | 'md' | 'lg';
  /** Icono al inicio */
  startIcon?: React.ReactNode;
  /** Icono al final */
  endIcon?: React.ReactNode;
  /** Indica si el campo es requerido (para label) */
  required?: boolean;
  /** Deshabilita el campo */
  disabled?: boolean;
  /** Solo lectura */
  readOnly?: boolean;
}

const sizeStyles = {
  sm: 'px-3 py-1.5 text-sm min-h-[32px]',
  md: 'px-4 py-2 text-sm min-h-[40px]',
  lg: 'px-5 py-2.5 text-base min-h-[48px]'
};

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      hint,
      error,
      errorId,
      size = 'md',
      startIcon,
      endIcon,
      required,
      disabled,
      readOnly,
      className,
      id: providedId,
      'aria-describedby': ariaDescribedBy,
      'aria-invalid': ariaInvalid,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const inputId = providedId || generatedId;
    const hintId = useId();
    const errorIdGenerated = useId();

    const describedBy = [
      hint ? hintId : null,
      error ? (errorId || errorIdGenerated) : null,
      ariaDescribedBy
    ].filter(Boolean).join(' ') || undefined;

    const isInvalid = !!error;

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-text-secondary mb-1.5">
            {label}
            {required && <span className="text-text-error ml-1" aria-hidden="true">*</span>}
          </label>
        )}
        <div className="relative">
          {startIcon && (
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-text-tertiary">
              {startIcon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              'w-full bg-bg-input border border-border-default rounded-md',
              'text-text-primary placeholder:text-text-tertiary',
              'transition-all duration-100 ease-out',
              'hover:border-border-strong hover:bg-bg-input-hover',
              'focus:outline-none focus:border-border-focus focus:ring-2 focus:ring-brand-primary/40 focus:ring-offset-2 focus:ring-offset-bg-canvas',
              'disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-bg-surface',
              'read-only:bg-bg-surface read-only:cursor-default',
              'invalid:border-border-error invalid:focus:ring-border-error/40',
              sizeStyles[size],
              startIcon && 'pl-10',
              endIcon && 'pr-10',
              className
            )}
            disabled={disabled}
            readOnly={readOnly}
            aria-invalid={isInvalid}
            aria-describedby={describedBy}
            aria-required={required}
            {...props}
            ref={ref}
          />
          {endIcon && (
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-text-tertiary">
              {endIcon}
            </div>
          )}
        </div>
        {hint && !error && (
          <p id={hintId} className="mt-1.5 text-sm text-text-tertiary">
            {hint}
          </p>
        )}
        {error && (
          <p id={errorId || errorIdGenerated} className="mt-1.5 text-sm text-text-error flex items-center gap-1.5" role="alert">
            <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';