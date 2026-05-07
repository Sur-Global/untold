-- Add enhanced video editor fields to video_meta
ALTER TABLE video_meta
  ADD COLUMN IF NOT EXISTS chapters      JSONB   NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS layout_style  TEXT    NOT NULL DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS show_transcript BOOLEAN NOT NULL DEFAULT false;
