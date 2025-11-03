-- Create function to extract description preview from document
CREATE OR REPLACE FUNCTION extract_description_preview(document TEXT)
RETURNS TEXT AS $$
DECLARE
  preview TEXT;
  first_line TEXT;
BEGIN
  -- Try to find "Descrição concisa" (case-insensitive, with or without accents)
  preview := substring(document FROM '[-•]\s*[Dd]escri[çc][ãa]o concisa[:\s]+([^\n]+)');
  
  IF preview IS NOT NULL AND trim(preview) != '' THEN
    preview := trim(preview);
    IF length(preview) > 300 THEN
      RETURN substring(preview, 1, 300) || '...';
    ELSE
      RETURN preview;
    END IF;
  END IF;
  
  -- Fallback: get first non-empty line
  SELECT line INTO first_line
  FROM unnest(string_to_array(document, E'\n')) AS line
  WHERE trim(line) != ''
  LIMIT 1;
  
  IF first_line IS NOT NULL THEN
    IF length(first_line) > 300 THEN
      RETURN substring(first_line, 1, 300) || '...';
    ELSE
      RETURN first_line;
    END IF;
  END IF;
  
  RETURN 'Documento sem preview';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Update all existing documents with new previews
UPDATE document_history
SET idea_preview = extract_description_preview(full_document)
WHERE full_document IS NOT NULL;