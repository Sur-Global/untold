-- A creator can have more than one country (dual nationality) and then shows under each of them on the Creators page.
-- Replaces the single `country` column (kept for now, dropped in a later migration once nothing reads it).
ALTER TABLE profiles ADD COLUMN countries text[] NOT NULL DEFAULT '{}'
  CHECK (array_to_string(countries, ',') ~ '^([A-Z]{2}(,[A-Z]{2}){0,2})?$');
UPDATE profiles SET countries = ARRAY[country] WHERE country IS NOT NULL;
