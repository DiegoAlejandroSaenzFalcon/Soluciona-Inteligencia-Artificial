// @soluciona/design-system/src/molecules/FormField/FormField.tsx
// FormField - Campo de formulario compuesto (Label + Input + Error + Hint + Validación)

'use client';

import { forwardRef, InputHTMLAttributes, TextareaHTMLAttributes, SelectHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/utils/cn';
import { Input } from '@/atoms/Input';
import { Textarea } from '@/atoms/Textarea';
import { Select } from '@/atoms/Select';
import { Label } from '@/atoms/Label';

type InputType = 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'date' | 'datetime-local' | 'search';

interface BaseFieldProps {
  /** Etiqueta del campo */
  label?: string;
  /** Texto de ayuda */
  hint?: string;
  /** Mensaje de error (controlado externamente) */
  error?: string;
  /** Si el campo es requerido */
  required?: boolean;
  /** Deshabilitado */
  disabled?: boolean;
  /** Solo lectura */
  readOnly?: boolean;
  /** ID personalizado */
  id?: string;
  /** Clase adicional para el contenedor */
  className?: string;
}

interface InputFieldProps extends BaseFieldProps, Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  /** Tipo de input */
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'date' | 'datetime-local' | 'search';
  /** Placeholder */
  placeholder?: string;
  /** Icono al inicio */
  startIcon?: ReactNode;
  /** Icono al final */
  endIcon?: ReactNode;
  /** Tamaño */
  size?: 'sm' | 'md' | 'lg';
  /** Valor */
  value?: string;
  /** Cambio de valor */
  onChange?: (value: string) => void;
  /** Componente a renderizar */
  as?: 'input' | 'textarea' | 'select';
  /** Opciones para select */
  options?: Array<{ value: string; label: string; disabled?: boolean }>;
}

export const FormField = forwardRef<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement, any>(
  (
    {
      label,
      hint,
      error,
      required,
      disabled,
      readOnly,
      id,
      className,
      type = 'text',
      placeholder,
      startIcon,
      endIcon,
      size = 'md',
      value,
      onChange,
      as = 'input',
      options,
      ...props
    },
    ref
  ) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      onChange?.(e.target.value);
    };

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={id} className="block text-sm font-medium text-text-secondary mb-1.5">
            {label}
            {required && <span className="text-text-error ml-1" aria-hidden="true">*</span>}
          </label>
        )}
        {as === 'textarea' ? (
          <textarea
            ref={ref}
            id={id}
            className="w-full bg-bg-input border border-border-default rounded-md text-text-primary placeholder:text-text-tertiary transition-all duration-100 ease-out resize-y min-h-[80px] hover:border-border-strong hover:bg-bg-input-hover focus:outline-none focus:border-border-focus focus:ring-2 focus:ring-brand-primary/40 focus:ring-offset-2 focus:ring-offset-bg-canvas disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-bg-surface read-only:bg-bg-surface read-only:cursor-default invalid:border-border-error invalid:focus:ring-border-error/40 px-4 py-2 text-sm"
            disabled={disabled}
            readOnly={readOnly}
            required={required}
            placeholder={placeholder}
            rows={4}
            value={value}
            onChange={(e) => onChange?.(e.target.value)}
            aria-invalid={!!error}
            aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
            {...props}
          />
        ) : (
          <input
            ref={ref}
            id={id}
            type={type}
            className="w-full bg-bg-input border border-border-default rounded-md text-text-primary placeholder:text-text-tertiary transition-all duration-100 ease-out hover:border-border-strong hover:bg-bg-input-hover focus:outline-none focus:border-border-focus focus:ring-2 focus:ring-brand-primary/40 focus:ring-offset-2 focus:ring-offset-bg-canvas disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-bg-surface read-only:bg-bg-surface read-only:cursor-default invalid:border-border-error invalid:focus:ring-border-error/40 px-4 py-2 text-sm"
            disabled={disabled}
            readOnly={readOnly}
            required={required}
            placeholder={placeholder}
            value={value}
            onChange={(e) => onChange?.(e.target.value)}
            aria-invalid={!!error}
            aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
            {...props}
          />
        )}
        {hint && !error && <p className="mt-1.5 text-sm text-text-tertiary">{hint}</p>}
        {error && <p className="mt-1.5 text-sm text-text-error flex items-center gap-1.5" role="alert">Error: {error}</p>}
      </div>
    );
  }
);

FormField.displayName = 'FormField';