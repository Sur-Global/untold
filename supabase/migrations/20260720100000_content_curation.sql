-- Content from plain members (role 'user') lives on the creator's own page and dashboard.
-- It reaches the general pages (listings, search, tags) only after an editor approves it
-- or places it (★ / ⌂ / ↑). Content by admins, editors and authors is general from the start.
ALTER TABLE content ADD COLUMN is_curated BOOLEAN NOT NULL DEFAULT FALSE;

-- Feature requests ("send my content to be featured"): requested_at already exists.
--   resolved_at  — an editor decided (placed / approved / dismissed); pending = requested and not resolved
--   notified_at  — the notification email went out, so republishing doesn't send it again
ALTER TABLE content ADD COLUMN feature_request_resolved_at TIMESTAMPTZ;
ALTER TABLE content ADD COLUMN feature_request_notified_at TIMESTAMPTZ;

-- Everything that exists today by vetted roles (or already placed) stays on the general pages.
UPDATE content c
SET is_curated = TRUE
FROM profiles p
WHERE p.id = c.author_id AND p.role IN ('admin', 'editor', 'author');

UPDATE content
SET is_curated = TRUE
WHERE is_featured OR is_home_featured OR is_hero_featured;

-- Members can't curate their own content, whatever they send to the API:
--   new rows: curated only when the creator is admin/editor/author
--   edits:    only admins/editors can change it
-- (service-role and migrations have no auth.uid() and are left alone)
CREATE OR REPLACE FUNCTION protect_content_curation()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'INSERT' THEN
    NEW.is_curated := COALESCE(
      (SELECT role IN ('admin', 'editor', 'author') FROM profiles WHERE id = auth.uid()),
      FALSE
    );
  ELSIF NOT (current_user_role() IN ('admin', 'editor')) THEN
    NEW.is_curated := OLD.is_curated;
    NEW.feature_request_resolved_at := OLD.feature_request_resolved_at;
    NEW.feature_request_notified_at := OLD.feature_request_notified_at;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS content_protect_curation ON content;
CREATE TRIGGER content_protect_curation
  BEFORE INSERT OR UPDATE ON content
  FOR EACH ROW EXECUTE FUNCTION protect_content_curation();
