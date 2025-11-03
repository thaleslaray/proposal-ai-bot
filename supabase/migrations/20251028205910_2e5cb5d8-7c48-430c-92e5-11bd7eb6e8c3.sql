-- Adicionar coluna de tamanho do logo dos realizadores
ALTER TABLE public.events 
ADD COLUMN logo_size TEXT DEFAULT 'small';

-- Adicionar constraint para validar valores
ALTER TABLE public.events
ADD CONSTRAINT logo_size_check 
CHECK (logo_size IN ('small', 'medium', 'large'));

-- Comentário explicativo
COMMENT ON COLUMN public.events.logo_size IS 'Tamanho dos logos dos realizadores: small (h-8/10), medium (h-12/16), large (h-16/20)';