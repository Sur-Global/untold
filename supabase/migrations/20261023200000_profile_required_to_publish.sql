-- A creator cannot publish until their public profile has a photo and a real name (not just the first part of
-- their email). Only the moment content becomes published is checked, so what is already published stays.
-- Admins and editors are exempt (they also publish on behalf of others), and so are migrations and scripts
-- (no auth.uid()).
CREATE OR REPLACE FUNCTION require_complete_profile_to_publish()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  p RECORD;
  login_email TEXT;
BEGIN
  IF NEW.status IS DISTINCT FROM 'published' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'published' THEN RETURN NEW; END IF;
  IF auth.uid() IS NULL THEN RETURN NEW; END IF;
  IF current_user_role() IN ('admin', 'editor') THEN RETURN NEW; END IF;

  SELECT display_name, avatar_url INTO p FROM profiles WHERE id = NEW.author_id;
  SELECT email INTO login_email FROM auth.users WHERE id = NEW.author_id;

  IF COALESCE(btrim(p.avatar_url), '') = ''
     OR COALESCE(btrim(p.display_name), '') = ''
     OR p.display_name LIKE '%@%'
     OR (login_email IS NOT NULL AND lower(btrim(p.display_name)) = lower(split_part(login_email, '@', 1)))
  THEN
    RAISE EXCEPTION 'profile_incomplete: add a photo and your real name to your profile before publishing';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER content_require_complete_profile
  BEFORE INSERT OR UPDATE OF status ON content
  FOR EACH ROW EXECUTE FUNCTION require_complete_profile_to_publish();

-- Reminder emails to creators whose profile is still incomplete (day 3 and day 10 after joining, then no more)
ALTER TABLE profiles
  ADD COLUMN profile_reminders_sent SMALLINT NOT NULL DEFAULT 0,
  ADD COLUMN profile_reminder_at TIMESTAMPTZ;
