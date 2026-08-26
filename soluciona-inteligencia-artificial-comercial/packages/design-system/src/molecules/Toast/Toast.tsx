// @soluciona/design-system/src/molecules/Toast/Toast.tsx
// Toast - Notificaciones toast accesibles (estilo Sonner)

'use client';

import { forwardRef, ReactNode, useState, useEffect, useRef, createContext, useContext } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/utils/cn';
import { Button } from '@/atoms/Button';
import { Icon } from '@/atoms/Icon';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info, Loader2 } from 'lucide-react';

type ToastType = 'default' | 'success' | 'error' | 'warning' | 'info' | 'loading';

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  duration?: number;
  dismissible?: boolean;
}

interface ToastContextValue {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => string;
  removeToast: (id: string) => void;
  dismissToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

function useToastContext() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast debe usarse dentro de Toaster');
  }
  return context;
}

interface ToastProps extends React.HTMLAttributes<HTMLDivElement> {
  toast: Toast;
  onClose: (id: string) => void;
}

const typeStyles = {
  default: 'bg-bg-surface border-border-default',
  success: 'bg-state-success-bg border-state-success-border',
  error: 'bg-state-error-bg border-state-error-border',
  warning: 'bg-state-warning-bg border-state-warning-border',
  info: 'bg-state-info-bg border-state-info-border',
  loading: 'bg-state-info-bg border-state-info-border'
};

const typeIcons = {
  default: null,
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
  loading: Loader2
};

const typeIconColors = {
  default: 'text-text-tertiary',
  success: 'text-emerald-500',
  error: 'text-rose-500',
  warning: 'text-amber-500',
  info: 'text-blue-500',
  loading: 'text-blue-500'
};

function Toast({ toast, onClose }: ToastProps) {
  const IconComponent = typeIcons[toast.type];
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onClose(toast.id), 200);
    }, toast.duration ?? (toast.type === 'loading' ? 0 : 5000));

    return () => clearTimeout(timer);
  }, [toast, onClose]);

  if (!visible) return null;

  return (
    <div
      className={cn(
        'flex items-start gap-3 w-full max-w-sm rounded-lg border p-4 shadow-xl',
        'animate-in slide-in-from-right-full fade-in duration-200',
        'data-[state=closed]:animate-out data-[state=closed]:fade-out data-[state=closed]:slide-out-to-right',
        typeStyles[toast.type]
      )}
      role="alert"
      aria-live={toast.type === 'error' ? 'assertive' : 'polite'}
    >
      {typeIcons[toast.type] && (
        <div className={cn('flex-shrink-0 mt-0.5', typeIconColors[toast.type])}>
          <Icon icon={typeIcons[toast.type] as any} size="sm" />
        </div>
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2">
          <p className="font-medium text-text-primary">{toast.title}</p>
          <button
            onClick={() => onClose(toast.id)}
            className="ml-auto flex-shrink-0 p-1 rounded text-text-tertiary hover:text-text-primary hover:bg-bg-input-hover transition-colors"
            aria-label="Cerrar notificación"
          >
            <Icon icon={require('lucide-react').X} size="xs" />
          </button>
        </div>
        {toast.description && (
          <p className="mt-1 text-sm text-text-secondary">{toast.description}</p>
        )}
        {toast.action && (
          <Button
            variant="ghost"
            size="sm"
            className="mt-2"
            onClick={() => { toast.action.onClick(); onClose(toast.id); }}
          >
            {toast.action.label}
          </Button>
        )}
      </div>
    </div>
  );
}

interface ToasterProps {
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
  maxToasts?: number;
  gap?: number;
  className?: string;
}

export function Toaster({
  position = 'bottom-right',
  maxToasts = 5,
  gap = 8,
  className
}: ToasterProps) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = (toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).slice(2, 9);
    const newToast = { ...toast, id };
    setToasts(prev => [...prev.slice(-maxToasts + 1), newToast]);
    return id;
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const dismissToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const positionStyles = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'top-center': 'top-4 left-1/2 -translate-x-1/2',
    'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2'
  };

  return (
    <div
      className={cn(
        'fixed z-[var(--z-toast)] flex flex-col',
        positionStyles[position],
        'gap-2 pointer-events-none'
      )}
    >
      {toasts.map(toast => (
        <Toast key={toast.id} toast={toast} onClose={removeToast} />
      ))}
    </div>
  );
}

// Hook para usar toasts en cualquier componente
export function useToast() {
  const context = useToastContext();
  if (!context) {
    // Fallback para cuando no hay Toaster provider
    return {
      toast: (options: Omit<Toast, 'id'>) => {
        console.warn('Toaster no montado, toast no se mostrará:', options);
        return '';
      },
      dismiss: () => {}
    };
  }
  return context;
}

// Provider para Toaster
interface ToastProviderProps {
  children: ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = (toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).slice(2, 9);
    const newToast = { ...toast, id };
    setToasts(prev => [...prev, newToast]);
    return id;
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const value = { toasts, addToast, removeToast, dismissToast: removeToast };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <Toaster />
    </ToastContext.Provider>
  );
}

// Funciones de conveniencia
export const toast = {
  success: (title: string, options?: Partial<Toast>) => {
    // Se usaría con useToast()
    console.log('toast.success:', title, options);
  },
  error: (title: string, options?: Partial<Toast>) => {
    console.log('toast.error:', title, options);
  },
  warning: (title: string, options?: Partial<Toast>) => {
    console.log('toast.warning:', title, options);
  },
  info: (title: string, options?: Partial<Toast>) => {
    console.log('toast.info:', title, options);
  },
  loading: (title: string, options?: Partial<Toast>) => {
    console.log('toast.loading:', title, options);
  }
};