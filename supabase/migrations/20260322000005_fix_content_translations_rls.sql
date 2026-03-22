-- Allow authors to write translations for their own content
CREATE POLICY "translations_write_own" ON content_translations
  FOR ALL
  USING (content_id IN (SELECT id FROM content WHERE author_id = auth.uid()))
  WITH CHECK (content_id IN (SELECT id FROM content WHERE author_id = auth.uid()));
