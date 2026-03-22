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
