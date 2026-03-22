-- Add avatar URLs to seeded author profiles using pravatar.cc (deterministic per email)
UPDATE profiles SET avatar_url = 'https://i.pravatar.cc/256?u=amara.diallo@untold.ink'
  WHERE slug = 'amara-diallo' AND avatar_url IS NULL;

UPDATE profiles SET avatar_url = 'https://i.pravatar.cc/256?u=yuki.tanaka@untold.ink'
  WHERE slug = 'yuki-tanaka' AND avatar_url IS NULL;

UPDATE profiles SET avatar_url = 'https://i.pravatar.cc/256?u=carlos.mendez@untold.ink'
  WHERE slug = 'carlos-mendez' AND avatar_url IS NULL;

UPDATE profiles SET avatar_url = 'https://i.pravatar.cc/256?u=sofia.petrov@untold.ink'
  WHERE slug = 'sofia-petrov' AND avatar_url IS NULL;

UPDATE profiles SET avatar_url = 'https://i.pravatar.cc/256?u=kwame.asante@untold.ink'
  WHERE slug = 'kwame-asante' AND avatar_url IS NULL;

UPDATE profiles SET avatar_url = 'https://i.pravatar.cc/256?u=elena.vasquez@untold.ink'
  WHERE slug = 'elena-vasquez' AND avatar_url IS NULL;

UPDATE profiles SET avatar_url = 'https://i.pravatar.cc/256?u=takoda.whitehorse@untold.ink'
  WHERE slug = 'takoda-whitehorse' AND avatar_url IS NULL;

UPDATE profiles SET avatar_url = 'https://i.pravatar.cc/256?u=fatima.al-rashid@untold.ink'
  WHERE slug = 'fatima-al-rashid' AND avatar_url IS NULL;
