// @soluciona/design-system/src/atoms/Icon/Icon.tsx
// Icon - Wrapper para iconos Lucide con tamaño y color consistentes

'use client';

import { forwardRef, SVGAttributes } from 'react';
import { cn } from '@/utils/cn';

interface IconProps extends Omit<SVGAttributes<SVGSVGElement>, 'width' | 'height'> {
  /** Componente de icono Lucide */
  icon: React.ElementType;
  /** Tamaño */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number;
  /** Color (usa currentColor por defecto) */
  color?: string;
  /** Clase adicional */
  className?: string;
  /** Título para accesibilidad */
  title?: string;
  /** ID para aria-labelledby */
  titleId?: string;
  /** Descripción para accesibilidad */
  desc?: string;
  /** ID para aria-describedby */
  descId?: string;
}

const sizeMap = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 20,
  xl: 24
};

export const Icon = forwardRef<SVGSVGElement, IconProps>(
  (
    {
      icon: IconComponent,
      size = 'md',
      color = 'currentColor',
      className,
      title,
      titleId,
      desc,
      descId,
      ...props
    },
    ref
  ) => {
    const computedSize = typeof size === 'number' ? size : sizeMap[size];

    const titleIdGenerated = title ? `icon-title-${Math.random().toString(36).slice(2, 9)}` : undefined;
    const descIdGenerated = desc ? `icon-desc-${Math.random().toString(36).slice(2, 9)}` : undefined;

    const finalTitleId = titleId || titleIdGenerated;
    const finalDescId = descId || descIdGenerated;

    return (
      <IconComponent
        ref={ref}
        width={computedSize}
        height={computedSize}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={cn('flex-shrink-0', className)}
        aria-hidden={!title && !desc}
        aria-labelledby={title ? finalTitleId : undefined}
        aria-describedby={desc ? finalDescId : undefined}
        {...props}
      >
        {title && <title id={finalTitleId}>{title}</title>}
        {desc && <desc id={finalDescId}>{desc}</desc>}
      </IconComponent>
    );
  }
);

Icon.displayName = 'Icon';

/**
 * Iconos de utilidad comúnmente usados
 */
export const Icons = {
  // Navegación
  ChevronLeft: 'lucide-react/ChevronLeft',
  ChevronRight: 'lucide-react/ChevronRight',
  ChevronUp: 'lucide-react/ChevronUp',
  ChevronDown: 'lucide-react/ChevronDown',

  // Acciones
  Search: 'lucide-react/Search',
  Filter: 'lucide-react/Filter',
  Settings: 'lucide-react/Settings',
  Edit: 'lucide-react/Edit',
  Delete: 'lucide-react/Trash2',
  Add: 'lucide-react/Plus',
  Download: 'lucide-react/Download',
  Upload: 'lucide-react/Upload',
  Copy: 'lucide-react/Copy',
  Share: 'lucide-react/Share2',
  Print: 'lucide-react/Printer',
  Save: 'lucide-react/Save',
  Cancel: 'lucide-react/X',
  Check: 'lucide-react/Check',
  Close: 'lucide-react/X',
  MoreHorizontal: 'lucide-react/MoreHorizontal',
  MoreVertical: 'lucide-react/MoreVertical',

  // Navegación app
  Home: 'lucide-react/Home',
  Dashboard: 'lucide-react/LayoutDashboard',
  Users: 'lucide-react/Users',
  User: 'lucide-react/User',
  Inbox: 'lucide-react/Inbox',
  Calendar: 'lucide-react/Calendar',
  Settings: 'lucide-react/Settings',
  Help: 'lucide-react/HelpCircle',

  // Estados
  CheckCircle: 'lucide-react/CheckCircle',
  AlertCircle: 'lucide-react/AlertCircle',
  AlertTriangle: 'lucide-react/AlertTriangle',
  Info: 'lucide-react/Info',
  Loader: 'lucide-react/Loader2',
  Check: 'lucide-react/Check',
  X: 'lucide-react/X',

  // Comercio
  ShoppingCart: 'lucide-react/ShoppingCart',
  CreditCard: 'lucide-react/CreditCard',
  DollarSign: 'lucide-react/DollarSign',
  Receipt: 'lucide-react/Receipt',
  Invoice: 'lucide-react/FileText',
  Package: 'lucide-react/Package',
  Truck: 'lucide-react/Truck',

  // Comunicación
  Mail: 'lucide-react/Mail',
  MessageSquare: 'lucide-react/MessageSquare',
  Phone: 'lucide-react/Phone',
  Send: 'lucide-react/Send',
  Bell: 'lucide-react/Bell',
  BellOff: 'lucide-react/BellOff',

  // Tiempo
  Clock: 'lucide-react/Clock',
  Calendar: 'lucide-react/Calendar',
  CalendarDays: 'lucide-react/CalendarDays',

  // Archivos
  File: 'lucide-react/File',
  FileText: 'lucide-react/FileText',
  FileImage: 'lucide-react/FileImage',
  FilePdf: 'lucide-react/FileType',
  Folder: 'lucide-react/Folder',
  FolderOpen: 'lucide-react/FolderOpen',

  // UI
  Eye: 'lucide-react/Eye',
  EyeOff: 'lucide-react/EyeOff',
  Lock: 'lucide-react/Lock',
  Unlock: 'lucide-react/Unlock',
  Key: 'lucide-react/Key',
  Shield: 'lucide-react/Shield',
  Globe: 'lucide-react/Globe',
  Language: 'lucide-react/Languages',
  Menu: 'lucide-react/Menu',
  X: 'lucide-react/X',
  ChevronRight: 'lucide-react/ChevronRight',
  ChevronLeft: 'lucide-react/ChevronLeft',
  ChevronUp: 'lucide-react/ChevronUp',
  ChevronDown: 'lucide-react/ChevronDown'
} as const;

export type IconName = keyof typeof Icons;