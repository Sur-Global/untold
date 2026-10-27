-- Where a podcast comes from, so the podcasts page can tell them apart:
--   own          made by SurGlobal / UNTOLD.ink
--   collab       a third party's podcast made in collaboration with SurGlobal / UNTOLD.ink
--   guest        a third party's podcast that interviews SurGlobal / UNTOLD.ink
--   third_party  a third party's podcast (what every creator's podcast is)
-- NULL = an admin/editor has not chosen yet (only possible while it is a draft).
ALTER TABLE podcast_meta
  ADD COLUMN origin TEXT CHECK (origin IN ('own', 'collab', 'guest', 'third_party'));

-- What exists today is third-party content; the three published episodes are interviews to SurGlobal.
UPDATE podcast_meta SET origin = 'third_party' WHERE origin IS NULL;
UPDATE podcast_meta SET origin = 'guest'
WHERE content_id IN (
  SELECT id FROM content WHERE type = 'podcast' AND slug IN (
    'episodio-164-elsie-ralston-alejandra-dancuart-comunidades-de-aprendizaje-muwxsb3y',
    'ep084-el-rol-de-las-comunidades-en-el-desarrollo-de-los-diseadores-elsie-ralston-muwycnsk',
    'surglobal-en-the-ux-rebels-ep03-temp-06-muwymt9v'
  )
);

-- Only admins and editors choose the type. A podcast sent by anyone else is third-party, and they cannot change
-- it afterwards (whatever they send to the API). Service-role scripts and migrations have no auth.uid() and are left alone.
CREATE OR REPLACE FUNCTION protect_podcast_origin()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN NEW; END IF;
  IF current_user_role() IN ('admin', 'editor') THEN RETURN NEW; END IF;
  IF TG_OP = 'INSERT' THEN
    NEW.origin := 'third_party';
  ELSE
    NEW.origin := OLD.origin;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER podcast_meta_protect_origin
  BEFORE INSERT OR UPDATE ON podcast_meta
  FOR EACH ROW EXECUTE FUNCTION protect_podcast_origin();

-- A podcast cannot become published without its type. Only the moment it becomes published is checked, so what is
-- already published stays. (Podcasts by creators always have one: it is set to third-party when they are saved.)
CREATE OR REPLACE FUNCTION require_podcast_origin_to_publish()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.type IS DISTINCT FROM 'podcast' OR NEW.status IS DISTINCT FROM 'published' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'published' THEN RETURN NEW; END IF;
  IF auth.uid() IS NULL THEN RETURN NEW; END IF;

  IF NOT EXISTS (SELECT 1 FROM podcast_meta WHERE content_id = NEW.id AND origin IS NOT NULL) THEN
    RAISE EXCEPTION 'podcast_origin_required: choose the type of podcast before publishing';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER content_require_podcast_origin
  BEFORE INSERT OR UPDATE OF status ON content
  FOR EACH ROW EXECUTE FUNCTION require_podcast_origin_to_publish();
