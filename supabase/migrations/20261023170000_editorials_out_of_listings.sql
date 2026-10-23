-- Editorials of numbered issues live under Issues (and on their author's profile), never among the articles.
-- The general listings (/articles, search, tags, the homepage list) only take content with is_curated = TRUE,
-- so an editorial is always kept out of them, whoever promotes the author or places the article later.
UPDATE content SET is_curated = FALSE WHERE is_editorial AND is_curated;

CREATE OR REPLACE FUNCTION keep_editorial_out_of_listings()
RETURNS TRIGGER LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.is_editorial THEN
    NEW.is_curated := FALSE;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER content_editorial_uncurated
  BEFORE INSERT OR UPDATE ON content
  FOR EACH ROW EXECUTE FUNCTION keep_editorial_out_of_listings();
