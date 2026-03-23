-- Add transcript storage to video_meta
ALTER TABLE video_meta
  ADD COLUMN IF NOT EXISTS transcript JSONB DEFAULT NULL;
