-- Adicionar colunas para controle manual de eventos
ALTER TABLE events 
ADD COLUMN manual_start_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN event_visibility TEXT DEFAULT 'public' CHECK (event_visibility IN ('public', 'public_ended', 'hidden', 'scheduled_removal')),
ADD COLUMN unpublish_date TIMESTAMPTZ DEFAULT NULL;

COMMENT ON COLUMN events.manual_start_enabled IS 'Se true, permite iniciar evento antes da data programada';
COMMENT ON COLUMN events.event_visibility IS 'public = visível | public_ended = mostra como encerrado | hidden = escondido | scheduled_removal = remove na data programada';
COMMENT ON COLUMN events.unpublish_date IS 'Data para despublicar automaticamente (usado com scheduled_removal)';