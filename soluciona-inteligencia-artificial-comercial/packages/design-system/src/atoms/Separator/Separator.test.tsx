// @soluciona/design-system/src/atoms/Separator/Separator.test.tsx
// Tests para Separator

import { render, screen } from '@testing-library/react';
import { Separator, SectionSeparator } from './Separator';

describe('Separator', () => {
  it('renderiza horizontal por defecto', () => {
    render(<Separator />);
    const hr = screen.getByRole('separator');
    expect(hr).toBeInTheDocument();
    expect(hr).toHaveAttribute('aria-orientation', 'horizontal');
  });

  it('renderiza vertical', () => {
    render(<Separator orientation="vertical" />);
    const hr = screen.getByRole('separator');
    expect(hr).toHaveAttribute('aria-orientation', 'vertical');
  });

  it('aplica variantes', () => {
    const { rerender } = render(<Separator variant="solid" />);
    expect(screen.getByRole('separator')).toHaveClass('border-solid');

    rerender(<Separator variant="dashed" />);
    expect(screen.getByRole('separator')).toHaveClass('border-dashed');

    rerender(<Separator variant="dotted" />);
    expect(screen.getByRole('separator')).toHaveClass('border-dotted');
  });

  it('aplica tamaños', () => {
    const { rerender } = render(<Separator size="thin" />);
    expect(screen.getByRole('separator')).toHaveClass('border-t');

    rerender(<Separator size="medium" />);
    expect(screen.getByRole('separator')).toHaveClass('border-t-2');

    rerender(<Separator size="thick" />);
    expect(screen.getByRole('separator')).toHaveClass('border-t-4');
  });

  it('renderiza con label', () => {
    render(<Separator label="O" />);
    expect(screen.getByText('O')).toBeInTheDocument();
  });

  it('aplica orientación vertical con label', () => {
    render(<Separator orientation="vertical" label="O" />);
    expect(screen.getByText('O')).toBeInTheDocument();
  });
});

describe('SectionSeparator', () => {
  it('renderiza correctamente', () => {
    render(<SectionSeparator label="Sección" />);
    expect(screen.getByText('Sección')).toBeInTheDocument();
  });

  it('aplica alineación', () => {
    const { rerender } = render(<SectionSeparator label="Inicio" align="start" />);
    expect(screen.getByText('Inicio')).toBeInTheDocument();

    rerender(<SectionSeparator label="Centro" align="center" />);
    expect(screen.getByText('Centro')).toBeInTheDocument();

    rerender(<SectionSeparator label="Fin" align="end" />);
    expect(screen.getByText('Fin')).toBeInTheDocument();
  });

  it('aplica tamaños', () => {
    const { rerender } = render(<SectionSeparator label="Test" size="thin" />);
    expect(screen.getByText('Test')).toBeInTheDocument();

    rerender(<SectionSeparator label="Test" size="medium" />);
    expect(screen.getByText('Test')).toBeInTheDocument();

    rerender(<SectionSeparator label="Test" size="thick" />);
    expect(screen.getByText('Test')).toBeInTheDocument();
  });

  it('aplica variantes', () => {
    const { rerender } = render(<SectionSeparator label="Test" variant="solid" />);
    expect(screen.getByText('Test')).toBeInTheDocument();

    rerender(<SectionSeparator label="Test" variant="dashed" />);
    expect(screen.getByText('Test')).toBeInTheDocument();

    rerender(<SectionSeparator label="Test" variant="dotted" />);
    expect(screen.getByText('Test')).toBeInTheDocument();
  });
});