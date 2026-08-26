// @soluciona/design-system/src/atoms/Input/Input.stories.tsx
// Storybook stories para Input

import type { Meta, StoryObj } from '@storybook/react';
import { Input } from './Input';
import { Search, Mail, Lock, User, Eye, EyeOff } from 'lucide-react';

const meta: Meta<typeof Input> = {
  title: 'Atoms/Input',
  component: Input,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Campo de texto accesible con label, hint, error, iconos y tamaños.'
      }
    }
  },
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
      description: 'Tamaño del input'
    },
    disabled: {
      control: 'boolean',
      description: 'Desactiva el input'
    },
    readOnly: {
      control: 'boolean',
      description: 'Solo lectura'
    },
    required: {
      control: 'boolean',
      description: 'Marca como requerido'
    },
    error: {
      control: 'text',
      description: 'Mensaje de error'
    },
    hint: {
      control: 'text',
      description: 'Texto de ayuda'
    }
  }
};

export default meta;
type Story = StoryObj<typeof Input>;

export const Default: Story = {
  args: {
    placeholder: 'Escribe algo...'
  }
};

export const WithLabel: Story = {
  args: {
    label: 'Correo electrónico',
    placeholder: 'tu@email.com',
    type: 'email'
  }
};

export const WithLabelAndHint: Story = {
  args: {
    label: 'Contraseña',
    type: 'password',
    hint: 'Mínimo 8 caracteres, una mayúscula y un número'
  }
};

export const WithError: Story = {
  args: {
    label: 'Correo electrónico',
    placeholder: 'tu@email.com',
    value: 'email-invalido',
    error: 'Formato de email inválido'
  }
};

export const Required: Story = {
  args: {
    label: 'Nombre completo',
    placeholder: 'Juan Pérez',
    required: true
  }
};

export const WithStartIcon: Story = {
  args: {
    label: 'Buscar',
    placeholder: 'Buscar productos...',
    startIcon: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
  }
};

export const WithEndIcon: Story = {
  args: {
    label: 'Contraseña',
    type: 'password',
    placeholder: '••••••••',
    endIcon: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
  }
};

export const Disabled: Story = {
  args: {
    label: 'Campo deshabilitado',
    placeholder: 'No editable',
    disabled: true
  }
};

export const ReadOnly: Story = {
  args: {
    label: 'Solo lectura',
    value: 'valor-fijo',
    readOnly: true
  }
};

export const AllSizes: Story = {
  render: () => (
    <div className="flex flex-col gap-4 w-64">
      <Input size="sm" label="Pequeño (sm)" placeholder="Pequeño" />
      <Input size="md" label="Mediano (md)" placeholder="Mediano" />
      <Input size="lg" label="Grande (lg)" placeholder="Grande" />
    </div>
  )
};

export const WithIcons: Story = {
  render: () => (
    <div className="flex flex-col gap-4 w-80">
      <Input
        label="Buscar"
        placeholder="Buscar..."
        startIcon={<svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
      />
      <Input
        label="Email"
        type="email"
        placeholder="tu@email.com"
        startIcon={<svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
      />
      <Input
        label="Usuario"
        placeholder="usuario"
        startIcon={<svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
      />
      <Input
        label="Contraseña"
        type="password"
        placeholder="••••••••"
        endIcon={<svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
      />
    </div>
  )
};

export const FormExample: Story = {
  render: () => (
    <form className="w-80 space-y-4" onSubmit={e => { e.preventDefault(); alert('Formulario enviado'); }}>
      <Input label="Nombre completo" placeholder="Juan Pérez" required />
      <Input label="Correo electrónico" type="email" placeholder="juan@ejemplo.com" required />
      <Input label="Teléfono" type="tel" placeholder="+57 300 123 4567" hint="Formato: +57 XXX XXX XXXX" />
      <Input label="Contraseña" type="password" placeholder="••••••••" hint="Mínimo 8 caracteres" required />
      <button type="submit" className="w-full bg-brand-primary text-brand-on-primary py-2 px-4 rounded-md font-semibold hover:bg-brand-primary-hover transition-colors">
        Registrarse
      </button>
    </form>
  )
};

export const WithErrorStates: Story = {
  render: () => (
    <div className="flex flex-col gap-4 w-80">
      <Input
        label="Email"
        type="email"
        value="invalid-email"
        error="Formato de email inválido"
        required
      />
      <Input
        label="Contraseña"
        type="password"
        value="123"
        error="La contraseña debe tener al menos 8 caracteres"
        required
      />
      <Input
        label="Confirmar contraseña"
        type="password"
        value="12345678"
        error="Las contraseñas no coinciden"
        required
      />
    </div>
  )
};