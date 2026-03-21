-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE content ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_meta ENABLE ROW LEVEL SECURITY;
ALTER TABLE podcast_meta ENABLE ROW LEVEL SECURITY;
ALTER TABLE pill_meta ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_meta ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE creator_applications ENABLE ROW LEVEL SECURITY;

-- Helper: current user's role
CREATE OR REPLACE FUNCTION current_user_role()
RETURNS user_role LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT role FROM profiles WHERE id = auth.uid()
$$;

-- profiles
CREATE POLICY "profiles_select_all" ON profiles FOR SELECT USING (true);
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid()
    AND (role = (SELECT role FROM profiles WHERE id = auth.uid()))
  );
CREATE POLICY "profiles_update_role_admin" ON profiles FOR UPDATE
  USING (current_user_role() = 'admin');

-- content
CREATE POLICY "content_select_published" ON content FOR SELECT
  USING (status = 'published');
CREATE POLICY "content_select_own_drafts" ON content FOR SELECT
  USING (author_id = auth.uid());
CREATE POLICY "content_insert_authenticated" ON content FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND author_id = auth.uid());
CREATE POLICY "content_update_own" ON content FOR UPDATE
  USING (author_id = auth.uid() AND current_user_role() != 'admin')
  WITH CHECK (author_id = auth.uid() AND is_featured = false);
CREATE POLICY "content_admin_all" ON content FOR ALL
  USING (current_user_role() = 'admin');

-- content_translations
CREATE POLICY "translations_select_all" ON content_translations FOR SELECT USING (true);

-- video_meta
CREATE POLICY "video_meta_select_all" ON video_meta FOR SELECT USING (true);
CREATE POLICY "video_meta_write_own" ON video_meta FOR ALL
  USING (content_id IN (SELECT id FROM content WHERE author_id = auth.uid()));
CREATE POLICY "video_meta_admin" ON video_meta FOR ALL USING (current_user_role() = 'admin');

-- podcast_meta
CREATE POLICY "podcast_meta_select_all" ON podcast_meta FOR SELECT USING (true);
CREATE POLICY "podcast_meta_write_own" ON podcast_meta FOR ALL
  USING (content_id IN (SELECT id FROM content WHERE author_id = auth.uid()));
CREATE POLICY "podcast_meta_admin" ON podcast_meta FOR ALL USING (current_user_role() = 'admin');

-- pill_meta
CREATE POLICY "pill_meta_select_all" ON pill_meta FOR SELECT USING (true);
CREATE POLICY "pill_meta_write_own" ON pill_meta FOR ALL
  USING (content_id IN (SELECT id FROM content WHERE author_id = auth.uid()));
CREATE POLICY "pill_meta_admin" ON pill_meta FOR ALL USING (current_user_role() = 'admin');

-- course_meta
CREATE POLICY "course_meta_select_all" ON course_meta FOR SELECT USING (true);
CREATE POLICY "course_meta_admin" ON course_meta FOR ALL USING (current_user_role() = 'admin');

-- categories + tags
CREATE POLICY "categories_select_all" ON categories FOR SELECT USING (true);
CREATE POLICY "categories_admin" ON categories FOR ALL USING (current_user_role() = 'admin');
CREATE POLICY "tags_select_all" ON tags FOR SELECT USING (true);
CREATE POLICY "tags_admin" ON tags FOR ALL USING (current_user_role() = 'admin');

-- content_categories + content_tags
CREATE POLICY "content_categories_select" ON content_categories FOR SELECT USING (true);
CREATE POLICY "content_categories_write" ON content_categories FOR ALL
  USING (content_id IN (SELECT id FROM content WHERE author_id = auth.uid()) OR current_user_role() = 'admin');
CREATE POLICY "content_tags_select" ON content_tags FOR SELECT USING (true);
CREATE POLICY "content_tags_write" ON content_tags FOR ALL
  USING (content_id IN (SELECT id FROM content WHERE author_id = auth.uid()) OR current_user_role() = 'admin');

-- likes
CREATE POLICY "likes_select_all" ON likes FOR SELECT USING (true);
CREATE POLICY "likes_insert_own" ON likes FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "likes_delete_own" ON likes FOR DELETE USING (user_id = auth.uid());

-- bookmarks
CREATE POLICY "bookmarks_own" ON bookmarks FOR ALL USING (user_id = auth.uid());

-- follows
CREATE POLICY "follows_select_all" ON follows FOR SELECT USING (true);
CREATE POLICY "follows_insert_own" ON follows FOR INSERT WITH CHECK (follower_id = auth.uid());
CREATE POLICY "follows_delete_own" ON follows FOR DELETE USING (follower_id = auth.uid());

-- creator_applications
CREATE POLICY "applications_insert_own" ON creator_applications FOR INSERT
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "applications_select_own" ON creator_applications FOR SELECT
  USING (user_id = auth.uid());
CREATE POLICY "applications_admin" ON creator_applications FOR ALL
  USING (current_user_role() = 'admin');
