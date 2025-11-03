import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import EventPage from '../EventPage';

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

describe('EventPage', () => {
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

  it('deve exibir LoadingState enquanto carrega evento', () => {
    mockSingle.mockReturnValue(new Promise(() => {})); // Pendente

    const { getByText } = render(
      <BrowserRouter>
        <Routes>
          <Route path="/event/:eventId" element={<EventPage />} />
        </Routes>
      </BrowserRouter>
    );

    expect(getByText(/Carregando evento/i)).toBeInTheDocument();
  });

  it('deve renderizar timer com classes do design system', async () => {
    const mockEvent = {
      id: 'event-1',
      title: 'Evento Teste',
      description: 'Descrição',
      date: new Date(Date.now() + 86400000).toISOString(), // Amanhã
      status: 'upcoming',
      slug: 'evento-teste',
    };

    mockSingle.mockResolvedValue({ data: mockEvent, error: null });

    const { container } = render(
      <BrowserRouter>
        <Routes>
          <Route path="/event/:eventId" element={<EventPage />} />
        </Routes>
      </BrowserRouter>
    );

    await waitFor(() => {
      const timer = container.querySelector('.border-brutal-thick');
      expect(timer).toBeInTheDocument();
    });
  });

  it('deve renderizar botões com classes do design system', async () => {
    const mockEvent = {
      id: 'event-1',
      title: 'Evento Teste',
      description: 'Descrição',
      date: new Date(Date.now() + 86400000).toISOString(),
      status: 'upcoming',
      slug: 'evento-teste',
    };

    mockSingle.mockResolvedValue({ data: mockEvent, error: null });

    // Mock para participantes
    mockFrom.mockImplementation((table: string) => {
      if (table === 'events') {
        return {
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({ data: mockEvent, error: null }),
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

    const { container } = render(
      <BrowserRouter>
        <Routes>
          <Route path="/event/:eventId" element={<EventPage />} />
        </Routes>
      </BrowserRouter>
    );

    await waitFor(() => {
      const buttons = container.querySelectorAll('.border-brutal');
      expect(buttons.length).toBeGreaterThan(0);
    });
  });

  it('deve exibir título e descrição do evento', async () => {
    const mockEvent = {
      id: 'event-1',
      title: 'Hackathon 2024',
      description: 'Evento incrível de inovação',
      date: new Date(Date.now() + 86400000).toISOString(),
      status: 'upcoming',
      slug: 'hackathon-2024',
    };

    mockSingle.mockResolvedValue({ data: mockEvent, error: null });

    const { getByText } = render(
      <BrowserRouter>
        <Routes>
          <Route path="/event/:eventId" element={<EventPage />} />
        </Routes>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(getByText('Hackathon 2024')).toBeInTheDocument();
      expect(getByText('Evento incrível de inovação')).toBeInTheDocument();
    });
  });
});
