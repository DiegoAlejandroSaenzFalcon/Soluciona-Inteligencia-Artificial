// @soluciona/design-system/src/organisms/AppSidebar/AppSidebar.tsx
// AppSidebar - Sidebar de navegación colapsable

'use client';

import { ReactNode, useState, useEffect } from 'react';
import { cn } from '@/utils/cn';
import { Button } from '@/atoms/Button';
import { Avatar } from '@/atoms/Avatar';
import { Badge } from '@/atoms/Badge';
import { Icon } from '@/atoms/Icon';
import { ChevronLeft, ChevronRight, X, User, Settings, LogOut, Home, LayoutDashboard, Package, CreditCard, Users, Shield, HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';

interface NavItem {
  id: string;
  label: string;
  icon?: ReactNode;
  href?: string;
  onClick?: () => void;
  badge?: string | number;
  badgeVariant?: 'default' | 'success' | 'warning' | 'danger';
  children?: NavItem[];
  disabled?: boolean;
  roles?: string[];
}

interface AppSidebarProps {
  items: NavItem[];
  collapsed?: boolean;
  onToggle?: (collapsed: boolean) => void;
  user?: {
    name: string;
    email: string;
    avatar?: string;
    role?: string;
  };
  onLogout?: () => void;
  className?: string;
  mobile?: boolean;
  open?: boolean;
  onClose?: () => void;
}

export function AppSidebar({
  items,
  collapsed = false,
  onToggle,
  user,
  onLogout,
  className,
  mobile = false,
  open = true,
  onClose
}: AppSidebarProps) {
  const [internalCollapsed, setInternalCollapsed] = useState(collapsed);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const isCollapsed = collapsed ?? internalCollapsed;

  useEffect(() => {
    setInternalCollapsed(collapsed);
  }, [collapsed]);

  const toggleItem = (id: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleItemClick = (item: NavItem) => {
    if (item.disabled) return;
    if (item.children && item.children.length > 0) {
      toggleItem(item.id);
    } else if (item.onClick) {
      item.onClick();
    }
  };

  const toggleCollapse = () => {
    const next = !isCollapsed;
    setInternalCollapsed(next);
    onToggle?.(next);
  };

  if (mobile && !open) return null;

  return (
    <>
      {mobile && (
        <div
          className="fixed inset-0 z-[var(--z-overlay)] bg-black/50 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          'fixed top-16 left-0 bottom-0 z-[var(--z-sticky)] bg-bg-surface border-r border-border-default',
          'transition-all duration-300 ease-in-out',
          'flex flex-col',
          'lg:translate-x-0',
          !isCollapsed ? 'w-64' : 'w-20',
          isCollapsed && 'lg:w-20',
          mobile && 'fixed inset-y-0 left-0 z-[var(--z-modal)] w-64',
          'transform transition-transform duration-300 ease-in-out',
          mobile && !open && '-translate-x-full',
          mobile && open && 'translate-x-0',
          className
        )}
        style={{ height: 'calc(100vh - 4rem)' }}
      >
        {/* Header del sidebar */}
        <div className="flex items-center justify-between h-14 px-3 border-b border-border-default">
          {!isCollapsed && (
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg text-text-primary">Soluciona IA</span>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleCollapse}
            aria-label={isCollapsed ? 'Expandir sidebar' : 'Colapsar sidebar'}
            className={cn('p-1', !isCollapsed && 'ml-auto')}
          >
            <Icon
              icon={isCollapsed ? require('lucide-react').ChevronRight : require('lucide-react').ChevronLeft}
              size="sm"
            />
          </Button>
        </div>

        {/* Navegación */}
        <nav className="flex-1 overflow-y-auto py-3 px-2" aria-label="Navegación principal">
          <ul className="space-y-1" role="list">
            {items.map((item) => (
              <NavItem
                key={item.id}
                item={item}
                collapsed={isCollapsed}
                expanded={expandedItems.has(item.id)}
                onToggle={toggleItem}
                onClick={handleItemClick}
                level={0}
              />
            ))}
          </ul>
        </nav>

        {/* Footer con usuario */}
        <div className="p-3 border-t border-border-default">
          <div className="flex items-center gap-3">
            <Avatar
              size="sm"
              src={user?.avatar}
              alt={user?.name}
              fallback={user?.name?.charAt(0).toUpperCase()}
            />
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary truncate">{user?.name}</p>
                <p className="text-xs text-text-tertiary truncate">{user?.role || user?.email}</p>
              </div>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={onLogout}
              aria-label="Cerrar sesión"
              className={cn('p-1', isCollapsed && 'mx-auto')}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </Button>
          </div>
        </div>
      </aside>
    </>
  );
}

function NavItem({ item, collapsed, expanded, onToggle, onClick, level }: any) {
  const hasChildren = item.children && item.children.length > 0;
  const isExpanded = expanded.has(item.id);

  if (collapsed && !item.icon) return null;

  if (hasChildren) {
    const isExpanded = expanded.has(item.id);
    return (
      <li>
        <button
          onClick={() => onToggle(item.id)}
          className={cn(
            'w-full flex items-center gap-2 px-2 py-2 rounded-lg text-sm font-medium transition-colors',
            'hover:bg-bg-input-hover text-text-secondary',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary'
          )}
          aria-expanded={isExpanded}
          aria-controls={`submenu-${item.id}`}
        >
          {item.icon && <span className="w-5 h-5 flex-shrink-0">{item.icon}</span>}
          {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
          {!collapsed && (
            <svg className={cn('w-4 h-4 flex-shrink-0 transition-transform duration-200', isExpanded && 'rotate-180')} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          )}
        </button>
        {isExpanded && !collapsed && (
          <ul id={`submenu-${item.id}`} role="list" className="mt-1 space-y-1 pl-6 border-l border-border-subtle">
            {item.children?.map(child => (
              <li key={child.id}>
                <button
                  onClick={() => { if (!child.disabled) { /* handle click */ } }}
                  disabled={child.disabled}
                  className={cn(
                    'w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm',
                    'text-text-tertiary hover:text-text-primary hover:bg-bg-input-hover',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary',
                    child.disabled && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  {child.icon && <span className="w-4 h-4">{child.icon}</span>}
                  <span className="truncate">{child.label}</span>
                  {child.badge && <span className="ml-auto">{child.badge}</span>}
                </button>
              </li>
            ))}
          </ul>
        )}
      </li>
    );
  }

  return (
    <li>
      <button
        onClick={() => { if (!item.disabled) { /* handle click */ } }}
        disabled={item.disabled}
        className={cn(
          'w-full flex items-center gap-2 px-2 py-2 rounded-lg text-sm font-medium transition-colors',
          'hover:bg-bg-input-hover text-text-secondary',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary',
          'disabled:opacity-50 disabled:cursor-not-allowed'
        )}
      >
        {item.icon && <span className="w-5 h-5 flex-shrink-0">{item.icon}</span>}
        {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
        {item.badge && (
          <span className="ml-auto px-1.5 py-0.5 text-xs font-medium rounded-full bg-brand-primary/10 text-brand-primary">
            {item.badge}
          </span>
        )}
      </button>
    </li>
  );
}