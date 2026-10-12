-- 1. Creators confirm "I take responsibility for my content" before publishing; when is recorded.
ALTER TABLE content ADD COLUMN declaration_accepted_at TIMESTAMPTZ;

-- 2. Admins assign a feature request to an editor to review.
ALTER TABLE content ADD COLUMN feature_review_assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE content ADD COLUMN feature_review_assigned_at TIMESTAMPTZ;
ALTER TABLE content ADD COLUMN feature_review_note TEXT;

-- Members can't touch the review columns on their own content (admins/editors and the service role can).
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
    NEW.feature_review_assigned_to := NULL;
    NEW.feature_review_assigned_at := NULL;
    NEW.feature_review_note := NULL;
  ELSIF NOT (current_user_role() IN ('admin', 'editor')) THEN
    NEW.is_curated := OLD.is_curated;
    NEW.feature_request_resolved_at := OLD.feature_request_resolved_at;
    NEW.feature_request_notified_at := OLD.feature_request_notified_at;
    NEW.feature_review_assigned_to := OLD.feature_review_assigned_to;
    NEW.feature_review_assigned_at := OLD.feature_review_assigned_at;
    NEW.feature_review_note := OLD.feature_review_note;
  END IF;
  RETURN NEW;
END;
$$;
