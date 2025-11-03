-- Adicionar campos de configuração de duração ao event_broadcast_state
ALTER TABLE event_broadcast_state
ADD COLUMN pitch_duration_seconds integer DEFAULT 300,
ADD COLUMN voting_duration_seconds integer DEFAULT 120,
ADD COLUMN pitch_closes_at timestamp with time zone;