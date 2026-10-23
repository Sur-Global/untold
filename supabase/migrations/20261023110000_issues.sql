-- Numbered issues of the magazine ("Números"). Each issue has a number, a month, an editorial
-- (a normal article) and the articles that belong to it. Admins and editors manage them.
CREATE TABLE issues (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  number       integer NOT NULL UNIQUE CHECK (number > 0),
  issue_date   date NOT NULL,                 -- first day of the issue's month
  status       text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  editorial_id uuid REFERENCES content(id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER issues_updated_at
  BEFORE UPDATE ON issues
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE issues ENABLE ROW LEVEL SECURITY;

-- Everyone sees published issues; admins/editors also see (and write) drafts
CREATE POLICY "issues_select" ON issues FOR SELECT
  USING (status = 'published' OR current_user_role() IN ('admin', 'editor'));

CREATE POLICY "issues_write" ON issues FOR ALL
  USING (current_user_role() IN ('admin', 'editor'))
  WITH CHECK (current_user_role() IN ('admin', 'editor'));

ALTER TABLE content ADD COLUMN issue_id uuid REFERENCES issues(id) ON DELETE SET NULL;
CREATE INDEX content_issue_idx ON content (issue_id) WHERE issue_id IS NOT NULL;

-- Only admins/editors can put content in an issue, whatever a member sends to the API
-- (service-role and migrations have no auth.uid() and are left alone).
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
    NEW.issue_id := NULL;
  ELSIF NOT (current_user_role() IN ('admin', 'editor')) THEN
    NEW.is_curated := OLD.is_curated;
    NEW.is_editorial := OLD.is_editorial;
    NEW.issue_id := OLD.issue_id;
    NEW.feature_request_resolved_at := OLD.feature_request_resolved_at;
    NEW.feature_request_notified_at := OLD.feature_request_notified_at;
  END IF;
  RETURN NEW;
END;
$$;
