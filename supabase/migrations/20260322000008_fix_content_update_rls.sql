-- Fix content_update_own: WITH CHECK (is_featured = false) blocked all updates
-- on featured articles, even when not changing is_featured. Authors should be
-- able to update their own content freely; admins control is_featured via admin panel.
DROP POLICY "content_update_own" ON content;

CREATE POLICY "content_update_own" ON content FOR UPDATE
  USING (author_id = auth.uid() AND current_user_role() != 'admin')
  WITH CHECK (author_id = auth.uid());
