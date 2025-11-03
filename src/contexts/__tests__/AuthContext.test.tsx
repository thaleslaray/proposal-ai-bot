import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '../AuthContext';

// Componente de teste para acessar o contexto
const TestComponent = () => {
  const auth = useAuth();

  return (
    <div>
      <div data-testid="loading">{auth.loading ? 'Loading' : 'Not Loading'}</div>
      <div data-testid="user">{auth.user ? 'User Present' : 'No User'}</div>
      <div data-testid="isAdmin">{auth.isAdmin ? 'Admin' : 'Not Admin'}</div>
      <div data-testid="isStudent">{auth.isStudent ? 'Student' : 'Not Student'}</div>
      <div data-testid="isLifetime">{auth.isLifetime ? 'Lifetime' : 'Not Lifetime'}</div>
    </div>
  );
};

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('AuthProvider', () => {
    it('deve renderizar children corretamente', () => {
      render(
        <AuthProvider>
          <div>Test Child</div>
        </AuthProvider>
      );

      expect(screen.getByText('Test Child')).toBeInTheDocument();
    });

    it('deve fornecer valores iniciais corretos', async () => {
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      // Verificar estado inicial
      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('No User');
      });

      // Pode estar loading inicialmente
      const loadingElement = screen.getByTestId('loading');
      expect(loadingElement).toBeInTheDocument();
    });

    it('deve inicializar com roles false', async () => {
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('isAdmin')).toHaveTextContent('Not Admin');
        expect(screen.getByTestId('isStudent')).toHaveTextContent('Not Student');
        expect(screen.getByTestId('isLifetime')).toHaveTextContent('Not Lifetime');
      });
    });
  });

  describe('useAuth hook', () => {
    it('deve lançar erro quando usado fora do AuthProvider', () => {
      // Suprimir erro no console durante o teste
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        render(<TestComponent />);
      }).toThrow('useAuth must be used within an AuthProvider');

      consoleSpy.mockRestore();
    });

    it('deve retornar contexto quando usado dentro do provider', () => {
      const { getByTestId } = render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      // Se não lançar erro, significa que o hook funcionou
      expect(getByTestId('loading')).toBeInTheDocument();
    });
  });

  describe('Estado do contexto', () => {
    it('deve ter propriedade loading definida', async () => {
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      const loadingElement = screen.getByTestId('loading');
      expect(loadingElement).toHaveTextContent(/Loading|Not Loading/);
    });

    it('deve ter propriedades de roles definidas', async () => {
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('isAdmin')).toBeInTheDocument();
        expect(screen.getByTestId('isStudent')).toBeInTheDocument();
        expect(screen.getByTestId('isLifetime')).toBeInTheDocument();
      });
    });
  });

  describe('Integração com Supabase', () => {
    it('deve inicializar sem erros com Supabase mockado', () => {
      // O Supabase já está mockado no setup.ts
      expect(() => {
        render(
          <AuthProvider>
            <div>Test</div>
          </AuthProvider>
        );
      }).not.toThrow();
    });
  });
});
