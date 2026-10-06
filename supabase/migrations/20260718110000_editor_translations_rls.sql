-- Editors/admins can create and edit content on behalf of other authors. The
-- original policy only let a content item's own author write its translations
-- (and no other policy covered editors), so creating/editing someone else's
-- content would fail at the translations step.
DROP POLICY IF EXISTS "translations_write_privileged" ON content_translations;
CREATE POLICY "translations_write_privileged" ON content_translations
  FOR ALL
  USING (current_user_role() IN ('admin', 'editor'))
  WITH CHECK (current_user_role() IN ('admin', 'editor'));
