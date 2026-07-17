-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enums
CREATE TYPE user_role AS ENUM ('admin', 'author', 'user');
CREATE TYPE content_type AS ENUM ('article', 'video', 'podcast', 'pill', 'course');
CREATE TYPE content_status AS ENUM ('draft', 'published');
CREATE TYPE application_status AS ENUM ('pending', 'approved', 'rejected');

-- Profiles (extends auth.users)
CREATE TABLE profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  slug            TEXT UNIQUE NOT NULL,
  display_name    TEXT NOT NULL,
  role            user_role NOT NULL DEFAULT 'user',
  bio             TEXT,
  location        TEXT,
  website         TEXT,
  avatar_url      TEXT,
  followers_count INT NOT NULL DEFAULT 0,
  following_count INT NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO profiles (id, slug, display_name)
  VALUES (
    NEW.id,
    'user-' || substr(NEW.id::text, 1, 8),
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Content
CREATE TABLE content (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type            content_type NOT NULL,
  author_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  slug            TEXT UNIQUE NOT NULL,
  source_locale   TEXT NOT NULL DEFAULT 'en',
  status          content_status NOT NULL DEFAULT 'draft',
  is_featured     BOOLEAN NOT NULL DEFAULT FALSE,
  cover_image_url TEXT,
  likes_count     INT NOT NULL DEFAULT 0,
  published_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;
CREATE TRIGGER content_updated_at
  BEFORE UPDATE ON content
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Content translations
CREATE TABLE content_translations (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id          UUID NOT NULL REFERENCES content(id) ON DELETE CASCADE,
  locale              TEXT NOT NULL,
  title               TEXT NOT NULL,
  excerpt             TEXT,         -- article excerpt
  description         TEXT,         -- video / podcast / course description
  body                JSONB,        -- article / pill rich text (Tiptap JSON)
  is_auto_translated  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (content_id, locale)
);

-- Extension tables
CREATE TABLE video_meta (
  content_id     UUID PRIMARY KEY REFERENCES content(id) ON DELETE CASCADE,
  embed_url      TEXT NOT NULL,
  thumbnail_url  TEXT,
  duration       TEXT
);

CREATE TABLE podcast_meta (
  content_id      UUID PRIMARY KEY REFERENCES content(id) ON DELETE CASCADE,
  embed_url       TEXT NOT NULL,
  cover_image_url TEXT,
  duration        TEXT,
  episode_number  TEXT
);

CREATE TABLE pill_meta (
  content_id   UUID PRIMARY KEY REFERENCES content(id) ON DELETE CASCADE,
  accent_color TEXT NOT NULL DEFAULT '#6B8E23',
  image_url    TEXT
);

CREATE TABLE course_meta (
  content_id        UUID PRIMARY KEY REFERENCES content(id) ON DELETE CASCADE,
  price             NUMERIC NOT NULL DEFAULT 0,
  currency          TEXT NOT NULL DEFAULT 'USD',
  duration          TEXT,
  stripe_product_id TEXT,
  students_count    INT NOT NULL DEFAULT 0,
  rating            NUMERIC CHECK (rating >= 0 AND rating <= 5)
);

-- Categories & tags
CREATE TABLE categories (
  id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug  TEXT UNIQUE NOT NULL,
  names JSONB NOT NULL DEFAULT '{}'
);

CREATE TABLE tags (
  id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug  TEXT UNIQUE NOT NULL,
  names JSONB NOT NULL DEFAULT '{}'
);

CREATE TABLE content_categories (
  content_id  UUID REFERENCES content(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
  PRIMARY KEY (content_id, category_id)
);

CREATE TABLE content_tags (
  content_id UUID REFERENCES content(id) ON DELETE CASCADE,
  tag_id     UUID REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (content_id, tag_id)
);

-- Likes
CREATE TABLE likes (
  user_id    UUID REFERENCES profiles(id) ON DELETE CASCADE,
  content_id UUID REFERENCES content(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, content_id)
);

-- Maintain likes_count via trigger
CREATE OR REPLACE FUNCTION update_likes_count()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE content SET likes_count = likes_count + 1 WHERE id = NEW.content_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE content SET likes_count = GREATEST(0, likes_count - 1) WHERE id = OLD.content_id;
  END IF;
  RETURN NULL;
END;
$$;
CREATE TRIGGER likes_count_trigger
  AFTER INSERT OR DELETE ON likes
  FOR EACH ROW EXECUTE FUNCTION update_likes_count();

-- Bookmarks
CREATE TABLE bookmarks (
  user_id    UUID REFERENCES profiles(id) ON DELETE CASCADE,
  content_id UUID REFERENCES content(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, content_id)
);

-- Follows
CREATE TABLE follows (
  follower_id  UUID REFERENCES profiles(id) ON DELETE CASCADE,
  following_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (follower_id, following_id),
  CHECK (follower_id != following_id)
);

-- Maintain follower/following counts via trigger
CREATE OR REPLACE FUNCTION update_follow_counts()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE profiles SET following_count = following_count + 1 WHERE id = NEW.follower_id;
    UPDATE profiles SET followers_count = followers_count + 1 WHERE id = NEW.following_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE profiles SET following_count = GREATEST(0, following_count - 1) WHERE id = OLD.follower_id;
    UPDATE profiles SET followers_count = GREATEST(0, followers_count - 1) WHERE id = OLD.following_id;
  END IF;
  RETURN NULL;
END;
$$;
CREATE TRIGGER follows_count_trigger
  AFTER INSERT OR DELETE ON follows
  FOR EACH ROW EXECUTE FUNCTION update_follow_counts();

-- Creator applications
CREATE TABLE creator_applications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  message     TEXT NOT NULL,
  status      application_status NOT NULL DEFAULT 'pending',
  admin_notes TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES profiles(id)
);

-- Homepage feed view (admin + author content only)
CREATE VIEW homepage_feed AS
SELECT c.*
FROM content c
JOIN profiles p ON p.id = c.author_id
WHERE c.status = 'published'
  AND p.role IN ('admin', 'author')
ORDER BY c.is_featured DESC, c.published_at DESC;

-- Full-text search index on content_translations
ALTER TABLE content_translations
  ADD COLUMN search_vector TSVECTOR
    GENERATED ALWAYS AS (
      to_tsvector('english', COALESCE(title, '') || ' ' || COALESCE(excerpt, '') || ' ' || COALESCE(description, ''))
    ) STORED;

CREATE INDEX content_translations_search_idx
  ON content_translations USING GIN (search_vector);
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
-- Add suspended_at to profiles
-- NULL = active, non-null = suspended since that timestamp
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ NULL DEFAULT NULL;
-- Re-create the handle_new_user trigger function and trigger.
-- This ensures the trigger exists even if the initial schema migration
-- was partially applied before the uuid_generate_v4 fix.

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO profiles (id, slug, display_name)
  VALUES (
    NEW.id,
    'user-' || substr(NEW.id::text, 1, 8),
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
-- SECURITY DEFINER functions need explicit search_path to find public schema tables.
-- Without SET search_path = public, the trigger cannot resolve 'profiles'.
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO profiles (id, slug, display_name)
  VALUES (
    NEW.id,
    'user-' || substr(NEW.id::text, 1, 8),
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$;
-- Allow authors to write translations for their own content
CREATE POLICY "translations_write_own" ON content_translations
  FOR ALL
  USING (content_id IN (SELECT id FROM content WHERE author_id = auth.uid()))
  WITH CHECK (content_id IN (SELECT id FROM content WHERE author_id = auth.uid()));
-- Allow authors to write course meta for their own content (was missing)
CREATE POLICY "course_meta_write_own" ON course_meta FOR ALL
  USING (content_id IN (SELECT id FROM content WHERE author_id = auth.uid()))
  WITH CHECK (content_id IN (SELECT id FROM content WHERE author_id = auth.uid()));
ALTER TABLE content ADD COLUMN IF NOT EXISTS image_credits TEXT;
-- Fix content_update_own: WITH CHECK (is_featured = false) blocked all updates
-- on featured articles, even when not changing is_featured. Authors should be
-- able to update their own content freely; admins control is_featured via admin panel.
DROP POLICY "content_update_own" ON content;

CREATE POLICY "content_update_own" ON content FOR UPDATE
  USING (author_id = auth.uid() AND current_user_role() != 'admin')
  WITH CHECK (author_id = auth.uid());
ALTER TABLE content ADD COLUMN IF NOT EXISTS read_time_minutes INTEGER;
-- Create buckets
INSERT INTO storage.buckets (id, name, public)
VALUES
  ('content-images', 'content-images', true),
  ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- content-images: authenticated users can upload to their own sub-folder
CREATE POLICY "Authenticated users can upload content images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'content-images' AND (storage.foldername(name))[2] = auth.uid()::text);

CREATE POLICY "Authenticated users can update their content images"
ON storage.objects FOR UPDATE TO authenticated
USING     (bucket_id = 'content-images' AND (storage.foldername(name))[2] = auth.uid()::text)
WITH CHECK (bucket_id = 'content-images' AND (storage.foldername(name))[2] = auth.uid()::text);

CREATE POLICY "Public read for content images"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'content-images');

-- avatars: authenticated users can upload/replace their own avatar only
CREATE POLICY "Authenticated users can upload their avatar"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'avatars' AND name = auth.uid()::text || '.webp');

CREATE POLICY "Authenticated users can update their avatar"
ON storage.objects FOR UPDATE TO authenticated
USING     (bucket_id = 'avatars' AND name = auth.uid()::text || '.webp')
WITH CHECK (bucket_id = 'avatars' AND name = auth.uid()::text || '.webp');

CREATE POLICY "Public read for avatars"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'avatars');
-- Make handle_new_user trigger idempotent so seed migrations can re-run safely.
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO profiles (id, slug, display_name)
  VALUES (
    NEW.id,
    'user-' || substr(NEW.id::text, 1, 8),
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;
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
-- Add enhanced video editor fields to video_meta
ALTER TABLE video_meta
  ADD COLUMN IF NOT EXISTS chapters      JSONB   NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS layout_style  TEXT    NOT NULL DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS show_transcript BOOLEAN NOT NULL DEFAULT false;
-- Add transcript storage to video_meta
ALTER TABLE video_meta
  ADD COLUMN IF NOT EXISTS transcript JSONB DEFAULT NULL;
-- Add per-locale translated transcript cues to video_meta
-- Structure: { "es": [{start, text}, ...], "fr": [...] }
ALTER TABLE video_meta
  ADD COLUMN IF NOT EXISTS transcript_translations JSONB DEFAULT NULL;
ALTER TABLE video_meta
  ADD COLUMN IF NOT EXISTS chapter_translations JSONB DEFAULT NULL;
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS profile_translations JSONB DEFAULT NULL;
-- Static CMS pages (e.g. /about, /contact) with translations and optional footer links

CREATE TABLE static_pages (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                TEXT UNIQUE NOT NULL,
  status              content_status NOT NULL DEFAULT 'draft',
  show_in_footer      BOOLEAN NOT NULL DEFAULT FALSE,
  footer_sort_order   INT NOT NULL DEFAULT 0,
  published_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER static_pages_updated_at
  BEFORE UPDATE ON static_pages
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE static_page_translations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  static_page_id  UUID NOT NULL REFERENCES static_pages(id) ON DELETE CASCADE,
  locale          TEXT NOT NULL,
  title           TEXT NOT NULL,
  body            JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (static_page_id, locale)
);

CREATE INDEX static_pages_footer_idx
  ON static_pages (footer_sort_order)
  WHERE status = 'published' AND show_in_footer = TRUE;

ALTER TABLE static_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE static_page_translations ENABLE ROW LEVEL SECURITY;

-- Published pages: public read
CREATE POLICY "static_pages_select_published" ON static_pages FOR SELECT
  USING (status = 'published');

CREATE POLICY "static_pages_admin_all" ON static_pages FOR ALL
  USING (current_user_role() = 'admin')
  WITH CHECK (current_user_role() = 'admin');

-- Translations: read rows for published pages, or admin reads all
CREATE POLICY "static_page_tr_select_published" ON static_page_translations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM static_pages sp
      WHERE sp.id = static_page_translations.static_page_id
        AND sp.status = 'published'
    )
  );

