// @soluciona/design-system/src/primitives/Portal.tsx
// Portal para renderizar hijos en un nodo DOM diferente (modales, tooltips, toasts)

'use client';

import { createPortal, ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';

interface PortalProps {
  children: ReactNode;
  container?: HTMLElement | null;
  /**
   * ID del contenedor donde montar el portal
   * Si no existe, se crea automáticamente
   */
  containerId?: string;
}

/**
 * Portal - Renderiza hijos en un nodo DOM diferente
 * 
 * @description
 * Útil para modales, tooltips, toasts, dropdowns que necesitan
 * escapar del stacking context o overflow del padre.
 * 
 * @example
 * ```tsx
 * <Portal containerId="toast-container">
 *   <Toast>Mensaje</Toast>
 * </Portal>
 * ```
 */
export function Portal({ children, container: containerProp, containerId = 'soluciona-portal-root' }: PortalProps) {
  const [container, setContainer] = useState<HTMLElement | null>(containerProp ?? null);
  const containerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Buscar o crear contenedor
    let targetContainer = containerProp ?? document.getElementById(containerId);

    if (!targetContainer) {
      targetContainer = document.createElement('div');
      targetContainer.id = containerId;
      document.body.appendChild(targetContainer);
    }

    setContainer(targetContainer);
    containerRef.current = targetContainer;

    return () => {
      // Limpiar solo si nosotros lo creamos
      if (!containerProp && targetContainer && targetContainer.parentNode) {
        // Solo eliminar si está vacío
        if (targetContainer.children.length === 0) {
          targetContainer.remove();
        }
      }
    };
  }, [containerProp, containerId]);

  if (!container) return null;

  return createPortal(children, container);
}

// Portal especializado para toasts
export function ToastPortal({ children }: { children: ReactNode }) {
  return <Portal containerId="soluciona-toast-root">{children}</Portal>;
}

// Portal especializado para modales
export function ModalPortal({ children }: { children: ReactNode }) {
  return <Portal containerId="soluciona-modal-root">{children}</Portal>;
}

// Portal especializado para tooltips/popovers
export function TooltipPortal({ children }: { children: ReactNode }) {
  return <Portal containerId="soluciona-tooltip-root">{children}</Portal>;
}