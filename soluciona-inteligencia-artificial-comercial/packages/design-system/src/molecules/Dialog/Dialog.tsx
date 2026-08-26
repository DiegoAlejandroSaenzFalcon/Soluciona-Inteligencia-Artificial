// @soluciona/design-system/src/molecules/Dialog/Dialog.tsx
// Dialog - Modal accesible con Radix UI patterns

'use client';

import { forwardRef, ReactNode, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/utils/cn';
import { Button } from '@/atoms/Button';
import { Icon } from '@/atoms/Icon';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

interface DialogProps {
  /** Si está abierto */
  open: boolean;
  /** Callback al cerrar */
  onOpenChange: (open: boolean) => void;
  /** Título */
  title?: string;
  /** Descripción */
  description?: string;
  /** Contenido */
  children: ReactNode;
  /** Tamaño */
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  /** Mostrar botón cerrar */
  showClose?: boolean;
  /** Cerrar al clickear overlay */
  closeOnOverlayClick?: boolean;
  /** Cerrar con Escape */
  closeOnEscape?: boolean;
}

const sizeStyles = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-2xl',
  full: 'max-w-4xl'
};

export const Dialog = forwardRef<HTMLDivElement, DialogProps>(
  (
    {
      open,
      onOpenChange,
      title,
      description,
      children,
      size = 'md',
      showClose = true,
      closeOnOverlayClick = true,
      closeOnEscape = true,
      className
    },
    ref
  ) => {
    const overlayRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const previousActiveElement = useRef<HTMLElement | null>(null);

    useEffect(() => {
      if (open) {
        previousActiveElement.current = document.activeElement as HTMLElement;
        document.body.style.overflow = 'hidden';
        contentRef.current?.focus();
      } else {
        document.body.style.overflow = '';
        previousActiveElement.current?.focus();
      }
      return () => {
        document.body.style.overflow = '';
      };
    }, [open]);

    useEffect(() => {
      if (!open || !closeOnEscape) return;
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onOpenChange(false);
        }
      };
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }, [open, closeOnEscape, onOpenChange]);

    const handleOverlayClick = (e: React.MouseEvent) => {
      if (closeOnOverlayClick && e.target === e.currentTarget) {
        onOpenChange(false);
      }
    };

    const handleContentClick = (e: React.MouseEvent) => {
      e.stopPropagation();
    };

    if (!open) return null;

    const portalContent = (
      <div
        ref={overlayRef}
        className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center p-4"
        onClick={handleOverlayClick}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'dialog-title' : undefined}
        aria-describedby={description ? 'dialog-description' : undefined}
      >
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in-200"
          aria-hidden="true"
        />
        <div
          ref={contentRef}
          tabIndex={-1}
          className={cn(
            'relative w-full bg-bg-surface rounded-xl shadow-xl animate-in fade-in-200 zoom-in-95 duration-200',
            'focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-2 focus:ring-offset-bg-canvas',
            sizeStyles[size],
            className
          )}
          onClick={handleContentClick}
          role="document"
        >
          {(title || showClose) && (
            <div className="flex items-start justify-between p-4 border-b border-border-default">
              <div>
                {title && (
                  <h2 id="dialog-title" className="text-lg font-semibold text-text-primary">
                    {title}
                  </h2>
                )}
                {description && (
                  <p id="dialog-description" className="text-sm text-text-tertiary mt-1">
                    {description}
                  </p>
                )}
              </div>
              {showClose && (
                <button
                  onClick={() => onOpenChange(false)}
                  className="p-1 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-bg-input-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
                  aria-label="Cerrar diálogo"
                >
                  <Icon icon={require('lucide-react').X} size="sm" />
                </button>
              )}
            </div>
          )}
          <div className="p-4">
            {children}
          </div>
        </div>
      </div>
    );

    return createPortal(portalContent, document.body);
  }
);

Dialog.displayName = 'Dialog';

// ConfirmDialog - Diálogo de confirmación predefinido
interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'primary' | 'warning';
  onConfirm: () => void;
  loading?: boolean;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'danger',
  onConfirm,
  loading = false
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={title} size="sm">
      <p className="text-text-secondary mb-6">{message}</p>
      <div className="flex justify-end gap-3">
        <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={loading}>
          {cancelLabel}
        </Button>
        <Button
          variant={variant}
          onClick={() => { onConfirm(); onOpenChange(false); }}
          loading={loading}
        >
          {confirmLabel}
        </Button>
      </div>
    </Dialog>
  );
}

// AlertDialog - Diálogo de alerta simple
interface AlertDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
}

export function AlertDialog({ open, onOpenChange, title, message, confirmLabel = 'Entendido', onConfirm }: AlertDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={title} size="sm">
      <p className="text-text-secondary mb-6">{message}</p>
      <div className="flex justify-end">
        <Button variant="primary" onClick={() => { onConfirm(); onOpenChange(false); }}>
          {confirmLabel}
        </Button>
      </div>
    </Dialog>
  );
}

// Sheet - Panel lateral (drawer)
interface SheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  children: ReactNode;
  side?: 'left' | 'right';
  size?: 'sm' | 'md' | 'lg' | 'full';
}

const sheetSideStyles = {
  left: 'left-0',
  right: 'right-0'
};

const sheetSizeStyles = {
  sm: 'w-64',
  md: 'w-80',
  lg: 'w-96',
  full: 'w-full max-w-full'
};

export function Sheet({ open, onOpenChange, title, children, side = 'right', size = 'md' }: SheetProps) {
  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[var(--z-modal)] flex" onClick={() => onOpenChange(false)}>
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in-200"
        aria-hidden="true"
        onClick={() => onOpenChange(false)}
      />
      <div
        className={cn(
          'fixed inset-y-0 z-50 bg-bg-surface shadow-xl animate-in slide-in-from-right-52 duration-300',
          'flex flex-col',
          sheetSideStyles[side],
          sheetSizeStyles[size]
        )}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'sheet-title' : undefined}
      >
        {(title) && (
          <div className="flex items-center justify-between p-4 border-b border-border-default">
            <h2 id="sheet-title" className="text-lg font-semibold text-text-primary">{title}</h2>
            <button
              onClick={() => onOpenChange(false)}
              className="p-1 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-bg-input-hover transition-colors"
              aria-label="Cerrar panel"
            >
              <Icon icon={require('lucide-react').X} size="sm" />
            </button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto p-4">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}