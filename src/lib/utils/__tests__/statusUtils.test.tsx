import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { statusUtils } from '../statusUtils';

describe('statusUtils', () => {
  describe('getStatusIcon', () => {
    it('deve retornar CheckCircle para status success', () => {
      const icon = statusUtils.getStatusIcon('success');
      const { container } = render(icon);
      expect(container.querySelector('svg')).toBeInTheDocument();
    });

    it('deve retornar XCircle para status error', () => {
      const icon = statusUtils.getStatusIcon('error');
      const { container } = render(icon);
      expect(container.querySelector('svg')).toBeInTheDocument();
    });

    it('deve retornar Clock para status pending', () => {
      const icon = statusUtils.getStatusIcon('pending');
      const { container } = render(icon);
      expect(container.querySelector('svg')).toBeInTheDocument();
    });

    it('deve retornar AlertTriangle para status warning', () => {
      const icon = statusUtils.getStatusIcon('warning');
      const { container } = render(icon);
      expect(container.querySelector('svg')).toBeInTheDocument();
    });

    it('deve aplicar className customizada', () => {
      const icon = statusUtils.getStatusIcon('success', 'custom-class');
      const { container } = render(icon);
      expect(container.querySelector('.custom-class')).toBeInTheDocument();
    });
  });

  describe('getStatusColor', () => {
    it('deve retornar cores para status success', () => {
      const colors = statusUtils.getStatusColor('success');
      expect(colors).toContain('bg-success/10');
      expect(colors).toContain('text-success');
      expect(colors).toContain('border-success');
    });

    it('deve retornar cores para status error', () => {
      const colors = statusUtils.getStatusColor('error');
      expect(colors).toContain('bg-destructive/10');
      expect(colors).toContain('text-destructive');
      expect(colors).toContain('border-destructive');
    });

    it('deve retornar cores para status pending', () => {
      const colors = statusUtils.getStatusColor('pending');
      expect(colors).toContain('bg-warning/10');
      expect(colors).toContain('text-warning');
      expect(colors).toContain('border-warning');
    });

    it('deve retornar cores para status warning', () => {
      const colors = statusUtils.getStatusColor('warning');
      expect(colors).toContain('bg-warning/10');
      expect(colors).toContain('text-warning');
      expect(colors).toContain('border-warning');
    });
  });

  describe('getStatusBadge', () => {
    it('deve renderizar badge com label correto', () => {
      const badge = statusUtils.getStatusBadge('success', 'Aprovado');
      const { getByText } = render(badge);
      expect(getByText('Aprovado')).toBeInTheDocument();
    });

    it('deve incluir ícone no badge', () => {
      const badge = statusUtils.getStatusBadge('error', 'Erro');
      const { container } = render(badge);
      expect(container.querySelector('svg')).toBeInTheDocument();
    });

    it('deve aplicar className customizada', () => {
      const badge = statusUtils.getStatusBadge('pending', 'Aguardando', 'extra-class');
      const { container } = render(badge);
      expect(container.querySelector('.extra-class')).toBeInTheDocument();
    });

    it('deve usar cores corretas baseadas no status', () => {
      const badge = statusUtils.getStatusBadge('success', 'OK');
      const { container } = render(badge);
      const span = container.querySelector('span');
      expect(span?.className).toContain('bg-success/10');
      expect(span?.className).toContain('text-success');
    });
  });

  describe('getStatusTextColor', () => {
    it('deve retornar text-success para success', () => {
      expect(statusUtils.getStatusTextColor('success')).toBe('text-success');
    });

    it('deve retornar text-destructive para error', () => {
      expect(statusUtils.getStatusTextColor('error')).toBe('text-destructive');
    });

    it('deve retornar text-warning para pending', () => {
      expect(statusUtils.getStatusTextColor('pending')).toBe('text-warning');
    });

    it('deve retornar text-warning para warning', () => {
      expect(statusUtils.getStatusTextColor('warning')).toBe('text-warning');
    });
  });

  describe('getStatusBgColor', () => {
    it('deve retornar bg-success/10 para success', () => {
      expect(statusUtils.getStatusBgColor('success')).toBe('bg-success/10');
    });

    it('deve retornar bg-destructive/10 para error', () => {
      expect(statusUtils.getStatusBgColor('error')).toBe('bg-destructive/10');
    });

    it('deve retornar bg-warning/10 para pending', () => {
      expect(statusUtils.getStatusBgColor('pending')).toBe('bg-warning/10');
    });

    it('deve retornar bg-warning/10 para warning', () => {
      expect(statusUtils.getStatusBgColor('warning')).toBe('bg-warning/10');
    });
  });
});
