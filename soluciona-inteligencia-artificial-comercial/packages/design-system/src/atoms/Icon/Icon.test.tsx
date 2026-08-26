// @soluciona/design-system/src/atoms/Icon/Icon.test.tsx
// Tests para Icon

import { render, screen } from '@testing-library/react';
import { Icon } from './Icon';
import { Search, Mail } from 'lucide-react';

describe('Icon', () => {
  it('renderiza correctamente con tamaño por defecto', () => {
    render(<Icon icon={Search} />);
    const svg = screen.getByRole('img', { hidden: true });
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute('width', '16');
    expect(svg).toHaveAttribute('height', '16');
  });

  it('aplica tamaños predefinidos', () => {
    const { rerender } = render(<Icon icon={Search} size="xs" />);
    expect(screen.getByRole('img')).toHaveAttribute('width', '12');

    rerender(<Icon icon={Search} size="sm" />);
    expect(screen.getByRole('img')).toHaveAttribute('width', '14');

    rerender(<Icon icon={Search} size="md" />);
    expect(screen.getByRole('img')).toHaveAttribute('width', '16');

    rerender(<Icon icon={Search} size="lg" />);
    expect(screen.getByRole('img')).toHaveAttribute('width', '20');

    rerender(<Icon icon={Search} size="xl" />);
    expect(screen.getByRole('img')).toHaveAttribute('width', '24');
  });

  it('aplica tamaño numérico personalizado', () => {
    render(<Icon icon={Search} size={32} />);
    expect(screen.getByRole('img')).toHaveAttribute('width', '32');
    expect(screen.getByRole('img')).toHaveAttribute('height', '32');
  });

  it('aplica color personalizado', () => {
    render(<Icon icon={Search} color="#ff0000" />);
    expect(screen.getByRole('img')).toHaveAttribute('stroke', '#ff0000');
  });

  it('aplica className personalizada', () => {
    render(<Icon icon={Search} className="custom-class" />);
    expect(screen.getByRole('img')).toHaveClass('custom-class');
  });

  it('renderiza title para accesibilidad', () => {
    render(<Icon icon={Search} title="Buscar" />);
    const svg = screen.getByRole('img');
    expect(svg).toHaveAttribute('aria-labelledby');
    const title = screen.getByText('Buscar');
    expect(title).toBeInTheDocument();
  });

  it('renderiza desc para accesibilidad', () => {
    render(<Icon icon={Search} desc="Icono de lupa para buscar" />);
    const svg = screen.getByRole('img');
    expect(svg).toHaveAttribute('aria-describedby');
  });

  it('aplica className personalizada', () => {
    render(<Icon icon={Search} className="custom-icon" />);
    expect(screen.getByRole('img')).toHaveClass('custom-icon');
  });

  it('aplica atributos adicionales', () => {
    render(<Icon icon={Search} data-testid="custom-icon" />);
    expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
  });

  it('no tiene role img cuando no hay title ni desc', () => {
    render(<Icon icon={Search} />);
    const svg = screen.getByRole('img', { hidden: true });
    expect(svg).toHaveAttribute('aria-hidden', 'true');
  });
});