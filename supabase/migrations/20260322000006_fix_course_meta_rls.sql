-- Allow authors to write course meta for their own content (was missing)
CREATE POLICY "course_meta_write_own" ON course_meta FOR ALL
  USING (content_id IN (SELECT id FROM content WHERE author_id = auth.uid()))
  WITH CHECK (content_id IN (SELECT id FROM content WHERE author_id = auth.uid()));
