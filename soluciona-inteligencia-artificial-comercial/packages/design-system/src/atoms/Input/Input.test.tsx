// @soluciona/design-system/src/atoms/Input/Input.test.tsx
// Tests para Input

import { render, screen, fireEvent } from '@testing-library/react';
import { Input } from './Input';

describe('Input', () => {
  const defaultProps = {
    placeholder: 'Escribe aquí...'
  };

  it('renderiza correctamente', () => {
    render(<Input {...defaultProps} />);
    const input = screen.getByPlaceholderText('Escribe aquí...');
    expect(input).toBeInTheDocument();
  });

  it('renderiza label cuando se proporciona', () => {
    render(<Input {...defaultProps} label="Correo electrónico" />);
    expect(screen.getByLabelText('Correo electrónico')).toBeInTheDocument();
  });

  it('marca required en label', () => {
    render(<Input {...defaultProps} label="Nombre" required />);
    const label = screen.getByLabelText('Nombre');
    expect(label.parentElement).toHaveTextContent('*');
  });

  it('muestra hint cuando se proporciona', () => {
    render(<Input {...defaultProps} hint="Mínimo 8 caracteres" />);
    expect(screen.getByText('Mínimo 8 caracteres')).toBeInTheDocument();
  });

  it('muestra error cuando se proporciona', () => {
    render(<Input {...defaultProps} error="Email inválido" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Email inválido');
    expect(screen.getByRole('alert')).toHaveAttribute('aria-live', 'assertive');
  });

  it('aplica aria-invalid cuando hay error', () => {
    render(<Input {...defaultProps} error="Error" />);
    expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true');
  });

  it('aplica tamaños correctamente', () => {
    const { rerender } = render(<Input {...defaultProps} size="sm" />);
    expect(screen.getByRole('textbox')).toHaveClass('py-1.5');

    rerender(<Input {...defaultProps} size="md" />);
    expect(screen.getByRole('textbox')).toHaveClass('py-2');

    rerender(<Input {...defaultProps} size="lg" />);
    expect(screen.getByRole('textbox')).toHaveClass('py-2.5');
  });

  it('maneja disabled', () => {
    render(<Input {...defaultProps} disabled />);
    expect(screen.getByRole('textbox')).toBeDisabled();
  });

  it('maneja readOnly', () => {
    render(<Input {...defaultProps} readOnly />);
    expect(screen.getByRole('textbox')).toHaveAttribute('readOnly', '');
  });

  it('renderiza startIcon', () => {
    render(<Input {...defaultProps} startIcon={<span data-testid="icon">@</span>} />);
    expect(screen.getByTestId('icon')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toHaveClass('pl-10');
  });

  it('renderiza endIcon', () => {
    render(<Input {...defaultProps} endIcon={<span data-testid="icon">🔍</span>} />);
    expect(screen.getByTestId('icon')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toHaveClass('pr-10');
  });

  it('aplica required attribute', () => {
    render(<Input {...defaultProps} required />);
    expect(screen.getByRole('textbox')).toHaveAttribute('aria-required', 'true');
  });

  it('maneja onChange', () => {
    const handleChange = vi.fn();
    render(<Input {...defaultProps} onChange={handleChange} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'test' } });
    expect(handleChange).toHaveBeenCalled();
  });

  it('aplica className personalizada', () => {
    render(<Input {...defaultProps} className="custom-class" />);
    expect(screen.getByRole('textbox')).toHaveClass('custom-class');
  });

  it('maneja ref forwarding', () => {
    const ref = vi.fn();
    render(<Input {...defaultProps} ref={ref} />);
    expect(ref).toHaveBeenCalled();
    expect(ref.mock.calls[0][0]).toBeInstanceOf(HTMLInputElement);
  });

  it('no muestra hint cuando hay error', () => {
    render(<Input {...defaultProps} hint="Ayuda" error="Error" />);
    expect(screen.queryByText('Ayuda')).not.toBeInTheDocument();
  });

  it('aplica aria-describedby correctamente', () => {
    render(<Input {...defaultProps} hint="Ayuda" />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('aria-describedby');
  });
});