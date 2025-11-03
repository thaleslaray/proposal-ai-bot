-- Create document_history table to store all generated documents
CREATE TABLE public.document_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  idea_preview TEXT NOT NULL,
  full_document TEXT NOT NULL,
  document_length INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes for better performance
CREATE INDEX idx_document_history_user_id ON public.document_history(user_id);
CREATE INDEX idx_document_history_created_at ON public.document_history(created_at DESC);

-- Enable RLS
ALTER TABLE public.document_history ENABLE ROW LEVEL SECURITY;

-- Admins can view all documents
CREATE POLICY "Admins can view all documents"
  ON public.document_history FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Users can view their own documents
CREATE POLICY "Users can view own documents"
  ON public.document_history FOR SELECT
  USING (auth.uid() = user_id);

-- Service role can insert documents (for edge functions)
CREATE POLICY "Service role can insert documents"
  ON public.document_history FOR INSERT
  WITH CHECK (true);