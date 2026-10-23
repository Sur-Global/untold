-- A translation corrected by hand is protected from the automatic translator. When the original text changes
-- afterwards, that translation may no longer match it: it is flagged so its author can review it.
ALTER TABLE content_translations
  ADD COLUMN IF NOT EXISTS needs_review BOOLEAN NOT NULL DEFAULT FALSE;
