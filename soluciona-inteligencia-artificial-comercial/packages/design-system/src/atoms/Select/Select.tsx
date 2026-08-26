// @soluciona/design-system/src/atoms/Select/Select.tsx
// Select - Selector accesible con opciones

'use client';

import { forwardRef, SelectHTMLAttributes, useId } from 'react';
import { cn } from '@/utils/cn';
import { ChevronDown } from 'lucide-react';

interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  /** Etiqueta */
  label?: string;
  /** Texto de ayuda */
  hint?: string;
  /** Mensaje de error */
  error?: string;
  /** Opciones */
  options: SelectOption[];
  /** Placeholder */
  placeholder?: string;
  /** Tamaño */
  size?: 'sm' | 'md' | 'lg';
  /** Deshabilitado */
  disabled?: boolean;
  /** Requerido */
  required?: boolean;
  /** ID personalizado */
  id?: string;
}

const sizeStyles = {
  sm: 'px-3 py-1.5 text-sm min-h-[32px]',
  md: 'px-4 py-2 text-sm min-h-[40px]',
  lg: 'px-5 py-2.5 text-base min-h-[48px]'
};

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      label,
      hint,
      error,
      options,
      placeholder,
      size = 'md',
      disabled,
      required,
      id: providedId,
      className,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const selectId = providedId || generatedId;
    const hintId = `${selectId}-hint`;
    const errorId = `${selectId}-error`;

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={selectId} className="block text-sm font-medium text-text-secondary mb-1.5">
            {label}
            {required && <span className="text-text-error ml-1" aria-hidden="true">*</span>}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            className={cn(
              'w-full appearance-none bg-bg-input border border-border-default rounded-md',
              'text-text-primary placeholder:text-text-tertiary',
              'transition-all duration-100 ease-out',
              'hover:border-border-strong hover:bg-bg-input-hover',
              'focus:outline-none focus:border-border-focus focus:ring-2 focus:ring-brand-primary/40 focus:ring-offset-2 focus:ring-offset-bg-canvas',
              'disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-bg-surface',
              'invalid:border-border-error invalid:focus:ring-border-error/40',
              sizeStyles[size],
              'pr-10', // espacio para la flecha
              className
            )}
            disabled={disabled}
            required={required}
            aria-invalid={!!error}
            aria-describedby={`${error ? errorId : ''} ${hint ? hintId : ''}`.trim() || undefined}
            {...props}
            ref={ref}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((option) => (
              <option key={option.value} value={option.value} disabled={option.disabled}>
                {option.label}
              </option>
            ))}
          </select>
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-text-tertiary">
            <ChevronDown className="w-5 h-5" aria-hidden="true" />
          </div>
        </div>
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

Select.displayName = 'Select';