CREATE POLICY "static_page_tr_select_admin" ON static_page_translations FOR SELECT
  USING (current_user_role() = 'admin');

CREATE POLICY "static_page_tr_insert_admin" ON static_page_translations FOR INSERT
  WITH CHECK (current_user_role() = 'admin');

CREATE POLICY "static_page_tr_update_admin" ON static_page_translations FOR UPDATE
  USING (current_user_role() = 'admin')
  WITH CHECK (current_user_role() = 'admin');

CREATE POLICY "static_page_tr_delete_admin" ON static_page_translations FOR DELETE
  USING (current_user_role() = 'admin');
-- Singleton JSON document for platform / marketing settings (admin-editable)

CREATE TABLE platform_settings (
  id          text PRIMARY KEY DEFAULT 'default',
  settings    jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER platform_settings_updated_at
  BEFORE UPDATE ON platform_settings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

INSERT INTO platform_settings (id, settings) VALUES ('default', '{}')
ON CONFLICT (id) DO NOTHING;

ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "platform_settings_select_all" ON platform_settings FOR SELECT USING (true);

CREATE POLICY "platform_settings_insert_admin" ON platform_settings FOR INSERT
  WITH CHECK (current_user_role() = 'admin');

CREATE POLICY "platform_settings_update_admin" ON platform_settings FOR UPDATE
  USING (current_user_role() = 'admin')
  WITH CHECK (current_user_role() = 'admin');

CREATE POLICY "platform_settings_delete_admin" ON platform_settings FOR DELETE
  USING (current_user_role() = 'admin');
