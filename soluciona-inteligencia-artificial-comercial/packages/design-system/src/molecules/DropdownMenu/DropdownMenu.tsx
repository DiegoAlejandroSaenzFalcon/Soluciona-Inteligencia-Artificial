// @soluciona/design-system/src/molecules/DropdownMenu/DropdownMenu.tsx
// DropdownMenu - Menú desplegable accesible

'use client';

import { forwardRef, ReactNode, useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/utils/cn';
import { Button } from '@/atoms/Button';
import { Checkbox } from '@/atoms/Checkbox';
import { Separator } from '@/atoms/Separator';
import { Icon } from '@/atoms/Icon';
import { ChevronDown, Check } from 'lucide-react';

interface DropdownMenuItem {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  icon?: ReactNode;
  shortcut?: string;
  destructive?: boolean;
  checked?: boolean;
  subItems?: DropdownMenuItem[];
}

interface DropdownMenuProps {
  /** Elemento trigger */
  trigger: ReactNode;
  /** Items del menú */
  items: DropdownMenuItem[];
  /** Posición */
  side?: 'top' | 'right' | 'bottom' | 'left';
  /** Alineación */
  align?: 'start' | 'center' | 'end';
  /** Offset */
  offset?: number;
}

function DropdownMenuContent({ items, onClose, ...props }: any) {
  return (
    <div
      className="bg-bg-surface rounded-lg border border-border-default shadow-xl min-w-[200px] py-1.5 shadow-lg animate-in fade-in-100 zoom-in-95 duration-100"
      role="menu"
      {...props}
    >
      {items.map((item, index) => {
        if (item === 'separator') {
          return <Separator key={`sep-${index}`} />;
        }
        if (item.subItems && item.subItems.length > 0) {
          return (
            <div key={index} className="relative">
              <button
                className={cn(
                  'w-full px-3 py-2 text-left text-sm flex items-center gap-2',
                  'hover:bg-bg-input-hover text-text-primary',
                  item.disabled && 'opacity-50 cursor-not-allowed'
                )}
                role="menuitem"
                aria-haspopup="true"
                aria-expanded="false"
                disabled={item.disabled}
              >
                {item.icon && <span className="w-5 h-5 flex-shrink-0">{item.icon}</span>}
                <span className="flex-1">{item.label}</span>
                {item.shortcut && <span className="text-xs text-text-tertiary">{item.shortcut}</span>}
                <Icon icon={ChevronRight} size="xs" className="ml-auto" />
              </button>
            </div>
          );
        }
        return (
          <button
            key={index}
            onClick={() => { item.onClick(); onClose(); }}
            disabled={item.disabled}
            className={cn(
              'w-full px-3 py-2 text-left text-sm flex items-center gap-2',
              'hover:bg-bg-input-hover',
              item.destructive ? 'text-rose-500 hover:bg-rose-500/10' : 'text-text-primary',
              item.disabled && 'opacity-50 cursor-not-allowed'
            )}
            role="menuitem"
            aria-checked={item.checked}
            disabled={item.disabled}
          >
            {item.checked && <Icon icon={Check} size="xs" className="text-brand-primary" />}
            {item.icon && <span className="w-5 h-5 flex-shrink-0">{item.icon}</span>}
            <span className="flex-1">{item.label}</span>
            {item.shortcut && <span className="text-xs text-text-tertiary ml-auto">{item.shortcut}</span>}
          </button>
        );
      })}
    </div>
  );
}

export function DropdownMenu({ trigger, items, side = 'bottom', align = 'start', offset = 4 }: DropdownMenuProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (triggerRef.current?.contains(e.target) || contentRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleTriggerClick = () => setOpen(!open);
  const handleTriggerKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setOpen(true);
    }
    if (e.key === 'Escape') setOpen(false);
  };

  if (!open) {
    return (
      <div className="relative inline-block">
        {React.cloneElement(trigger as React.ReactElement<any>, {
          ref: triggerRef,
          onClick: handleTriggerClick,
          onKeyDown: handleTriggerKeyDown,
          'aria-haspopup': 'menu',
          'aria-expanded': false
        })}
      </div>
    );
  }

  return createPortal(
    <div className="fixed z-[var(--z-dropdown)]">
      <div className="fixed inset-0" onClick={() => setOpen(false)} aria-hidden="true" />
      <div
        ref={contentRef}
        className={cn(
          'bg-bg-surface rounded-lg border border-border-default shadow-xl min-w-[200px] py-1.5',
          'animate-in fade-in-100 zoom-in-95 duration-100',
          'fixed z-[var(--z-dropdown)]'
        )}
        style={{
          // Posicionamiento simplificado
          top: '100%',
          left: 0,
          marginTop: 4
        }}
        role="menu"
        aria-orientation="vertical"
      >
        {items.map((item, index) => {
          if (item === 'separator') {
            return <Separator key={`sep-${index}`} />;
          }
          return (
            <button
              key={index}
              onClick={() => { item.onClick(); setOpen(false); }}
              disabled={item.disabled}
              className={cn(
                'w-full px-3 py-2 text-left text-sm flex items-center gap-2',
                'hover:bg-bg-input-hover',
                item.destructive ? 'text-rose-500 hover:bg-rose-500/10' : 'text-text-primary',
                item.disabled && 'opacity-50 cursor-not-allowed'
              )}
              role="menuitem"
              aria-checked={item.checked}
              disabled={item.disabled}
            >
              {item.checked && <Icon icon={Check} size="xs" className="text-brand-primary" />}
              {item.icon && <span className="w-5 h-5 flex-shrink-0">{item.icon}</span>}
              <span className="flex-1">{item.label}</span>
              {item.shortcut && <span className="text-xs text-text-tertiary ml-auto">{item.shortcut}</span>}
            </button>
          );
        })}
      </div>
    </div>,
    document.body
  );
}

export function DropdownMenuTrigger({ children, className }: { children: ReactNode; className?: string }) {
  return <Button variant="ghost" className={cn('relative', className)}>{children}</Button>;
}

export function DropdownMenuItem({ children, onClick, disabled, className, ...props }: any) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-bg-input-hover text-text-primary disabled:opacity-50 disabled:cursor-not-allowed"
      role="menuitem"
      className={className}
      {...props}
    >
      {children}
    </button>
  );
}