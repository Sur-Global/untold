-- Some content only exists in one language (pills, courses, some videos).
--   single_language  → never auto-translated; readers see an "Only in <language>" label
--   subtitle_locales → languages a (single-language) video has subtitles in; shown next to the label
ALTER TABLE content ADD COLUMN single_language BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE content ADD COLUMN subtitle_locales TEXT[] NOT NULL DEFAULT '{}';
