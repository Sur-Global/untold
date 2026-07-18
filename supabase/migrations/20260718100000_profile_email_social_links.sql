-- Adds admin-editable contact email + social link fields to profiles.
-- `email` is a denormalized display/contact field distinct from auth.users.email
-- (many imported authors have auto-generated login emails; this lets admins
-- correct what's shown without touching auth credentials).
ALTER TABLE profiles
  ADD COLUMN email TEXT,
  ADD COLUMN social_bluesky TEXT,
  ADD COLUMN social_linkedin TEXT,
  ADD COLUMN social_instagram TEXT,
  ADD COLUMN social_medium TEXT,
  ADD COLUMN social_custom_url TEXT;
