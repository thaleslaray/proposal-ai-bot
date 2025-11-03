import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Community from '../Community';

interface AuthContextConsumerProps {
  children: (value: { userId: string; userRole: string }) => React.ReactNode;
}

const waitFor = async (callback: () => void, options = { timeout: 1000 }) => {
  const startTime = Date.now();
  while (Date.now() - startTime < options.timeout) {
    try {
      callback();
      return;
    } catch (error) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }
  callback();
};

// Criar mocks usando vi.hoisted para disponibilizá-los no mock e nos testes
const { mockSelect, mockEq, mockOrder, mockFrom } = vi.hoisted(() => {
  const mockSelect = vi.fn();
  const mockEq = vi.fn();
  const mockOrder = vi.fn();
  const mockFrom = vi.fn(() => ({
    select: mockSelect,
  }));

  return { mockSelect, mockEq, mockOrder, mockFrom };
});

// Mock do contexto de autenticação
vi.mock('@/context/AuthContext', () => ({
  AuthContext: {
    Consumer: ({ children }: AuthContextConsumerProps) =>
      children({ userId: 'user-123', userRole: 'user' }),
  },
}));

// Mock do cliente Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: mockFrom,
  },
}));

describe('Community', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSelect.mockReturnValue({
      eq: mockEq,
      order: mockOrder,
    });
    mockEq.mockReturnValue({
      order: mockOrder,
    });
  });

  it('deve exibir LoadingState inicialmente', () => {
    mockOrder.mockReturnValue(new Promise(() => {})); // Pendente

    const { getByText } = render(
      <BrowserRouter>
        <Community />
      </BrowserRouter>
    );

    expect(getByText(/Carregando PRDs/i)).toBeInTheDocument();
  });

  it('deve exibir EmptyState quando não há PRDs', async () => {
    mockOrder.mockResolvedValue({ data: [], error: null });

    const { getByText } = render(
      <BrowserRouter>
        <Community />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(getByText(/Nenhum PRD público ainda/i)).toBeInTheDocument();
    });
  });

  it('deve renderizar lista de PRDs quando dados existem', async () => {
    const mockPRDs = [
      {
        id: '1',
        title: 'PRD Teste 1',
        content: 'Conteúdo 1',
        category: 'Tech',
        visibility: 'public',
        likes_count: 5,
        created_at: new Date().toISOString(),
      },
      {
        id: '2',
        title: 'PRD Teste 2',
        content: 'Conteúdo 2',
        category: 'Business',
        visibility: 'public',
        likes_count: 10,
        created_at: new Date().toISOString(),
      },
    ];

    mockOrder.mockResolvedValue({ data: mockPRDs, error: null });

    const { getByText } = render(
      <BrowserRouter>
        <Community />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(getByText('PRD Teste 1')).toBeInTheDocument();
      expect(getByText('PRD Teste 2')).toBeInTheDocument();
    });
  });

  it('deve exibir ErrorState quando ocorre erro', async () => {
    mockOrder.mockResolvedValue({
      data: null,
      error: { message: 'Erro de conexão' },
    });

    const { getByText } = render(
      <BrowserRouter>
        <Community />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(getByText(/Erro ao carregar/i)).toBeInTheDocument();
    });
  });
});
