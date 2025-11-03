import { supabase } from '@/integrations/supabase/client';

/**
 * Redimensiona uma imagem mantendo proporções.
 * Usa canvas HTML5 para processar a imagem no lado do cliente.
 * 
 * @param file - Arquivo de imagem original
 * @param maxWidth - Largura máxima em pixels
 * @param maxHeight - Altura máxima em pixels
 * @returns Promise que resolve com Blob da imagem redimensionada
 * 
 * @throws {Error} Se houver erro ao processar a imagem
 * 
 * @example
 * ```typescript
 * const file = event.target.files[0];
 * const resizedBlob = await resizeImage(file, 400, 400);
 * ```
 * 
 * @remarks
 * - Mantém aspect ratio original
 * - Reduz apenas se a imagem for maior que max dimensions
 * - Preserva o tipo MIME original (JPEG, PNG, etc)
 * - Processa no browser, não requer backend
 */
export const resizeImage = (file: File, maxWidth: number, maxHeight: number): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      let width = img.width;
      let height = img.height;
      
      if (width > height) {
        if (width > maxWidth) {
          height *= maxWidth / width;
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width *= maxHeight / height;
          height = maxHeight;
        }
      }
      
      canvas.width = width;
      canvas.height = height;
      ctx?.drawImage(img, 0, 0, width, height);
      
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Erro ao processar imagem'));
      }, file.type);
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
};

/**
 * Faz upload de avatar para Supabase Storage com validação e redimensionamento.
 * Deleta avatar anterior, redimensiona para 400x400px e faz upload do novo.
 * 
 * @param file - Arquivo de imagem selecionado pelo usuário
 * @param userId - UUID do usuário (usado para criar path único)
 * @returns Promise que resolve com URL pública da imagem
 * 
 * @throws {Error} 'Arquivo deve ser uma imagem' - se não for tipo image/*
 * @throws {Error} 'Imagem deve ter no máximo 2MB' - se exceder 2MB
 * @throws Error do Supabase Storage em caso de falha no upload
 * 
 * @example
 * ```typescript
 * try {
 *   const avatarUrl = await uploadAvatar(file, user.id);
 *   // Atualizar profile com avatarUrl
 * } catch (error) {
 *   toast.error(error.message);
 * }
 * ```
 * 
 * @remarks
 * - Valida tipo MIME (deve ser image/*)
 * - Valida tamanho (máx 2MB)
 * - Redimensiona para 400x400px (mantém aspect ratio)
 * - Deleta avatar anterior automaticamente
 * - Path: `{userId}/avatar.{extensão}`
 * - Retorna URL pública pronta para uso
 */
export const uploadAvatar = async (file: File, userId: string): Promise<string> => {
  // Validações
  if (!file.type.startsWith('image/')) {
    throw new Error('Arquivo deve ser uma imagem');
  }
  
  if (file.size > 2 * 1024 * 1024) {
    throw new Error('Imagem deve ter no máximo 2MB');
  }
  
  // Redimensionar imagem para 400x400
  const resizedBlob = await resizeImage(file, 400, 400);
  
  // Upload para Supabase Storage
  const fileExt = file.name.split('.').pop();
  const filePath = `${userId}/avatar.${fileExt}`;
  
  // Deletar avatar antigo se existir
  await supabase.storage
    .from('avatars')
    .remove([filePath]);
  
  // Upload novo avatar
  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(filePath, resizedBlob, { 
      upsert: true,
      contentType: file.type
    });
  
  if (uploadError) throw uploadError;
  
  // Obter URL pública
  const { data: { publicUrl } } = supabase.storage
    .from('avatars')
    .getPublicUrl(filePath);
  
  return publicUrl;
};
