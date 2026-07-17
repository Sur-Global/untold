-- Separates the homepage hero (3 slots: 1 large + 2 small) from the "Featured
-- Articles" grid below it. Both used to pull from the same is_featured=true
-- pool, so the same articles could appear in both places on the homepage.
-- is_hero_featured is a narrower subset of is_featured, capped at 3 and
-- enforced in lib/actions/admin.ts (toggleHeroFeatured).

ALTER TABLE content ADD COLUMN is_hero_featured BOOLEAN NOT NULL DEFAULT FALSE;

-- Mirror the existing is_featured self-service protection: authors can never
-- set is_hero_featured=true on their own content via the "own content" path —
-- only the admin/editor-privileged policy (content_privileged_all) can.
DROP POLICY IF EXISTS "content_update_own" ON content;
CREATE POLICY "content_update_own" ON content FOR UPDATE
  USING (author_id = auth.uid() AND NOT (current_user_role() IN ('admin', 'editor')))
  WITH CHECK (author_id = auth.uid() AND is_featured = false AND is_hero_featured = false);
