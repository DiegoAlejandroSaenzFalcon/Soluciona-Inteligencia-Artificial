// @soluciona/design-system/src/atoms/Checkbox/Checkbox.tsx
// Checkbox - Casilla de verificación accesible

'use client';

import { forwardRef, InputHTMLAttributes } from 'react';
import { cn } from '@/utils/cn';
import { Check } from 'lucide-react';

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  /** Etiqueta */
  label?: string;
  /** Texto de ayuda */
  hint?: string;
  /** Mensaje de error */
  error?: string;
  /** Estado indeterminado */
  indeterminate?: boolean;
  /** Deshabilitado */
  disabled?: boolean;
  /** ID personalizado */
  id?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  (
    { label, hint, error, indeterminate, disabled, id, className, ...props },
    ref
  ) => {
    const generatedId = `checkbox-${Math.random().toString(36).slice(2, 9)}`;
    const checkboxId = id || `checkbox-${Math.random().toString(36).slice(2, 9)}`;
    const hintId = `${checkboxId}-hint`;
    const errorId = `${checkboxId}-error`;

    return (
      <div className="flex items-start gap-3">
        <div className="relative flex items-center">
          <input
            ref={ref}
            type="checkbox"
            id={checkboxId}
            className="peer absolute opacity-0 w-full h-full cursor-pointer"
            disabled={disabled}
            aria-invalid={!!error}
            aria-describedby={`${error ? errorId : ''} ${hint ? hintId : ''}`.trim() || undefined}
            {...props}
            ref={ref}
          />
          <span
            className={cn(
              'relative inline-flex items-center justify-center rounded-md border-2 transition-colors duration-200',
              'peer-focus-visible:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-brand-primary/40 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-bg-canvas',
              'peer-checked:bg-brand-primary peer-checked:border-brand-primary',
              'peer-checked:invalid:bg-rose-500 peer-checked:invalid:border-rose-500',
              'peer-indeterminate:bg-brand-primary peer-indeterminate:border-brand-primary',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'w-5 h-5',
              className
            )}
            aria-hidden="true"
          >
            {indeterminate ? (
              <div className="absolute inset-0 flex items-center justify-center w-2.5 h-0.5 bg-white" aria-hidden="true" />
            ) : (
              <Check className="w-3.5 h-3.5 text-white opacity-0 peer-checked:opacity-100 peer-indeterminate:opacity-0 transition-opacity" aria-hidden="true" />
            )}
          </span>
        </div>
        {label && (
          <label htmlFor={checkboxId} className="font-medium text-text-primary cursor-pointer">
            {label}
          </label>
        )}
        {hint && <p id={`${checkboxId}-hint`} className="text-sm text-text-tertiary mt-1">{hint}</p>}
        {error && <p id={`${checkboxId}-error`} className="text-sm text-text-error mt-1" role="alert">{error}</p>}
      </div>
    );
  }
);

Checkbox.displayName = 'Checkbox';