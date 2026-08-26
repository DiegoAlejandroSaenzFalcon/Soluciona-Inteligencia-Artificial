// @soluciona/design-system/src/atoms/Spinner/Spinner.test.tsx
// Tests para Spinner

import { render, screen } from '@testing-library/react';
import { Spinner, SpinnerOverlay } from './Spinner';

describe('Spinner', () => {
  it('renderiza correctamente', () => {
    render(<Spinner />);
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite');
    expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'Cargando…');
  });

  it('aplica tamaños', () => {
    const { rerender } = render(<Spinner size="xs" />);
    expect(screen.getByRole('status')).toHaveClass('w-3 h-3');

    rerender(<Spinner size="sm" />);
    expect(screen.getByRole('status')).toHaveClass('w-4 h-4');

    rerender(<Spinner size="md" />);
    expect(screen.getByRole('status')).toHaveClass('w-6 h-6');

    rerender(<Spinner size="lg" />);
    expect(screen.getByRole('status')).toHaveClass('w-8 h-8');

    rerender(<Spinner size="xl" />);
    expect(screen.getByRole('status')).toHaveClass('w-12 h-12');
  });

  it('aplica colores', () => {
    const { rerender } = render(<Spinner color="primary" />);
    expect(screen.getByRole('status')).toHaveClass('border-brand-primary/20');

    rerender(<Spinner color="secondary" />);
    expect(screen.getByRole('status')).toHaveClass('border-border-default/20');

    rerender(<Spinner color="white" />);
    expect(screen.getByRole('status')).toHaveClass('border-white/20');
  });

  it('aplica label personalizado', () => {
    render(<Spinner label="Guardando cambios…" />);
    expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'Guardando cambios…');
  });

  it('aplica className personalizada', () => {
    render(<Spinner className="custom-spinner" />);
    expect(screen.getByRole('status')).toHaveClass('custom-spinner');
  });
});

describe('SpinnerOverlay', () => {
  it('no renderiza cuando isOpen es false', () => {
    render(<SpinnerOverlay isOpen={false} />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('renderiza cuando isOpen es true', () => {
    render(<SpinnerOverlay isOpen={true} />);
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveClass('fixed inset-0 z-[var(--z-toast)]');
  });

  it('renderiza children', () => {
    render(<SpinnerOverlay isOpen={true}>Procesando datos...</SpinnerOverlay>);
    expect(screen.getByText('Procesando datos...')).toBeInTheDocument();
  });

  it('aplica label personalizado', () => {
    render(<SpinnerOverlay isOpen={true} label="Guardando..." />);
    expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'Guardando...');
  });
});