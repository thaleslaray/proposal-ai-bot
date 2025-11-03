import { describe, it, expect, vi } from 'vitest';
import { formatDateBR, exportToCSV, generateFilename } from '../csvExport';

interface MockHTMLAnchorElement {
  href: string;
  download: string;
  click: () => void;
  style: Record<string, unknown>;
  setAttribute: (name: string, value: string) => void;
}

interface MockHTMLBody {
  appendChild: (node: unknown) => void;
  removeChild: (node: unknown) => void;
}

describe('formatDateBR', () => {
  it('deve formatar data ISO no padrão brasileiro com hora', () => {
    const result = formatDateBR('2024-03-15T14:30:00');
    expect(result).toBe('15/03/2024 14:30');
  });

  it('deve formatar com zero à esquerda', () => {
    const result = formatDateBR('2024-01-05T09:05:00');
    expect(result).toBe('05/01/2024 09:05');
  });

  it('deve retornar "—" para valores null/undefined', () => {
    expect(formatDateBR(null)).toBe('—');
    expect(formatDateBR(undefined)).toBe('—');
  });

  it('deve retornar "—" para datas inválidas', () => {
    expect(formatDateBR('invalid-date')).toBe('—');
    expect(formatDateBR('')).toBe('—');
  });
});

describe('exportToCSV', () => {
  it('deve criar link de download com nome correto', () => {
    const data = [{ id: 1, name: 'Test' }];

    const mockLink: MockHTMLAnchorElement = {
      href: '',
      download: '',
      click: vi.fn(),
      style: {},
      setAttribute: vi.fn(),
    };

    const mockBody: MockHTMLBody = {
      appendChild: vi.fn(),
      removeChild: vi.fn(),
    };

    vi.spyOn(document, 'createElement').mockReturnValue(mockLink as unknown as HTMLElement);
    vi.spyOn(document, 'body', 'get').mockReturnValue(mockBody as unknown as HTMLElement);

    global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
    global.URL.revokeObjectURL = vi.fn();

    exportToCSV(data, 'test-file.csv');

    expect(mockLink.setAttribute).toHaveBeenCalledWith('download', 'test-file.csv');
    expect(mockLink.click).toHaveBeenCalled();
    expect(mockBody.appendChild).toHaveBeenCalled();
    expect(mockBody.removeChild).toHaveBeenCalled();
  });

  it('deve não fazer nada para array vazio', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    exportToCSV([], 'empty');

    expect(consoleSpy).toHaveBeenCalledWith('No data to export');
  });

  it('deve usar headers customizados', () => {
    const data = [{ id: 1, name: 'Test', extra: 'data' }];

    const mockLink: MockHTMLAnchorElement = {
      href: '',
      download: '',
      click: vi.fn(),
      style: {},
      setAttribute: vi.fn(),
    };

    const mockBody: MockHTMLBody = {
      appendChild: vi.fn(),
      removeChild: vi.fn(),
    };

    vi.spyOn(document, 'createElement').mockReturnValue(mockLink as unknown as HTMLElement);
    vi.spyOn(document, 'body', 'get').mockReturnValue(mockBody as unknown as HTMLElement);

    global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');

    exportToCSV(data, 'test.csv', ['id', 'name']);

    expect(mockLink.click).toHaveBeenCalled();
  });
});

describe('generateFilename', () => {
  it('deve gerar nome com timestamp', () => {
    const filename = generateFilename('usuarios');

    expect(filename).toMatch(/^usuarios_\d{4}-\d{2}-\d{2}_\d{6}\.csv$/);
  });

  it('deve aceitar extensão customizada', () => {
    const filename = generateFilename('relatorio', 'xlsx');

    expect(filename).toMatch(/^relatorio_\d{4}-\d{2}-\d{2}_\d{6}\.xlsx$/);
  });
});
