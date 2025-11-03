-- Add logo_url column to events table
ALTER TABLE public.events
ADD COLUMN logo_url TEXT;

-- Create bucket for event logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('event-logos', 'event-logos', true);

-- RLS policies for event logos bucket
CREATE POLICY "Event logos are publicly accessible"
ON storage.objects
FOR SELECT
USING (bucket_id = 'event-logos');

CREATE POLICY "Admins can upload event logos"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'event-logos' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can update event logos"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'event-logos' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can delete event logos"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'event-logos' 
  AND has_role(auth.uid(), 'admin'::app_role)
);