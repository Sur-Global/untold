-- Three independent editorial placements for published content:
--   is_featured       (★) top of the content type's own page (/podcasts, /videos…) — 3 per type
--   is_home_featured  (⌂) the type's section on the homepage — articles 5, videos 3, podcasts 4, pills 6, courses 2
--   is_hero_featured  (↑) homepage hero banner, any type — 3 total
-- Caps are enforced in lib/actions/admin.ts (togglePlacement).

ALTER TABLE content ADD COLUMN is_home_featured BOOLEAN NOT NULL DEFAULT FALSE;

-- Until now the homepage type sections were fed by is_featured (minus hero picks).
-- Carry that over so the homepage looks identical right after this migration.
WITH ranked AS (
  SELECT id, type,
         row_number() OVER (PARTITION BY type ORDER BY published_at DESC NULLS LAST) AS rn
  FROM content
  WHERE status = 'published' AND is_featured AND NOT is_hero_featured
)
UPDATE content c
SET is_home_featured = TRUE
FROM ranked r
WHERE c.id = r.id
  AND r.rn <= CASE r.type
    WHEN 'article' THEN 5
    WHEN 'video' THEN 3
    WHEN 'podcast' THEN 4
    WHEN 'pill' THEN 6
    WHEN 'course' THEN 2
    ELSE 0
  END;

-- Authors can never set any editorial placement on their own content.
DROP POLICY IF EXISTS "content_update_own" ON content;
CREATE POLICY "content_update_own" ON content FOR UPDATE
  USING (author_id = auth.uid() AND NOT (current_user_role() IN ('admin', 'editor')))
  WITH CHECK (author_id = auth.uid() AND is_featured = false AND is_hero_featured = false AND is_home_featured = false);
