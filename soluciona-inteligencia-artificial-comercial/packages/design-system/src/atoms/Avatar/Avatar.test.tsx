// @soluciona/design-system/src/atoms/Avatar/Avatar.test.tsx
// Tests para Avatar

import { render, screen } from '@testing-library/react';
import { Avatar, AvatarGroup } from './Avatar';

describe('Avatar', () => {
  it('renderiza con imagen', () => {
    render(<Avatar src="https://example.com/avatar.jpg" alt="Juan Pérez" />);
    const img = screen.getByAltText('Juan Pérez');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'https://example.com/avatar.jpg');
  });

  it('renderiza iniciales cuando no hay imagen', () => {
    render(<Avatar alt="Juan Pérez" />);
    expect(screen.getByText('JP')).toBeInTheDocument();
  });

  it('usa fallback cuando no hay alt', () => {
    render(<Avatar fallback="Usuario" />);
    expect(screen.getByText('US')).toBeInTheDocument();
  });

  it('aplica tamaños', () => {
    const { rerender } = render(<Avatar alt="Test" size="xs" />);
    expect(screen.getByText('TE')).toHaveClass('w-6 h-6');

    rerender(<Avatar alt="Test" size="sm" />);
    expect(screen.getByText('TE')).toHaveClass('w-8 h-8');

    rerender(<Avatar alt="Test" size="md" />);
    expect(screen.getByText('TE')).toHaveClass('w-10 h-10');
  });

  it('aplica shape square', () => {
    render(<Avatar alt="Test" shape="square" />);
    expect(screen.getByText('TE')).not.toHaveClass('rounded-full');
    expect(screen.getByText('TE')).toHaveClass('rounded-lg');
  });

  it('aplica status', () => {
    render(<Avatar alt="Test" status="online" />);
    const status = screen.getByLabelText('Estado: online');
    expect(status).toHaveClass('bg-emerald-500');
  });

  it('aplica status away', () => {
    render(<Avatar alt="Test" status="away" />);
    const status = screen.getByLabelText('Estado: away');
    expect(status).toHaveClass('bg-amber-500');
  });

  it('aplica status busy', () => {
    render(<Avatar alt="Test" status="busy" />);
    const status = screen.getByLabelText('Estado: busy');
    expect(status).toHaveClass('bg-rose-500');
  });

  it('aplica status offline', () => {
    render(<Avatar alt="Test" status="offline" />);
    const status = screen.getByLabelText('Estado: offline');
    expect(status).toHaveClass('bg-slate-400');
  });
});

describe('AvatarGroup', () => {
  it('renderiza avatares visibles', () => {
    render(
      <AvatarGroup>
        <Avatar alt="User 1" />
        <Avatar alt="User 2" />
        <Avatar alt="User 3" />
      </AvatarGroup>
    );
    expect(screen.getByText('U1')).toBeInTheDocument();
    expect(screen.getByText('U2')).toBeInTheDocument();
    expect(screen.getByText('U3')).toBeInTheDocument();
  });

  it('muestra contador cuando excede max', () => {
    render(
      <AvatarGroup max={2}>
        <Avatar alt="User 1" />
        <Avatar alt="User 2" />
        <Avatar alt="User 3" />
      </AvatarGroup>
    );
    expect(screen.getByText('+1')).toBeInTheDocument();
  });
});