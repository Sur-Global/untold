-- Add suspended_at to profiles
-- NULL = active, non-null = suspended since that timestamp
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ NULL DEFAULT NULL;
