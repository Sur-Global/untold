-- Fix avatar URLs for seeded authors (correct slugs from seed_content migration)
UPDATE profiles SET avatar_url = 'https://i.pravatar.cc/256?u=amara.diallo@untold.ink'
  WHERE slug = 'amara-diallo';

UPDATE profiles SET avatar_url = 'https://i.pravatar.cc/256?u=priya.sharma@untold.ink'
  WHERE slug = 'priya-sharma';

UPDATE profiles SET avatar_url = 'https://i.pravatar.cc/256?u=diego.vargas@untold.ink'
  WHERE slug = 'diego-vargas';

UPDATE profiles SET avatar_url = 'https://i.pravatar.cc/256?u=fatima.al.hassan@untold.ink'
  WHERE slug = 'fatima-al-hassan';
