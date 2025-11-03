import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { LoadingState } from '../LoadingState';

describe('LoadingState', () => {
  it('deve renderizar com variant inline por padrão', () => {
    const { getByText } = render(<LoadingState />);
    expect(getByText('Carregando...')).toBeInTheDocument();
  });

  it('deve renderizar variant fullscreen', () => {
    const { container } = render(<LoadingState variant="fullscreen" />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toHaveClass('min-h-screen');
  });

  it('deve renderizar variant overlay', () => {
    const { container } = render(<LoadingState variant="overlay" />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toHaveClass('absolute', 'inset-0', 'bg-background/80');
  });

  it('deve exibir mensagem customizada', () => {
    const { getByText } = render(<LoadingState message="Processando dados..." />);
    expect(getByText('Processando dados...')).toBeInTheDocument();
  });

  it('deve renderizar spinner com tamanho pequeno', () => {
    const { container } = render(<LoadingState size="sm" />);
    const spinner = container.querySelector('.animate-spin');
    expect(spinner).toHaveClass('h-4', 'w-4');
  });

  it('deve renderizar spinner com tamanho médio', () => {
    const { container } = render(<LoadingState size="md" />);
    const spinner = container.querySelector('.animate-spin');
    expect(spinner).toHaveClass('h-8', 'w-8');
  });

  it('deve renderizar spinner com tamanho grande', () => {
    const { container } = render(<LoadingState size="lg" />);
    const spinner = container.querySelector('.animate-spin');
    expect(spinner).toHaveClass('h-12', 'w-12');
  });

  it('não deve exibir mensagem se não fornecida', () => {
    const { queryByText } = render(<LoadingState message="" />);
    expect(queryByText(/./)).not.toBeInTheDocument();
  });
});
