// @soluciona/design-system/src/molecules/CommandPalette/CommandPalette.tsx
// CommandPalette - Paleta de comandos (Cmd+K style)

'use client';

import { ReactNode, useState, useRef, useEffect, useMemo, createPortal } from 'react';
import { cn } from '@/utils/cn';
import { Input } from '@/atoms/Input';
import { Icon } from '@/atoms/Icon';
import { Search } from 'lucide-react';

interface CommandItem {
  id: string;
  label: string;
  description?: string;
  icon?: ReactNode;
  shortcut?: string;
  section?: string;
  onSelect: () => void;
  disabled?: boolean;
  keywords?: string[];
}

interface CommandPaletteProps {
  items: CommandItem[];
  placeholder?: string;
  title?: string;
  description?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSelect?: (item: CommandItem) => void;
}

export function CommandPalette({
  items,
  placeholder = 'Buscar comandos...',
  title,
  description,
  open: controlledOpen,
  onOpenChange,
  onSelect
}: CommandPaletteProps) {
  const [open, setOpen] = useState(controlledOpen ?? false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const isControlled = controlledOpen !== undefined;
  const isOpen = isControlled ? controlledOpen : open;

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [isOpen]);

  const filteredItems = useMemo(() => {
    if (!query) return items;
    const search = query.toLowerCase();
    return items.filter(item => {
      const label = item.label.toLowerCase();
      const desc = item.description?.toLowerCase() || '';
      const keywords = item.keywords?.join(' ').toLowerCase() || '';
      return label.includes(search) || desc.includes(search) || keywords.includes(search);
    });
  }, [items, query]);

  const groupedItems = useMemo(() => {
    const groups: Record<string, CommandItem[]> = {};
    filteredItems.forEach(item => {
      const section = item.section || 'General';
      if (!groups[section]) groups[section] = [];
      groups[section].push(item);
    });
    return groups;
  }, [filteredItems]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const visibleItems = filteredItems.filter(item => !item.disabled);
    if (visibleItems.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, visibleItems.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        const selectedItem = visibleItems[selectedIndex];
        if (selectedItem && !selectedItem.disabled) {
          selectedItem.onSelect();
          onSelect?.(selectedItem);
          setOpen(false);
        }
        break;
      case 'Escape':
        setOpen(false);
        break;
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[var(--z-toast)] flex items-center justify-center p-4" onClick={() => setOpen(false)}>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in-200" onClick={() => setOpen(false)} aria-hidden="true" />
      <div
        className="w-full max-w-2xl bg-bg-surface rounded-xl border border-border-default shadow-xl animate-in fade-in-200 zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="p-4 border-b border-border-default">
          {(title || description) && (
            <div className="mb-3">
              {title && <h2 className="text-lg font-semibold text-text-primary">{title}</h2>}
              {description && <p className="text-sm text-text-tertiary mt-1">{description}</p>}
            </div>
          )}
          <div className="relative">
            <Icon icon={Search} size="sm" className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
            <Input
              ref={inputRef}
              placeholder={placeholder}
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="pl-10"
              size="lg"
            />
          </div>
        </div>

        <div className="max-h-[400px] overflow-y-auto">
          {Object.entries(
            filteredItems.reduce((acc, item) => {
              const section = item.section || 'General';
              if (!acc[section]) acc[section] = [];
              acc[section].push(item);
              return acc;
            }, {} as Record<string, typeof items>)
          ).map(([section, sectionItems]) => (
            <div key={section} className="border-t border-border-default">
              <div className="px-3 py-1.5 text-xs font-medium text-text-tertiary uppercase tracking-wider bg-bg-elevated/50">
                {section}
              </div>
              {sectionItems.map((item, index) => (
                <button
                  key={item.id}
                  onClick={() => {
                    if (!item.disabled) {
                      item.onSelect();
                      onSelect?.(item);
                      setOpen(false);
                    }
                  }}
                  disabled={item.disabled}
                  className="w-full px-3 py-2.5 text-left text-sm flex items-center gap-3 hover:bg-bg-input-hover transition-colors first:rounded-t-lg last:rounded-b-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  role="menuitem"
                >
                  {item.icon && <span className="w-5 h-5 flex-shrink-0 text-text-tertiary">{item.icon}</span>}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-text-primary truncate">{item.label}</p>
                    {item.description && <p className="text-xs text-text-tertiary truncate">{item.description}</p>}
                  </div>
                  {item.shortcut && (
                    <span className="px-2 py-0.5 text-xs font-mono text-text-tertiary bg-bg-input-hover rounded">
                      {item.shortcut}
                    </span>
                  )}
                </button>
              ))}
            </div>
          ))}
        </div>

        {filteredItems.length === 0 && (
          <div className="px-4 py-8 text-center text-text-tertiary">
            <p>No se encontraron comandos</p>
            <p className="text-xs mt-1">Intenta con otros términos de búsqueda</p>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

export function useCommandPalette() {
  const [open, setOpen] = useState(false);
  return { open, setOpen, toggle: () => setOpen(p => !p) };
}