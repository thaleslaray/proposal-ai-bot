import { describe, it, expect, vi, beforeEach } from 'vitest';
import { resizeImage, uploadAvatar } from '../avatarUpload';

interface MockCanvas {
  width: number;
  height: number;
  getContext: () => { drawImage: () => void };
  toBlob: (callback: (blob: Blob) => void) => void;
}

interface MockImage {
  onload: (() => void) | null;
  onerror: (() => void) | null;
  src: string;
  width: number;
  height: number;
}

interface MockFileReader {
  readAsDataURL: (file: Blob) => void;
  onload: ((event: { target: { result: string } }) => void) | null;
  onerror: (() => void) | null;
}

// Mock canvas and image
const mockCanvas: MockCanvas = {
  width: 0,
  height: 0,
  getContext: vi.fn(() => ({
    drawImage: vi.fn(),
  })),
  toBlob: vi.fn(callback => {
    callback(new Blob(['fake-image-data'], { type: 'image/jpeg' }));
  }),
};

describe('resizeImage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock document.createElement
    global.document.createElement = vi.fn(tag => {
      if (tag === 'canvas') return mockCanvas as unknown as HTMLCanvasElement;
      if (tag === 'img') {
        const img: MockImage = {
          onload: null,
          onerror: null,
          src: '',
          width: 800,
          height: 600,
        };
        // Simular carregamento da imagem
        setTimeout(() => {
          if (img.onload) img.onload();
        }, 0);
        return img as unknown as HTMLImageElement;
      }
      return {} as HTMLElement;
    });

    // Mock FileReader
    global.FileReader = vi.fn().mockImplementation(() => {
      const reader: MockFileReader = {
        readAsDataURL: vi.fn(function (this: MockFileReader) {
          setTimeout(() => {
            if (this.onload) {
              this.onload({ target: { result: 'data:image/jpeg;base64,fake' } });
            }
          }, 0);
        }),
        onload: null,
        onerror: null,
      };
      return reader;
    }) as unknown as typeof FileReader;
  });

  it('deve redimensionar imagem para 400x400', async () => {
    const file = new File(['fake'], 'avatar.jpg', { type: 'image/jpeg' });
    const result = await resizeImage(file, 400, 400);

    expect(result).toBeInstanceOf(Blob);
    expect(result.type).toBe('image/jpeg');
  });

  it('deve aceitar dimensões customizadas', async () => {
    const file = new File(['fake'], 'avatar.jpg', { type: 'image/jpeg' });
    const result = await resizeImage(file, 200, 200);

    expect(result).toBeInstanceOf(Blob);
  });

  it('deve preservar tipo MIME', async () => {
    const file = new File(['fake'], 'avatar.png', { type: 'image/png' });
    const result = await resizeImage(file, 400, 400);

    expect(result.type).toBe('image/png');
  });
});

describe('uploadAvatar', () => {
  it('deve rejeitar tipo de arquivo inválido', async () => {
    const file = new File(['fake'], 'doc.pdf', { type: 'application/pdf' });
    const userId = 'user-123';

    await expect(uploadAvatar(file, userId)).rejects.toThrow('Arquivo deve ser uma imagem');
  });

  it('deve rejeitar arquivo muito grande', async () => {
    const largeData = new Uint8Array(3 * 1024 * 1024); // 3MB (limite é 2MB)
    const file = new File([largeData], 'large.jpg', { type: 'image/jpeg' });
    const userId = 'user-123';

    await expect(uploadAvatar(file, userId)).rejects.toThrow('Imagem deve ter no máximo 2MB');
  });
});
