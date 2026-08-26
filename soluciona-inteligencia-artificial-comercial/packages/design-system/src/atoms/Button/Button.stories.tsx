// @soluciona/design-system/src/atoms/Button/Button.stories.tsx
// Storybook stories para Button

import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './Button';
import { Download, Mail, AlertCircle, ChevronRight } from 'lucide-react';

const meta: Meta<typeof Button> = {
  title: 'Atoms/Button',
  component: Button,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Botón accesible con variantes semánticas, tamaños, estados de carga y soporte para iconos.'
      }
    }
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'ghost', 'danger', 'outline', 'link'],
      description: 'Variante semántica del botón'
    },
    size: {
      control: 'select',
      options: ['xs', 'sm', 'md', 'lg', 'xl'],
      description: 'Tamaño del botón'
    },
    fullWidth: {
      control: 'boolean',
      description: 'Ocupa todo el ancho disponible'
    },
    loading: {
      control: 'boolean',
      description: 'Estado de carga (desactiva el botón)'
    },
    disabled: {
      control: 'boolean',
      description: 'Desactiva el botón'
    },
    startIcon: {
      control: false,
      description: 'Icono al inicio del texto'
    },
    endIcon: {
      control: false,
      description: 'Icono al final del texto'
    }
  }
};

export default meta;
type Story = StoryObj<typeof Button>;

// Variante primaria
export const Primary: Story = {
  args: {
    children: 'Botón primario',
    variant: 'primary'
  }
};

// Variante secundaria
export const Secondary: Story = {
  args: {
    children: 'Botón secundario',
    variant: 'secondary'
  }
};

// Variante ghost
export const Ghost: Story = {
  args: {
    children: 'Botón ghost',
    variant: 'ghost'
  }
};

// Variante danger
export const Danger: Story = {
  args: {
    children: 'Eliminar',
    variant: 'danger'
  }
};

// Variante outline
export const Outline: Story = {
  args: {
    children: 'Botón outline',
    variant: 'outline'
  }
};

// Variante link
export const Link: Story = {
  args: {
    children: 'Enlace estilo botón',
    variant: 'link'
  }
};

// Todos los tamaños
export const AllSizes: Story = {
  render: () => (
    <div className="flex items-center gap-4 flex-wrap">
      <Button size="xs">Extra pequeño</Button>
      <Button size="sm">Pequeño</Button>
      <Button size="md">Mediano</Button>
      <Button size="lg">Grande</Button>
      <Button size="xl">Extra grande</Button>
    </div>
  )
};

// Con icono de inicio
export const WithStartIcon: Story = {
  args: {
    children: 'Descargar',
    variant: 'primary',
    startIcon: <Download className="w-4 h-4" aria-hidden="true" />
  }
};

// Con icono de fin
export const WithEndIcon: Story = {
  args: {
    children: 'Continuar',
    variant: 'primary',
    endIcon: <ChevronRight className="w-4 h-4" aria-hidden="true" />
  }
};

// Con ambos iconos
export const WithBothIcons: Story = {
  args: {
    children: 'Enviar email',
    variant: 'primary',
    startIcon: <Mail className="w-4 h-4" aria-hidden="true" />,
    endIcon: <ChevronRight className="w-4 h-4" aria-hidden="true" />
  }
};

// Estado loading
export const Loading: Story = {
  args: {
    children: 'Guardando...',
    variant: 'primary',
    loading: true
  }
};

// Estado disabled
export const Disabled: Story = {
  args: {
    children: 'Deshabilitado',
    variant: 'primary',
    disabled: true
  }
};

// Ancho completo
export const FullWidth: Story = {
  render: () => (
    <div style={{ width: '100%', maxWidth: '400px' }}>
      <Button fullWidth variant="primary">
        Ancho completo
      </Button>
    </div>
  )
};

// Con iconos en estado loading (no se muestran)
export const LoadingWithIcons: Story = {
  args: {
    children: 'Procesando...',
    variant: 'primary',
    loading: true,
    startIcon: <Mail className="w-4 h-4" aria-hidden="true" />,
    endIcon: <ChevronRight className="w-4 h-4" aria-hidden="true" />
  }
};

// Variante danger con icono
export const DangerWithIcon: Story = {
  args: {
    children: 'Eliminar permanentemente',
    variant: 'danger',
    startIcon: <AlertCircle className="w-4 h-4" aria-hidden="true" />
  }
};

// Variante link
export const LinkVariant: Story = {
  args: {
    children: 'Ver más',
    variant: 'link',
    endIcon: <ChevronRight className="w-4 h-4" aria-hidden="true" />
  }
};

// Estado disabled en diferentes variantes
export const DisabledVariants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-4">
      <Button variant="primary" disabled>Primary</Button>
      <Button variant="secondary" disabled>Secondary</Button>
      <Button variant="ghost" disabled>Ghost</Button>
      <Button variant="danger" disabled>Danger</Button>
      <Button variant="outline" disabled>Outline</Button>
      <Button variant="link" disabled>Link</Button>
    </div>
  )
};

// Combinación de tamaños y variantes
export const SizeVariantMatrix: Story = {
  render: () => (
    <div className="grid grid-cols-6 gap-4">
      {(['xs', 'sm', 'md', 'lg', 'xl'] as const).map(size => (
        <div key={size} className="flex flex-col gap-2">
          <span className="text-xs text-text-tertiary text-center capitalize">{size}</span>
          <Button size={size} variant="primary">Primary</Button>
          <Button size={size} variant="secondary">Secondary</Button>
          <Button size={size} variant="ghost">Ghost</Button>
          <Button size={size} variant="danger">Danger</Button>
        </div>
      ))}
    </div>
  )
};