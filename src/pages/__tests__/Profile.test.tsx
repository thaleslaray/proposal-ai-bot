import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Profile from '../Profile';

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
const { mockSelect, mockEq, mockSingle, mockFrom } = vi.hoisted(() => {
  const mockSelect = vi.fn();
  const mockEq = vi.fn();
  const mockSingle = vi.fn();
  const mockFrom = vi.fn();

  return { mockSelect, mockEq, mockSingle, mockFrom };
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

describe('Profile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockReturnValue({
      select: mockSelect,
    });
    mockSelect.mockReturnValue({
      eq: mockEq,
    });
    mockEq.mockReturnValue({
      single: mockSingle,
    });
  });

  it('deve exibir LoadingState enquanto carrega perfil', () => {
    mockSingle.mockReturnValue(new Promise(() => {})); // Pendente

    const { getByText } = render(
      <BrowserRouter>
        <Routes>
          <Route path="/profile/:userId" element={<Profile />} />
        </Routes>
      </BrowserRouter>
    );

    expect(getByText(/Carregando/i)).toBeInTheDocument();
  });

  it('deve exibir ErrorState quando perfil não é encontrado', async () => {
    mockSingle.mockResolvedValue({ data: null, error: null });

    const { getByText } = render(
      <BrowserRouter>
        <Routes>
          <Route path="/profile/:userId" element={<Profile />} />
        </Routes>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(getByText(/Perfil não encontrado/i)).toBeInTheDocument();
    });
  });

  it('deve renderizar dados do perfil quando encontrado', async () => {
    const mockProfile = {
      id: 'user-123',
      display_name: 'João Silva',
      bio: 'Desenvolvedor Full Stack',
      avatar_url: null,
      created_at: new Date().toISOString(),
    };

    mockSingle.mockResolvedValue({ data: mockProfile, error: null });

    // Mock para PRDs do usuário
    mockFrom.mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({ data: mockProfile, error: null }),
            }),
          }),
        };
      }
      return {
        select: () => ({
          eq: () => Promise.resolve({ data: [], error: null }),
        }),
      };
    });

    const { getByText } = render(
      <BrowserRouter>
        <Routes>
          <Route path="/profile/:userId" element={<Profile />} />
        </Routes>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(getByText('João Silva')).toBeInTheDocument();
      expect(getByText('Desenvolvedor Full Stack')).toBeInTheDocument();
    });
  });
});
