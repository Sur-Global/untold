-- Add per-locale translated transcript cues to video_meta
-- Structure: { "es": [{start, text}, ...], "fr": [...] }
ALTER TABLE video_meta
  ADD COLUMN IF NOT EXISTS transcript_translations JSONB DEFAULT NULL;
