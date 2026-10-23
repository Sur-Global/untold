-- Country of a creator (ISO 3166-1 alpha-2, e.g. 'PE'), used to filter the Creators page.
-- The free-text `location` stays as it is ("Barcelona, España").
ALTER TABLE profiles ADD COLUMN country text CHECK (country IS NULL OR country ~ '^[A-Z]{2}$');
