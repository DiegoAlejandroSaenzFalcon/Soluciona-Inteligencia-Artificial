// @soluciona/design-system/src/organisms/AppHeader/AppHeader.tsx
// AppHeader - Cabecera principal de la aplicación

'use client';

import { ReactNode, useState } from 'react';
import { cn } from '@/utils/cn';
import { Button } from '@/atoms/Button';
import { Input } from '@/atoms/Input';
import { Avatar } from '@/atoms/Avatar';
import { DropdownMenu } from '@/molecules/DropdownMenu';
import { Badge } from '@/atoms/Badge';
import { Icon } from '@/atoms/Icon';
import { Search, Bell, ChevronDown, Menu, X, Sun, Moon, Settings, User, LogOut, Keyboard } from 'lucide-react';

interface AppHeaderProps {
  logo?: ReactNode;
  title?: string;
  navigation?: Array<{ label: string; href: string; icon?: ReactNode }>;
  user?: {
    name: string;
    email: string;
    avatar?: string;
    role?: string;
  };
  notifications?: Array<{
    id: string;
    title: string;
    message: string;
    time: string;
    read: boolean;
    type: 'info' | 'success' | 'warning' | 'error';
  }>;
  onSearch?: (query: string) => void;
  onLogout?: () => void;
  mobile?: boolean;
  onSidebarToggle?: () => void;
  sidebarOpen?: boolean;
}

export function AppHeader({
  logo,
  title = 'Soluciona IA',
  navigation = [],
  user,
  notifications = [],
  onSearch,
  onLogout,
  mobile = false,
  onSidebarToggle,
  sidebarOpen
}: AppHeaderProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    onSearch?.(e.target.value);
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-[var(--z-sticky)] bg-bg-surface/80 backdrop-blur-lg border-b border-border-default transition-all duration-200">
      <div className="max-w-full mx-auto px-4 h-16 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-bold text-xl text-text-primary hidden sm:block">
              {title}
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-1" aria-label="Navegación principal">
            {navigation.map((item, index) => (
              <button
                key={index}
                className="px-3 py-1.5 text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-bg-input-hover rounded-md transition-colors"
              >
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="flex-1 max-w-xl mx-4 hidden lg:block">
          <input
            placeholder="Buscar comandos, facturas, clientes... (Cmd+K)"
            value={searchQuery}
            onChange={e => { setSearchQuery(e.target.value); onSearch?.(e.target.value); }}
            className="w-96 px-4 py-2 text-sm bg-bg-input border border-border-default rounded-md text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/40"
          />
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => {}}
            className="p-2 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-bg-input-hover transition-colors"
            aria-label="Cambiar tema"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M12 7a5 5 0 110 10 5 5 0 010-10z" /></svg>
          </button>

          <div className="relative">
            <button className="relative p-2 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-bg-input-hover transition-colors" aria-label="Notificaciones">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
            </button>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-brand-primary/10 flex items-center justify-center">
              <span className="text-sm font-medium text-brand-primary">JA</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

export default AppHeader;