// @soluciona/design-system/src/atoms/Badge/Badge.test.tsx
// Tests para Badge

import { render, screen } from '@testing-library/react';
import { Badge } from './Badge';

describe('Badge', () => {
  it('renderiza correctamente', () => {
    render(<Badge>Badge</Badge>);
    expect(screen.getByText('Badge')).toBeInTheDocument();
  });

  it('aplica variante default', () => {
    render(<Badge>Badge</Badge>);
    expect(screen.getByText('Badge')).toHaveClass('bg-brand-primary/10');
  });

  it('aplica variante success', () => {
    render(<Badge variant="success">Éxito</Badge>);
    expect(screen.getByText('Éxito')).toHaveClass('bg-state-success-bg');
  });

  it('aplica variante warning', () => {
    render(<Badge variant="warning">Advertencia</Badge>);
    expect(screen.getByText('Advertencia')).toHaveClass('bg-state-warning-bg');
  });

  it('aplica variante danger', () => {
    render(<Badge variant="danger">Peligro</Badge>);
    expect(screen.getByText('Peligro')).toHaveClass('bg-state-error-bg');
  });

  it('aplica variante info', () => {
    render(<Badge variant="info">Info</Badge>);
    expect(screen.getByText('Info')).toHaveClass('bg-state-info-bg');
  });

  it('aplica tamaños', () => {
    const { rerender } = render(<Badge size="xs">XS</Badge>);
    expect(screen.getByText('XS')).toHaveClass('text-xs');

    rerender(<Badge size="sm">SM</Badge>);
    expect(screen.getByText('SM')).toHaveClass('text-xs');

    rerender(<Badge size="md">MD</Badge>);
    expect(screen.getByText('MD')).toHaveClass('text-sm');

    rerender(<Badge size="lg">LG</Badge>);
    expect(screen.getByText('LG')).toHaveClass('text-base');
  });

  it('aplica dot', () => {
    render(<Badge dot>Con punto</Badge>);
    const dot = screen.getByText('Con punto').previousElementSibling;
    expect(dot).toHaveClass('w-1.5 h-1.5 rounded-full');
  });

  it('aplica className personalizada', () => {
    render(<Badge className="custom-class">Badge</Badge>);
    expect(screen.getByText('Badge')).toHaveClass('custom-class');
  });
});