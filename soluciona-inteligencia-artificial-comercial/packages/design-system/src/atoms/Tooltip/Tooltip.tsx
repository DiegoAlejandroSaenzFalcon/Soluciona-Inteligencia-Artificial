// @soluciona/design-system/src/atoms/Tooltip/Tooltip.tsx
// Tooltip - Información contextual accesible

'use client';

import { forwardRef, ReactNode, useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/utils/cn';

interface TooltipProps {
  /** Contenido del tooltip */
  content: ReactNode;
  /** Elemento hijo que activa el tooltip */
  children: ReactNode;
  /** Posición */
  side?: 'top' | 'right' | 'bottom' | 'left';
  /** Offset desde el elemento */
  offset?: number;
  /** Retraso apertura (ms) */
  openDelay?: number;
  /** Retraso cierre (ms) */
  closeDelay?: number;
  /** Si está deshabilitado */
  disabled?: boolean;
}

export function Tooltip({
  content,
  children,
  side = 'top',
  offset = 8,
  openDelay = 200,
  closeDelay = 100,
  disabled = false
}: TooltipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const openTimeoutRef = useRef<NodeJS.Timeout>();
  const closeTimeoutRef = useRef<NodeJS.Timeout>();

  const updatePosition = () => {
    if (!triggerRef.current || !tooltipRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let top = 0;
    let left = 0;

    switch (side) {
      case 'top':
        top = triggerRect.top - tooltipRect.height - offset;
        left = triggerRect.left + (triggerRect.width - tooltipRect.width) / 2;
        break;
      case 'bottom':
        top = triggerRect.bottom + offset;
        left = triggerRect.left + (triggerRect.width - tooltipRect.width) / 2;
        break;
      case 'left':
        top = triggerRect.top + (triggerRect.height - tooltipRect.height) / 2;
        left = triggerRect.left - tooltipRect.width - offset;
        break;
      case 'right':
        top = triggerRect.top + (triggerRect.height - tooltipRect.height) / 2;
        left = triggerRect.right + offset;
        break;
    }

    // Ajustar para no salirse del viewport
    if (left < 8) left = 8;
    if (left + tooltipRect.width > viewportWidth - 8) left = viewportWidth - tooltipRect.width - 8;
    if (top < 8) top = 8;
    if (top + tooltipRect.height > viewportHeight - 8) top = viewportHeight - tooltipRect.height - 8;

    setPosition({ top, left });
  };

  const handleMouseEnter = () => {
    if (disabled) return;
    clearTimeout(closeTimeoutRef.current);
    openTimeoutRef.current = setTimeout(() => {
      setIsOpen(true);
      requestAnimationFrame(updatePosition);
    }, openDelay);
  };

  const handleMouseLeave = () => {
    if (disabled) return;
    clearTimeout(openTimeoutRef.current);
    closeTimeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, closeDelay);
  };

  const handleFocus = () => {
    if (disabled) return;
    setIsOpen(true);
    requestAnimationFrame(updatePosition);
  };

  const handleBlur = () => {
    if (disabled) return;
    setIsOpen(false);
  };

  useEffect(() => {
    if (isOpen) {
      updatePosition();
      window.addEventListener('scroll', updatePosition, { passive: true });
      window.addEventListener('resize', updatePosition);
    }
    return () => {
      window.removeEventListener('scroll', updatePosition);
      window.removeEventListener('resize', updatePosition);
      clearTimeout(openTimeoutRef.current);
      clearTimeout(closeTimeoutRef.current);
    };
  }, [isOpen, side, offset]);

  const child = React.Children.only(children);
  const childProps = child.props as Record<string, unknown>;

  const enhancedChild = React.cloneElement(child as React.ReactElement, {
    ref: triggerRef,
    onMouseEnter: (e: React.MouseEvent) => {
      childProps.onMouseEnter?.(e);
      handleMouseEnter();
    },
    onMouseLeave: (e: React.MouseEvent) => {
      childProps.onMouseLeave?.(e);
      handleMouseLeave();
    },
    onFocus: (e: React.FocusEvent) => {
      childProps.onFocus?.(e);
      handleFocus();
    },
    onBlur: (e: React.FocusEvent) => {
      childProps.onBlur?.(e);
      handleBlur();
    },
    'aria-describedby': isOpen ? 'tooltip-content' : undefined
  });

  const tooltipContent = isOpen ? (
    <div
      ref={tooltipRef}
      id="tooltip-content"
      role="tooltip"
      style={{
        position: 'fixed',
        top: position.top,
        left: position.left,
        zIndex: 1500
      }}
      className={cn(
        'bg-slate-900 text-slate-50 text-sm px-3 py-1.5 rounded-md shadow-xl',
        'whitespace-nowrap max-w-[300px] text-balance',
        'animate-in fade-in-100 zoom-in-95 duration-100',
        side === 'top' && 'animate-slide-in-from-bottom-2',
        side === 'bottom' && 'animate-slide-in-from-top-2',
        side === 'left' && 'animate-slide-in-from-right-2',
        side === 'right' && 'animate-slide-in-from-left-2'
      )}
    >
      {content}
      <div
        className={cn(
          'absolute w-2 h-2 bg-slate-900 rotate-45',
          side === 'top' && 'bottom-[-4px] left-1/2 -translate-x-1/2',
          side === 'bottom' && 'top-[-4px] left-1/2 -translate-x-1/2',
          side === 'left' && 'right-[-4px] top-1/2 -translate-y-1/2',
          side === 'right' && 'left-[-4px] top-1/2 -translate-y-1/2'
        )}
        aria-hidden="true"
      />
    </div>
  ) : null;

  return (
    <>
      {enhancedChild}
      {tooltipContent && createPortal(tooltipContent, document.body)}
    </>
  );
}

// Componente wrapper simple para uso rápido
export function SimpleTooltip({ content, children, ...props }: TooltipProps) {
  return <Tooltip content={content} {...props}>{children}</Tooltip>;
}