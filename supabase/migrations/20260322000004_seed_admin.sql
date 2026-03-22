-- Promote noahlaux@gmail.com to admin once their account exists.
-- This runs safely even if the user hasn't signed up yet (no-op if no match).
UPDATE profiles
SET role = 'admin'
WHERE id = (
  SELECT id FROM auth.users WHERE email = 'noahlaux@gmail.com'
);
