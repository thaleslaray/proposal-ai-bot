-- Add organizers_logos column to events table
ALTER TABLE public.events 
ADD COLUMN organizers_logos JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.events.organizers_logos IS 
'Array de objetos com logos dos realizadores: [{"name": "ECOA", "url": "https://..."}]';