-- Adicionar coluna acquisition_metadata em event_participants
ALTER TABLE event_participants 
ADD COLUMN acquisition_metadata JSONB DEFAULT NULL;

-- Criar índice para performance em queries JSONB
CREATE INDEX idx_event_participants_acquisition_metadata 
ON event_participants USING gin(acquisition_metadata);

COMMENT ON COLUMN event_participants.acquisition_metadata IS 'Dados de aquisição (UTM params, referrer, etc) capturados no momento do registro no evento';