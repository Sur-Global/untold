-- The "call to action" button on author profiles (e.g. "Conoce más sobre Elsie").
-- Previously only existed as imported Ghost data in profile_translations._source_bio_cta_*,
-- with no way to edit or translate it. Now real, editable fields; translated labels
-- live in profile_translations.<locale>.cta_label next to the translated bio.
ALTER TABLE profiles
  ADD COLUMN bio_cta_label TEXT,
  ADD COLUMN bio_cta_url TEXT;

UPDATE profiles
SET bio_cta_label = NULLIF(profile_translations->>'_source_bio_cta_label', ''),
    bio_cta_url   = NULLIF(profile_translations->>'_source_bio_cta_url', '')
WHERE profile_translations ? '_source_bio_cta_url'
   OR profile_translations ? '_source_bio_cta_label';
