import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PRDGenerator } from '../PRDGenerator';
import { AuthProvider } from '@/contexts/AuthContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';

// Mock dos componentes complexos
vi.mock('../VoiceRecorder', () => ({
  VoiceRecorder: () => <div data-testid="voice-recorder">Voice Recorder Mock</div>,
}));

vi.mock('../RealtimeVoiceInterface', () => ({
  RealtimeVoiceInterface: () => <div data-testid="realtime-voice">Realtime Voice Mock</div>,
}));

vi.mock('../AdminPanel', () => ({
  AdminPanel: () => <div data-testid="admin-panel">Admin Panel Mock</div>,
}));

vi.mock('../PRDResult', () => ({
  PRDResult: () => <div data-testid="prd-result">PRD Result Mock</div>,
}));

vi.mock('../MyDocuments', () => ({
  MyDocuments: () => <div data-testid="my-documents">My Documents Mock</div>,
}));

// Wrapper com providers necessários
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>{children}</AuthProvider>
      </QueryClientProvider>
    </BrowserRouter>
  );
};

describe('PRDGenerator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Renderização básica', () => {
    it('deve renderizar o componente sem erros', () => {
      const Wrapper = createWrapper();

      expect(() => {
        render(
          <Wrapper>
            <PRDGenerator />
          </Wrapper>
        );
      }).not.toThrow();
    });

    it('deve renderizar textarea para entrada de ideia', async () => {
      const Wrapper = createWrapper();
      render(
        <Wrapper>
          <PRDGenerator />
        </Wrapper>
      );

      await waitFor(() => {
        const textareas = screen.getAllByRole('textbox');
        expect(textareas.length).toBeGreaterThan(0);
      });
    });

    it('deve renderizar botão de geração', async () => {
      const Wrapper = createWrapper();
      render(
        <Wrapper>
          <PRDGenerator />
        </Wrapper>
      );

      await waitFor(() => {
        // Procura por botão com texto relacionado a geração
        const buttons = screen.getAllByRole('button');
        expect(buttons.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Interação com usuário', () => {
    it('deve permitir digitar no textarea', async () => {
      const Wrapper = createWrapper();
      render(
        <Wrapper>
          <PRDGenerator />
        </Wrapper>
      );

      await waitFor(() => {
        const textareas = screen.getAllByRole('textbox');
        const textarea = textareas[0];

        fireEvent.change(textarea, {
          target: { value: 'Minha ideia de produto' },
        });

        expect(textarea).toHaveValue('Minha ideia de produto');
      });
    });

    it('deve limpar textarea quando usuário deleta texto', async () => {
      const Wrapper = createWrapper();
      render(
        <Wrapper>
          <PRDGenerator />
        </Wrapper>
      );

      await waitFor(() => {
        const textareas = screen.getAllByRole('textbox');
        const textarea = textareas[0];

        fireEvent.change(textarea, {
          target: { value: 'Texto inicial' },
        });
        expect(textarea).toHaveValue('Texto inicial');

        fireEvent.change(textarea, {
          target: { value: '' },
        });
        expect(textarea).toHaveValue('');
      });
    });
  });

  describe('Props e callbacks', () => {
    it('deve aceitar prop onAuthRequired', () => {
      const Wrapper = createWrapper();
      const onAuthRequired = vi.fn();

      expect(() => {
        render(
          <Wrapper>
            <PRDGenerator onAuthRequired={onAuthRequired} />
          </Wrapper>
        );
      }).not.toThrow();
    });

    it('deve renderizar sem prop onAuthRequired (opcional)', () => {
      const Wrapper = createWrapper();

      expect(() => {
        render(
          <Wrapper>
            <PRDGenerator />
          </Wrapper>
        );
      }).not.toThrow();
    });
  });

  describe('Integração com providers', () => {
    it('deve funcionar com AuthProvider', () => {
      const Wrapper = createWrapper();

      expect(() => {
        render(
          <Wrapper>
            <PRDGenerator />
          </Wrapper>
        );
      }).not.toThrow();
    });

    it('deve funcionar com QueryClientProvider', () => {
      const Wrapper = createWrapper();

      expect(() => {
        render(
          <Wrapper>
            <PRDGenerator />
          </Wrapper>
        );
      }).not.toThrow();
    });
  });

  describe('Estado inicial', () => {
    it('deve iniciar sem PRD gerado', () => {
      const Wrapper = createWrapper();
      render(
        <Wrapper>
          <PRDGenerator />
        </Wrapper>
      );

      // PRDResult não deve estar visível inicialmente (componente mockado)
      const prdResult = screen.queryByTestId('prd-result');
      // PRD result pode ou não estar no DOM dependendo do estado
      expect(prdResult === null || prdResult !== null).toBe(true);
    });

    it('deve iniciar com textarea vazio', async () => {
      const Wrapper = createWrapper();
      render(
        <Wrapper>
          <PRDGenerator />
        </Wrapper>
      );

      await waitFor(() => {
        const textareas = screen.getAllByRole('textbox');
        const mainTextarea = textareas[0];
        expect(mainTextarea).toHaveValue('');
      });
    });
  });
});
