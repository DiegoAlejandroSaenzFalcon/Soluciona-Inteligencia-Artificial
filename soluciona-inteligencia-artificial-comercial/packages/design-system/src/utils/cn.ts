// @soluciona/design-system/src/utils/cn.ts
// Utilidad para combinar classNames - clsx + tailwind-merge

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Combina classNames inteligentemente
 * - clsx: maneja condicionales, arrays, objetos
 * - tailwind-merge: resuelve conflictos de Tailwind (último gana)
 * 
 * @example
 * ```tsx
 * cn('base-class', condition && 'conditional-class', { 'active-class': isActive })
 * cn('p-4 md:p-6', 'p-2') // => 'md:p-6 p-2' (p-4 sobrescrito por p-2)
 * ```
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}