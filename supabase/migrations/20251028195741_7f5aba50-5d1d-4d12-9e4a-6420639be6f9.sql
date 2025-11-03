-- Add duration_hours column to events table
ALTER TABLE public.events 
ADD COLUMN duration_hours integer;

-- Add comment to explain the field
COMMENT ON COLUMN public.events.duration_hours IS 'Duration of the event in hours. When set, event runs from start_date for this many hours. If NULL, uses end_date instead.';
