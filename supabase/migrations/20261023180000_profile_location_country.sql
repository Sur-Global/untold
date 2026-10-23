-- Where a creator lives, shown on their profile and under their articles: a single country (ISO code),
-- named in the reader's language. It is independent of `countries` (the countries they are from, one or
-- two, used by the Creators page filter): saving one never changes the other.
-- The old free-text `location` (cities, mixed languages) is no longer read or shown; the column stays
-- for now so nothing is lost.
ALTER TABLE profiles
  ADD COLUMN location_country TEXT CHECK (location_country IS NULL OR location_country ~ '^[A-Z]{2}$');

UPDATE profiles SET location_country = 'ES' WHERE slug IN ('narda-rey-amaya', 'cristian-situ');   -- Barcelona
UPDATE profiles SET location_country = 'DE' WHERE slug = 'sandra-arellano';                      -- Alemania
UPDATE profiles SET location_country = 'DK' WHERE slug IN ('maria-jose-campos-runcie', 'elsie-ralston'); -- Aarhus, Copenhague
