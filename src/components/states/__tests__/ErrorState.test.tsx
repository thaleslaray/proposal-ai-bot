import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ErrorState } from '../ErrorState';

describe('ErrorState', () => {
  it('deve renderizar mensagem de erro', () => {
    const { getByText } = render(<ErrorState message="Erro ao carregar dados" />);
    expect(getByText('Erro ao carregar dados')).toBeInTheDocument();
  });

  it('deve renderizar título padrão', () => {
    const { getByText } = render(<ErrorState message="Erro" />);
    expect(getByText('Ops! Algo deu errado')).toBeInTheDocument();
  });

  it('deve renderizar título customizado', () => {
    const { getByText } = render(<ErrorState title="Falha na conexão" message="Sem internet" />);
    expect(getByText('Falha na conexão')).toBeInTheDocument();
  });

  it('deve renderizar botão de retry quando onRetry fornecido', () => {
    const handleRetry = vi.fn();
    const { getByText } = render(<ErrorState message="Erro" onRetry={handleRetry} />);
    expect(getByText('Tentar Novamente')).toBeInTheDocument();
  });

  it('não deve renderizar botão de retry quando onRetry não fornecido', () => {
    const { queryByText } = render(<ErrorState message="Erro" />);
    expect(queryByText('Tentar Novamente')).not.toBeInTheDocument();
  });

  it('deve chamar onRetry quando botão é clicado', async () => {
    const user = userEvent.setup();
    const handleRetry = vi.fn();
    
    const { getByText } = render(<ErrorState message="Erro" onRetry={handleRetry} />);
    
    await user.click(getByText('Tentar Novamente'));
    expect(handleRetry).toHaveBeenCalledTimes(1);
  });

  it('deve renderizar variant inline por padrão', () => {
    const { container } = render(<ErrorState message="Erro" />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toHaveClass('py-12');
  });

  it('deve renderizar variant fullscreen', () => {
    const { container } = render(
      <ErrorState message="Erro" variant="fullscreen" />
    );
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toHaveClass('min-h-screen');
  });

  it('deve aplicar className customizada', () => {
    const { container } = render(
      <ErrorState message="Erro" className="custom-error" />
    );
    const innerDiv = container.querySelector('.custom-error');
    expect(innerDiv).toBeInTheDocument();
  });

  it('deve renderizar ícone de alerta', () => {
    const { container } = render(<ErrorState message="Erro" />);
    const icon = container.querySelector('.text-destructive');
    expect(icon).toBeInTheDocument();
  });
});
