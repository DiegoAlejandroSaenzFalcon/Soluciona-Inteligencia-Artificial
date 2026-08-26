// @soluciona/design-system/src/atoms/Radio/Radio.tsx
// Radio - Botón de opción accesible

'use client';

import { forwardRef, InputHTMLAttributes } from 'react';
import { cn } from '@/utils/cn';

interface RadioProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  /** Etiqueta */
  label?: string;
  /** Texto de ayuda */
  hint?: string;
  /** Mensaje de error */
  error?: string;
  /** Deshabilitado */
  disabled?: boolean;
  /** ID personalizado */
  id?: string;
}

export const Radio = forwardRef<HTMLInputElement, RadioProps>(
  (
    { label, hint, error, disabled, id, className, ...props },
    ref
  ) => {
    const generatedId = `radio-${Math.random().toString(36).slice(2, 9)}`;
    const radioId = id || generatedId;
    const hintId = `${radioId}-hint`;
    const errorId = `${radioId}-error`;

    return (
      <div className="flex items-start gap-3">
        <div className="relative flex items-center">
          <input
            ref={ref}
            type="radio"
            id={radioId}
            className="peer absolute opacity-0 w-full h-full cursor-pointer"
            disabled={disabled}
            aria-invalid={!!error}
            aria-describedby={`${error ? errorId : ''} ${hint ? hintId : ''}`.trim() || undefined}
            {...props}
            ref={ref}
          />
          <span
            className={cn(
              'relative inline-flex items-center justify-center rounded-full border-2 transition-colors duration-200',
              'peer-focus-visible:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-brand-primary/40 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-bg-canvas',
              'peer-checked:border-brand-primary',
              'peer-checked:invalid:border-rose-500',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'w-5 h-5',
              className
            )}
            aria-hidden="true"
          >
            <span
              className={cn(
                'absolute inset-1/2 w-2 h-2 rounded-full bg-brand-primary opacity-0',
                'peer-checked:opacity-100',
                'transition-opacity duration-200',
                '-translate-x-1/2 -translate-y-1/2'
              )}
              aria-hidden="true"
            />
          </span>
        </div>
        <label htmlFor={radioId} className="font-medium text-text-primary cursor-pointer">
          {label}
        </label>
        {hint && <p className="text-sm text-text-tertiary mt-1">{hint}</p>}
        {error && <p className="text-sm text-text-error mt-1" role="alert">{error}</p>}
      </div>
    );
  }
);

Radio.displayName = 'Radio';

/**
 * RadioGroup - Grupo de radios con manejo de estado
 */
import { useState, ReactNode } from 'react';

interface RadioGroupProps {
  /** Valor actual */
  value?: string;
  /** Cambio de valor */
  onChange?: (value: string) => void;
  /** Opciones */
  options: Array<{ value: string; label: string; hint?: string; disabled?: boolean }>;
  /** Etiqueta del grupo */
  label?: string;
  /** Texto de ayuda */
  hint?: string;
  /** Mensaje de error */
  error?: string;
  /** Dirección */
  direction?: 'vertical' | 'horizontal';
  /** ID personalizado */
  id?: string;
}

export function RadioGroup({
  value,
  onChange,
  options,
  label,
  hint,
  error,
  direction = 'vertical',
  id
}: RadioGroupProps) {
  const groupId = id || `radiogroup-${Math.random().toString(36).slice(2, 9)}`;

  return (
    <fieldset className={cn('space-y-3', direction === 'horizontal' && 'flex flex-wrap gap-4')}>
      {label && (
        <legend className="font-medium text-text-primary">{label}</legend>
      )}
      {hint && <p className="text-sm text-text-tertiary">{hint}</p>}
      <div className={cn('space-y-3', direction === 'horizontal' && 'flex flex-wrap gap-4')}>
        {options.map((option) => (
          <div key={option.value} className={cn('flex items-start gap-3', direction === 'horizontal' && 'items-center')}>
            <Radio
              id={`${groupId}-${option.value}`}
              name={groupId}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange?.(option.value)}
              disabled={disabled || option.disabled}
              label={option.label}
              hint={option.hint}
            />
          </div>
        ))}
      </div>
      {error && <p className="text-sm text-text-error" role="alert">{error}</p>}
    </fieldset>
  );
}