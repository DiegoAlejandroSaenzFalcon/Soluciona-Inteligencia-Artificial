// @soluciona/design-system/src/molecules/Tabs/Tabs.tsx
// Tabs - Pestañas accesibles con lazy loading

'use client';

import { forwardRef, ReactNode, useState, useRef, useEffect } from 'react';
import { cn } from '@/utils/cn';
import { Button } from '@/atoms/Button';
import { Icon } from '@/atoms/Icon';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface TabItem {
  id: string;
  label: string;
  icon?: ReactNode;
  disabled?: boolean;
  badge?: string | number;
}

interface TabsProps {
  tabs: TabItem[];
  defaultTab?: string;
  onChange?: (tabId: string) => void;
  variant?: 'line' | 'pills' | 'enclosed';
  orientation?: 'horizontal' | 'vertical';
  lazy?: boolean;
  className?: string;
}

export function Tabs({
  tabs,
  defaultTab,
  onChange,
  variant = 'line',
  orientation = 'horizontal',
  lazy = false,
  className
}: TabsProps) {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id);
  const tabsRef = useRef<HTMLDivElement>(null);

  const handleTabClick = (tabId: string) => {
    const tab = tabs.find(t => t.id === tabId);
    if (tab?.disabled) return;
    setActiveTab(tabId);
    onChange?.(tabId);
  };

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    const enabledTabs = tabs.filter(t => !t.disabled);
    const currentIndex = enabledTabs.findIndex(t => t.id === activeTab);
    let nextIndex = currentIndex;

    if (orientation === 'horizontal') {
      if (e.key === 'ArrowRight') nextIndex = (currentIndex + 1) % enabledTabs.length;
      if (e.key === 'ArrowLeft') nextIndex = (currentIndex - 1 + enabledTabs.length) % enabledTabs.length;
    } else {
      if (e.key === 'ArrowDown') nextIndex = (currentIndex + 1) % enabledTabs.length;
      if (e.key === 'ArrowUp') nextIndex = (currentIndex - 1 + enabledTabs.length) % enabledTabs.length;
    }
    if (e.key === 'Home') nextIndex = 0;
    if (e.key === 'End') nextIndex = enabledTabs.length - 1;

    if (nextIndex !== currentIndex) {
      e.preventDefault();
      setActiveTab(enabledTabs[nextIndex].id);
      onChange?.(enabledTabs[nextIndex].id);
    }
  };

  const variantStyles = {
    line: {
      container: 'border-b border-border-default',
      tab: 'relative px-4 py-3 text-sm font-medium transition-colors',
      active: 'text-brand-primary',
      inactive: 'text-text-tertiary hover:text-text-secondary',
      indicator: 'absolute bottom-0 left-0 h-0.5 bg-brand-primary transition-transform duration-200 ease-out'
    },
    pills: {
      container: '',
      tab: 'px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
      active: 'bg-brand-primary text-brand-on-primary shadow-sm',
      inactive: 'text-text-tertiary hover:bg-bg-input-hover hover:text-text-primary'
    },
    enclosed: {
      container: 'border border-border-default rounded-lg bg-bg-elevated p-1',
      tab: 'px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
      active: 'bg-bg-surface text-text-primary shadow-sm',
      inactive: 'text-text-tertiary hover:text-text-secondary hover:bg-bg-input-hover'
    }
  };

  const styles = variantStyles[variant];

  return (
    <div className={cn(className)}>
      <div
        ref={tabsRef}
        role="tablist"
        aria-orientation={orientation}
        className={cn(
          'flex gap-1',
          orientation === 'vertical' && 'flex-col',
          styles.container
        )}
      >
        {tabs.map((tab, index) => (
          <button
            key={tab.id}
            role="tab"
            id={`tab-${tab.id}`}
            aria-selected={activeTab === tab.id}
            aria-controls={`panel-${tab.id}`}
            aria-disabled={tab.disabled}
            tabIndex={activeTab === tab.id ? 0 : -1}
            disabled={tab.disabled}
            onClick={() => !tab.disabled && handleTabClick(tab.id)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            className={cn(
              styles.tab,
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2',
              activeTab === tab.id ? styles.active : styles.inactive,
              tab.disabled && 'opacity-50 cursor-not-allowed',
              orientation === 'vertical' && 'w-full justify-start'
            )}
          >
            {tab.icon && <span className="flex-shrink-0 mr-2">{tab.icon}</span>}
            {tab.label}
            {tab.badge && (
              <span className="ml-2 px-1.5 py-0.5 text-xs font-medium rounded-full bg-brand-primary/10 text-brand-primary">
                {tab.badge}
              </span>
            )}
          </button>
        ))}
        {variant === 'line' && (
          <div
            className={cn(
              styles.indicator,
              activeTab && `w-[${document.getElementById(`tab-${activeTab}`)?.offsetWidth || 0}px]`
            )}
            style={{
              transform: `translateX(${document.getElementById(`tab-${activeTab}`)?.offsetLeft || 0}px)`
            }}
            aria-hidden="true"
          />
        )}
      </div>

      <div className="mt-4">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            role="tabpanel"
            id={`panel-${tab.id}`}
            aria-labelledby={`tab-${tab.id}`}
            hidden={activeTab !== tab.id}
            tabIndex={0}
          >
            {lazy ? activeTab === tab.id && tab.children : tab.children}
          </div>
        ))}
      </div>
    </div>
  );
}