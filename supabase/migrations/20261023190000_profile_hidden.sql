-- A profile an admin hides is not shown on the public site: not in the Creators list, its author page
-- is not found for visitors (admins, editors and the person themself still open it) and its content
-- stays out of the general listings (is_curated = FALSE). Used for test accounts.
ALTER TABLE profiles ADD COLUMN hidden BOOLEAN NOT NULL DEFAULT FALSE;

-- Only an admin can hide or show a profile, whatever a member sends to the API
-- (service-role and migrations have no auth.uid()).
CREATE OR REPLACE FUNCTION protect_profile_hidden()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND current_user_role() IS DISTINCT FROM 'admin' THEN
    NEW.hidden := OLD.hidden;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER profiles_protect_hidden
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION protect_profile_hidden();

-- Content of a hidden profile is never in the general listings (same rule as the editorials of issues)
CREATE OR REPLACE FUNCTION keep_editorial_out_of_listings()
RETURNS TRIGGER LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.is_editorial OR EXISTS (SELECT 1 FROM profiles WHERE id = NEW.author_id AND hidden) THEN
    NEW.is_curated := FALSE;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION uncurate_hidden_profile_content()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.hidden AND NOT OLD.hidden THEN
    UPDATE content SET is_curated = FALSE WHERE author_id = NEW.id AND is_curated;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER profiles_uncurate_content_when_hidden
  AFTER UPDATE OF hidden ON profiles
  FOR EACH ROW EXECUTE FUNCTION uncurate_hidden_profile_content();

-- The test account
UPDATE profiles SET hidden = TRUE WHERE display_name = 'claude-test-verify';
