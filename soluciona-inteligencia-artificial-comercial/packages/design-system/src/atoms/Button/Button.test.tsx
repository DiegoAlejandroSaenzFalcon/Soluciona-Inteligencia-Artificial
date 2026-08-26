// @soluciona/design-system/src/atoms/Button/Button.test.tsx
// Tests para Button

import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from './Button';
import { Loader2 } from 'lucide-react';

describe('Button', () => {
  const defaultProps = {
    children: 'Click me',
    onClick: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renderiza correctamente', () => {
    render(<Button {...defaultProps} />);
    const button = screen.getByRole('button', { name: /click me/i });
    expect(button).toBeInTheDocument();
    expect(button).not.toBeDisabled();
  });

  it('aplica variante primary por defecto', () => {
    render(<Button {...defaultProps} />);
    const button = screen.getByRole('button');
    expect(button).toHaveClass('bg-brand-primary');
  });

  it('aplica variante secondary', () => {
    render(<Button {...defaultProps} variant="secondary" />);
    const button = screen.getByRole('button');
    expect(button).toHaveClass('bg-bg-elevated');
  });

  it('aplica variante ghost', () => {
    render(<Button {...defaultProps} variant="ghost" />);
    const button = screen.getByRole('button');
    expect(button).toHaveClass('bg-transparent');
  });

  it('aplica variante danger', () => {
    render(<Button {...defaultProps} variant="danger" />);
    const button = screen.getByRole('button');
    expect(button).toHaveClass('bg-state-error-bg');
  });

  it('aplica tamaños correctamente', () => {
    const { rerender } = render(<Button {...defaultProps} size="xs" />);
    expect(screen.getByRole('button')).toHaveClass('text-xs');

    rerender(<Button {...defaultProps} size="sm" />);
    expect(screen.getByRole('button')).toHaveClass('text-sm');

    rerender(<Button {...defaultProps} size="md" />);
    expect(screen.getByRole('button')).toHaveClass('text-sm');

    rerender(<Button {...defaultProps} size="lg" />);
    expect(screen.getByRole('button')).toHaveClass('text-base');

    rerender(<Button {...defaultProps} size="xl" />);
    expect(screen.getByRole('button')).toHaveClass('text-lg');
  });

  it('aplica fullWidth', () => {
    render(<Button {...defaultProps} fullWidth />);
    expect(screen.getByRole('button')).toHaveClass('w-full');
  }

  it('maneja estado disabled', () => {
    render(<Button {...defaultProps} disabled />);
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-disabled', 'true');
  }

  it('maneja estado loading', () => {
    render(<Button {...defaultProps} loading />);
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
    expect(button).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByRole('status')).toHaveTextContent('Cargando…');
  }

  it('llama onClick cuando se hace click', () => {
    render(<Button {...defaultProps} />);
    fireEvent.click(screen.getByRole('button'));
    expect(defaultProps.onClick).toHaveBeenCalledTimes(1);
  });

  it('no llama onClick cuando está disabled', () => {
    render(<Button {...defaultProps} disabled />);
    fireEvent.click(screen.getByRole('button'));
    expect(defaultProps.onClick).not.toHaveBeenCalled();
  });

  it('no llama onClick cuando está loading', () => {
    render(<Button {...defaultProps} loading />);
    fireEvent.click(screen.getByRole('button'));
    expect(defaultProps.onClick).not.toHaveBeenCalled();
  }

  it('renderiza startIcon y endIcon', () => {
    render(
      <Button {...defaultProps} startIcon={<span data-testid="start">←</span>} endIcon={<span data-testid="end">→</span>} />
    );
    expect(screen.getByTestId('start')).toBeInTheDocument();
    expect(screen.getByTestId('end')).toBeInTheDocument();
  }

  it('no renderiza icons cuando está loading', () => {
    render(
      <Button {...defaultProps} loading startIcon={<span data-testid="start">←</span>} endIcon={<span data-testid="end">→</span>} />
    );
    expect(screen.queryByTestId('start')).not.toBeInTheDocument();
    expect(screen.queryByTestId('end')).not.toBeInTheDocument();
  }

  it('aplica aria-label cuando se proporciona', () => {
    render(<Button {...defaultProps} aria-label="Botón personalizado" />);
    expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Botón personalizado');
  }

  it('aplica className personalizada', () => {
    render(<Button {...defaultProps} className="custom-class" />);
    expect(screen.getByRole('button')).toHaveClass('custom-class');
  }

  it('mantiene ref forwarding', () => {
    const ref = vi.fn();
    render(<Button {...defaultProps} ref={ref} />);
    expect(ref).toHaveBeenCalled();
    expect(ref.mock.calls[0][0]).toBeInstanceOf(HTMLButtonElement);
  });
});