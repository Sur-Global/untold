-- Add featured_summary to content_translations (translatable)
ALTER TABLE content_translations
  ADD COLUMN IF NOT EXISTS featured_summary TEXT;

-- Add feature_requested_at to content (author requests featuring)
ALTER TABLE content
  ADD COLUMN IF NOT EXISTS feature_requested_at TIMESTAMPTZ;

-- Allow any authenticated user to insert tags
-- (creators can add tags for their content; admins already have full access)
CREATE POLICY "tags_insert_creator"
  ON tags FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
