import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EmptyState } from '../EmptyState';
import { Inbox } from 'lucide-react';

describe('EmptyState', () => {
  it('deve renderizar título', () => {
    const { getByText } = render(<EmptyState title="Nenhum item encontrado" />);
    expect(getByText('Nenhum item encontrado')).toBeInTheDocument();
  });

  it('deve renderizar descrição quando fornecida', () => {
    const { getByText } = render(
      <EmptyState
        title="Sem resultados"
        description="Tente ajustar seus filtros"
      />
    );
    expect(getByText('Tente ajustar seus filtros')).toBeInTheDocument();
  });

  it('deve renderizar ícone quando fornecido', () => {
    const { getByTestId } = render(
      <EmptyState
        title="Vazio"
        icon={<Inbox data-testid="inbox-icon" />}
      />
    );
    expect(getByTestId('inbox-icon')).toBeInTheDocument();
  });

  it('deve renderizar botão de ação quando fornecido', () => {
    const handleClick = vi.fn();
    const { getByText } = render(
      <EmptyState
        title="Sem dados"
        action={{
          label: 'Criar Novo',
          onClick: handleClick
        }}
      />
    );
    
    const button = getByText('Criar Novo');
    expect(button).toBeInTheDocument();
  });

  it('deve chamar onClick quando botão de ação é clicado', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    
    const { getByText } = render(
      <EmptyState
        title="Sem dados"
        action={{
          label: 'Adicionar',
          onClick: handleClick
        }}
      />
    );
    
    await user.click(getByText('Adicionar'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('deve aplicar className customizada', () => {
    const { container } = render(
      <EmptyState title="Teste" className="custom-class" />
    );
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('deve renderizar action com ícone', () => {
    const { getByTestId } = render(
      <EmptyState
        title="Vazio"
        action={{
          label: 'Ação',
          onClick: () => {},
          icon: <span data-testid="action-icon">+</span>
        }}
      />
    );
    expect(getByTestId('action-icon')).toBeInTheDocument();
  });
});
