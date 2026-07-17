-- Extend RLS policies so the new 'editor' role has the same cross-author
-- content reach as 'admin', plus a DB-level guard preventing editors from
-- granting the admin role or touching existing admin accounts (role change,
-- ban/suspend). Editors do NOT get static_pages / platform_settings /
-- categories / tags / creator_applications admin access — those stay
-- admin-only and are intentionally left untouched.

-- content: admin-or-editor can create/edit/publish/feature any author's content
DROP POLICY IF EXISTS "content_admin_all" ON content;
CREATE POLICY "content_privileged_all" ON content FOR ALL
  USING (current_user_role() IN ('admin', 'editor'));

DROP POLICY IF EXISTS "content_update_own" ON content;
CREATE POLICY "content_update_own" ON content FOR UPDATE
  USING (author_id = auth.uid() AND NOT (current_user_role() IN ('admin', 'editor')))
  WITH CHECK (author_id = auth.uid() AND is_featured = false);

-- extension tables: same admin-or-editor reach
DROP POLICY IF EXISTS "video_meta_admin" ON video_meta;
CREATE POLICY "video_meta_admin" ON video_meta FOR ALL
  USING (current_user_role() IN ('admin', 'editor'));

DROP POLICY IF EXISTS "podcast_meta_admin" ON podcast_meta;
CREATE POLICY "podcast_meta_admin" ON podcast_meta FOR ALL
  USING (current_user_role() IN ('admin', 'editor'));

DROP POLICY IF EXISTS "pill_meta_admin" ON pill_meta;
CREATE POLICY "pill_meta_admin" ON pill_meta FOR ALL
  USING (current_user_role() IN ('admin', 'editor'));

DROP POLICY IF EXISTS "course_meta_admin" ON course_meta;
CREATE POLICY "course_meta_admin" ON course_meta FOR ALL
  USING (current_user_role() IN ('admin', 'editor'));

-- content_categories / content_tags: editors can tag/categorize any content
DROP POLICY IF EXISTS "content_categories_write" ON content_categories;
CREATE POLICY "content_categories_write" ON content_categories FOR ALL
  USING (content_id IN (SELECT id FROM content WHERE author_id = auth.uid()) OR current_user_role() IN ('admin', 'editor'));

DROP POLICY IF EXISTS "content_tags_write" ON content_tags;
CREATE POLICY "content_tags_write" ON content_tags FOR ALL
  USING (content_id IN (SELECT id FROM content WHERE author_id = auth.uid()) OR current_user_role() IN ('admin', 'editor'));

-- profiles: editors can change roles/ban non-admin accounts, but can never
-- grant 'admin' (WITH CHECK) or touch a row that is currently 'admin' (USING).
DROP POLICY IF EXISTS "profiles_update_role_admin" ON profiles;
CREATE POLICY "profiles_update_role_privileged" ON profiles FOR UPDATE
  USING (current_user_role() = 'admin' OR (current_user_role() = 'editor' AND role <> 'admin'))
  WITH CHECK (current_user_role() = 'admin' OR (current_user_role() = 'editor' AND role <> 'admin'));

-- homepage feed: editors' own published content should appear like an author's
CREATE OR REPLACE VIEW homepage_feed AS
SELECT c.*
FROM content c
JOIN profiles p ON p.id = c.author_id
WHERE c.status = 'published'
  AND p.role IN ('admin', 'author', 'editor')
ORDER BY c.is_featured DESC, c.published_at DESC;
