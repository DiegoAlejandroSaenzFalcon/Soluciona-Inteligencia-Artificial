// @soluciona/design-system/src/atoms/Textarea/Textarea.tsx
// Textarea - Área de texto accesible

'use client';

import { forwardRef, TextareaHTMLAttributes, useId } from 'react';
import { cn } from '@/utils/cn';

interface TextareaProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'size'> {
  /** Etiqueta */
  label?: string;
  /** Texto de ayuda */
  hint?: string;
  /** Mensaje de error */
  error?: string;
  /** Tamaño */
  size?: 'sm' | 'md' | 'lg';
  /** Filas visibles */
  rows?: number;
  /** Deshabilitado */
  disabled?: boolean;
  /** Solo lectura */
  readOnly?: boolean;
  /** Requerido */
  required?: boolean;
  /** ID personalizado */
  id?: string;
}

const sizeStyles = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-5 py-2.5 text-base'
};

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      label,
      hint,
      error,
      size = 'md',
      rows = 4,
      disabled,
      readOnly,
      required,
      id: providedId,
      className,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const textareaId = providedId || generatedId;
    const hintId = `${textareaId}-hint`;
    const errorId = `${textareaId}-error`;

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={textareaId} className="block text-sm font-medium text-text-secondary mb-1.5">
            {label}
            {required && <span className="text-text-error ml-1" aria-hidden="true">*</span>}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          rows={rows}
          className={cn(
            'w-full bg-bg-input border border-border-default rounded-md',
            'text-text-primary placeholder:text-text-tertiary',
            'transition-all duration-100 ease-out',
            'resize-y min-h-[80px]',
            'hover:border-border-strong hover:bg-bg-input-hover',
            'focus:outline-none focus:border-border-focus focus:ring-2 focus:ring-brand-primary/40 focus:ring-offset-2 focus:ring-offset-bg-canvas',
            'disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-bg-surface',
            'read-only:bg-bg-surface read-only:cursor-default',
            'invalid:border-border-error invalid:focus:ring-border-error/40',
            sizeStyles[size],
            className
          )}
          disabled={disabled}
          readOnly={readOnly}
          required={required}
          aria-invalid={!!error}
          aria-describedby={`${error ? errorId : ''} ${hint ? hintId : ''}`.trim() || undefined}
          {...props}
          ref={ref}
        />
        {hint && !error && (
          <p id={hintId} className="mt-1.5 text-sm text-text-tertiary">
            {hint}
          </p>
        )}
        {error && (
          <p id={errorId} className="mt-1.5 text-sm text-text-error flex items-center gap-1.5" role="alert">
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

Textarea.displayName = 'Textarea';