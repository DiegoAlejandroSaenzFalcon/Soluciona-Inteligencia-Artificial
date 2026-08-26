// @soluciona/design-system/src/utils/a11y.ts
// Utilidades de accesibilidad

/**
 * Genera IDs únicos para asociación label-input, aria-describedby, etc.
 */
export function generateId(prefix = 'soluciona'): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Genera múltiples IDs relacionados
 */
export function generateIds(prefix: string, count: number): string[] {
  return Array.from({ length: count }, (_, i) => `${prefix}-${i}-${Math.random().toString(36).slice(2, 6)}`);
}

/**
 * Maneja focus management para modales/drawers
 */
export function trapFocus(element: HTMLElement): () => void {
  const focusableElements = element.querySelectorAll<HTMLElement>(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];

  function handleTab(e: KeyboardEvent) {
    if (e.key !== 'Tab') return;

    if (e.shiftKey) {
      if (document.activeElement === firstElement) {
        e.preventDefault();
        lastElement?.focus();
      }
    } else {
      if (document.activeElement === lastElement) {
        e.preventDefault();
        firstElement?.focus();
      }
    }
  }

  element.addEventListener('keydown', handleTab);
  firstElement?.focus();

  return () => {
    element.removeEventListener('keydown', handleTab);
  };
}

/**
 * Anuncia cambios a screen readers (aria-live)
 */
export function announce(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
  const announcer = document.getElementById('soluciona-announcer') || createAnnouncer();
  announcer.setAttribute('aria-live', priority);
  announcer.textContent = '';
  // Forzar re-render
  requestAnimationFrame(() => {
    announcer.textContent = message;
  });
}

function createAnnouncer(): HTMLElement {
  const announcer = document.createElement('div');
  announcer.id = 'soluciona-announcer';
  announcer.setAttribute('role', 'status');
  announcer.setAttribute('aria-live', 'polite');
  announcer.setAttribute('aria-atomic', 'true');
  announcer.style.cssText = `
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  `;
  document.body.appendChild(announcer);
  return announcer;
}

/**
 * Hook para keyboard shortcuts globales
 */
export function useKeyboardShortcut(
  key: string,
  callback: () => void,
  options: { ctrl?: boolean; shift?: boolean; alt?: boolean; meta?: boolean; preventDefault?: boolean } = {}
) {
  // Este hook se implementaría en el cliente
  // Aquí solo definimos la estructura
  return { key, callback, options };
}

/**
 * Verifica si un elemento está visible en viewport
 */
export function isElementVisible(element: HTMLElement): boolean {
  const rect = element.getBoundingClientRect();
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  );
}

/**
 * Scroll suave a elemento
 */
export function scrollToElement(element: HTMLElement, options: ScrollIntoViewOptions = { behavior: 'smooth', block: 'center' }): void {
  element.scrollIntoView(options);
}

/**
 * Obtiene el primer elemento enfocable dentro de un contenedor
 */
export function getFirstFocusable(container: HTMLElement): HTMLElement | null {
  const focusable = container.querySelectorAll<HTMLElement>(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  return focusable[0] || null;
}

/**
 * Obtiene el último elemento enfocable dentro de un contenedor
 */
export function getLastFocusable(container: HTMLElement): HTMLElement | null {
  const focusable = container.querySelectorAll<HTMLElement>(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  return focusable[focusable.length - 1] || null;
}