-- "Editorial": an article an admin/editor marks as the editorial of an issue.
-- The homepage section "Lo más reciente" shows the latest published one next to the newest articles.
-- (Phase 2 will group articles and their editorial into numbered issues.)
ALTER TABLE content ADD COLUMN is_editorial BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX content_editorial_idx ON content (published_at DESC) WHERE is_editorial AND status = 'published';

-- Same protection as the curation columns: only admins/editors can mark an editorial,
-- whatever a member sends to the API (service-role and migrations have no auth.uid()).
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
    NEW.is_editorial := FALSE;
  ELSIF NOT (current_user_role() IN ('admin', 'editor')) THEN
    NEW.is_curated := OLD.is_curated;
    NEW.is_editorial := OLD.is_editorial;
    NEW.feature_request_resolved_at := OLD.feature_request_resolved_at;
    NEW.feature_request_notified_at := OLD.feature_request_notified_at;
  END IF;
  RETURN NEW;
END;
$$;
