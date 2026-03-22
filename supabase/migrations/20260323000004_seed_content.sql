-- Seed additional authors and content for development/demo purposes.
-- Uses ON CONFLICT DO NOTHING so this is safe to re-run.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Fix the trigger to be idempotent before any inserts that fire it.
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO profiles (id, slug, display_name)
  VALUES (
    NEW.id,
    'user-' || substr(NEW.id::text, 1, 8),
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

-- ============================================================
-- 1. Additional auth users
-- ============================================================
INSERT INTO auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data, is_super_admin,
  confirmation_token, email_change, email_change_token_new, recovery_token
) VALUES
  (
    'b1000001-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'amara@untold.ink',
    '$2a$10$7ukGhUR/R/mz/3e3inC0jeBMxWjhQ07zZlg13WQV09Sf7BoCP0itG',
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}', '{}',
    false, '', '', '', ''
  ),
  (
    'b1000001-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'priya@untold.ink',
    '$2a$10$7ukGhUR/R/mz/3e3inC0jeBMxWjhQ07zZlg13WQV09Sf7BoCP0itG',
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}', '{}',
    false, '', '', '', ''
  ),
  (
    'b1000001-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'diego@untold.ink',
    '$2a$10$7ukGhUR/R/mz/3e3inC0jeBMxWjhQ07zZlg13WQV09Sf7BoCP0itG',
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}', '{}',
    false, '', '', '', ''
  ),
  (
    'b1000001-0000-0000-0000-000000000004',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'fatima@untold.ink',
    '$2a$10$7ukGhUR/R/mz/3e3inC0jeBMxWjhQ07zZlg13WQV09Sf7BoCP0itG',
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}', '{}',
    false, '', '', '', ''
  )
ON CONFLICT (id) DO NOTHING;

-- Auth identities (required for email login to work)
INSERT INTO auth.identities (
  id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
) VALUES
  ('b1000001-0000-0000-0000-000000000001', 'b1000001-0000-0000-0000-000000000001',
   '{"sub":"b1000001-0000-0000-0000-000000000001","email":"amara@untold.ink"}',
   'email', 'amara@untold.ink', now(), now(), now()),
  ('b1000001-0000-0000-0000-000000000002', 'b1000001-0000-0000-0000-000000000002',
   '{"sub":"b1000001-0000-0000-0000-000000000002","email":"priya@untold.ink"}',
   'email', 'priya@untold.ink', now(), now(), now()),
  ('b1000001-0000-0000-0000-000000000003', 'b1000001-0000-0000-0000-000000000003',
   '{"sub":"b1000001-0000-0000-0000-000000000003","email":"diego@untold.ink"}',
   'email', 'diego@untold.ink', now(), now(), now()),
  ('b1000001-0000-0000-0000-000000000004', 'b1000001-0000-0000-0000-000000000004',
   '{"sub":"b1000001-0000-0000-0000-000000000004","email":"fatima@untold.ink"}',
   'email', 'fatima@untold.ink', now(), now(), now())
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 2. Upsert profiles for seed users (fully idempotent)
-- ============================================================
-- Resolve any slug conflicts left by previous partial runs
-- (reset slugs of OTHER profiles that claim our target slugs).
UPDATE profiles
SET slug = 'tmp-' || substr(id::text, 1, 8)
WHERE slug IN ('amara-diallo', 'priya-sharma', 'diego-vargas', 'fatima-al-hassan')
  AND id NOT IN (
    'b1000001-0000-0000-0000-000000000001',
    'b1000001-0000-0000-0000-000000000002',
    'b1000001-0000-0000-0000-000000000003',
    'b1000001-0000-0000-0000-000000000004'
  );

-- Upsert: create if missing (in case trigger didn't fire), update if present.
INSERT INTO profiles (id, slug, display_name, role, bio, location) VALUES
  ('b1000001-0000-0000-0000-000000000001', 'amara-diallo',    'Amara Diallo',    'author', 'Journalist and documentary filmmaker based in Dakar, Senegal. Covering climate justice and digital rights across West Africa.', 'Dakar, Senegal'),
  ('b1000001-0000-0000-0000-000000000002', 'priya-sharma',    'Priya Sharma',    'author', 'Tech ethicist and researcher at IIT Bombay. Writing about AI policy, algorithmic bias, and responsible innovation in the Global South.', 'Mumbai, India'),
  ('b1000001-0000-0000-0000-000000000003', 'diego-vargas',    'Diego Vargas',    'author', 'Investigative journalist and video producer from São Paulo. Reporting on Amazon deforestation, Indigenous land rights, and environmental crime.', 'São Paulo, Brazil'),
  ('b1000001-0000-0000-0000-000000000004', 'fatima-al-hassan','Fatima Al-Hassan','author', 'Award-winning author and cultural critic from Lagos. Her work explores postcolonial narratives, oral history, and the politics of memory.', 'Lagos, Nigeria')
ON CONFLICT (id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  slug         = EXCLUDED.slug,
  role         = EXCLUDED.role,
  bio          = EXCLUDED.bio,
  location     = EXCLUDED.location;

-- ============================================================
-- 3. Articles
-- ============================================================
INSERT INTO content (id, type, author_id, slug, source_locale, status, is_featured, cover_image_url, likes_count, published_at)
VALUES
  -- Featured articles
  ('c2000001-0000-0000-0000-000000000001', 'article', 'b1000001-0000-0000-0000-000000000004',
   'how-police-surveillance-tech-is-targeting-black-communities',
   'en', 'published', true,
   'https://images.unsplash.com/photo-1594398901394-4e34939a4fd0?w=1200&q=80',
   47, now() - interval '3 days'),

  ('c2000001-0000-0000-0000-000000000002', 'article', 'b1000001-0000-0000-0000-000000000002',
   'the-ai-colonialism-problem-who-builds-who-benefits',
   'en', 'published', true,
   'https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=1200&q=80',
   82, now() - interval '5 days'),

  ('c2000001-0000-0000-0000-000000000003', 'article', '38ec6058-37b5-48a7-a141-5697ee371504',
   'indigenous-data-sovereignty-reclaiming-the-narrative',
   'en', 'published', true,
   'https://images.unsplash.com/photo-1489389944381-3471b5b30f04?w=1200&q=80',
   63, now() - interval '8 days'),

  -- Non-featured articles
  ('c2000001-0000-0000-0000-000000000004', 'article', 'b1000001-0000-0000-0000-000000000001',
   'climate-migration-the-untold-stories-from-the-sahel',
   'en', 'published', false,
   'https://images.unsplash.com/photo-1504701954957-2010ec3bcec1?w=1200&q=80',
   29, now() - interval '10 days'),

  ('c2000001-0000-0000-0000-000000000005', 'article', 'b1000001-0000-0000-0000-000000000003',
   'amazonia-at-the-tipping-point-deforestation-and-resistance',
   'en', 'published', false,
   'https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?w=1200&q=80',
   55, now() - interval '14 days'),

  ('c2000001-0000-0000-0000-000000000006', 'article', 'b1000001-0000-0000-0000-000000000002',
   'open-source-healthcare-ai-lessons-from-kenya',
   'en', 'published', false,
   'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=1200&q=80',
   18, now() - interval '18 days')

ON CONFLICT (id) DO NOTHING;

INSERT INTO content_translations (content_id, locale, title, excerpt, body)
VALUES
  ('c2000001-0000-0000-0000-000000000001', 'en',
   'How Police Surveillance Tech Is Targeting Black Communities',
   'Facial recognition systems deployed across Lagos, Nairobi and Cape Town raise urgent questions about consent and the right to be forgotten.',
   '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Across the African continent, a new wave of police surveillance technology is being deployed in predominantly Black communities — often with no public debate, no independent oversight, and no recourse for those misidentified."}]},{"type":"paragraph","content":[{"type":"text","text":"In Lagos, the state government has quietly installed thousands of facial recognition cameras in low-income neighbourhoods. In Nairobi, police are using predictive policing software trained on arrest records that disproportionately reflect historical over-policing. In Cape Town, a pilot program uses license plate readers and biometric databases to track movement across the city."}]},{"type":"paragraph","content":[{"type":"text","text":"\"The algorithm does not see you as a person. It sees you as a data point,\" says Dr. Nkechi Okonkwo, a digital rights researcher at the African Network for Surveillance Accountability. \"And when that data point is wrong — which it frequently is for darker-skinned faces — the consequences fall entirely on the individual, not on the system.\""}]},{"type":"paragraph","content":[{"type":"text","text":"Studies consistently show that commercial facial recognition systems have significantly higher error rates for dark-skinned women and men, in some cases misidentifying them up to 34% of the time, compared to error rates below 1% for light-skinned men. Yet these systems are being purchased from international vendors and deployed with minimal local testing or validation."}]}]}'),

  ('c2000001-0000-0000-0000-000000000002', 'en',
   'The AI Colonialism Problem: Who Builds, Who Benefits',
   'As AI reshapes global knowledge, researchers from India, Brazil and Nigeria ask: whose reality gets encoded into these systems?',
   '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"When ChatGPT was released to the public in late 2022, researchers around the world marvelled at its capabilities. But for many AI practitioners in the Global South, the excitement was quickly tempered by a troubling recognition: these systems had been built almost entirely on data from the English-speaking world, by teams in Silicon Valley and London, and they reflected — often uncritically — the assumptions, biases, and blind spots of those environments."}]},{"type":"paragraph","content":[{"type":"text","text":"\"I asked a major LLM to describe poverty in Mumbai,\" says Dr. Priya Sharma, a researcher at IIT Bombay. \"It gave me a response that could have been lifted from a 1980s development economics textbook — focused on infrastructure deficits, ignoring agency, ignoring culture, ignoring the extraordinary innovation that happens in informal economies. It was describing something, but it wasn''t describing us.\""}]},{"type":"paragraph","content":[{"type":"text","text":"This is the AI colonialism problem: a situation in which the infrastructure of global AI is controlled by a small number of wealthy institutions, trained predominantly on data from a handful of languages and cultures, and deployed globally in ways that can marginalise, misrepresent, or actively harm communities in the Global South."}]}]}'),

  ('c2000001-0000-0000-0000-000000000003', 'en',
   'Indigenous Data Sovereignty: Reclaiming the Narrative',
   'Indigenous communities worldwide are building data governance frameworks to keep knowledge about their lands and peoples under their own control.',
   '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"For generations, data about Indigenous peoples — their health outcomes, their languages, their land use patterns, their genetic profiles — has been collected by governments, researchers, and corporations, then used in ways that communities had no say over. Sometimes this data was used to help; often it was used to harm."}]},{"type":"paragraph","content":[{"type":"text","text":"Now, a growing movement of Indigenous data sovereignty advocates is pushing back. From the CARE Principles for Indigenous Data Governance to the Māori Data Sovereignty Network, communities are asserting the right to own, control, and benefit from data about themselves."}]}]}'),

  ('c2000001-0000-0000-0000-000000000004', 'en',
   'Climate Migration: The Untold Stories from the Sahel',
   'Millions in Niger, Mali and Chad face an impossible choice: stay on land that can no longer sustain them, or make the perilous journey north.',
   '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"The village of Agadez, in northern Niger, has always been a crossroads. Tuareg traders, salt caravans, pilgrims heading to Mecca — all have passed through this ancient desert city. But in the past decade, a new kind of movement has swept through: climate migrants, fleeing land that has become too hot and too dry to farm."}]},{"type":"paragraph","content":[{"type":"text","text":"\"My grandfather''s father''s father farmed this land,\" says Moussa Ibrahim, 42, gesturing at a cracked, pale expanse that stretches to the horizon. \"Now there is nothing here. The rains come later each year, and they leave earlier. The well that fed my family for three generations — it is dry.\""}]}]}'),

  ('c2000001-0000-0000-0000-000000000005', 'en',
   'Amazonia at the Tipping Point: Deforestation and Resistance',
   'Scientists warn the Amazon is near a point of no return. On the ground, Indigenous monitors and forest defenders are the last line of defence.',
   '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"In the Javari Valley, one of the most remote and biodiverse regions on Earth, a group of Indigenous monitors are watching their forest disappear in real time. Using satellite imagery and GPS trackers, they document each incursion: the illegal gold miners who arrive before dawn, the cattle ranchers who set fires at the forest edge, the loggers who move through protected territory with impunity."}]},{"type":"paragraph","content":[{"type":"text","text":"\"We are the guardians of the forest. But we are also under threat,\" says Txai Suruí, a 24-year-old Indigenous climate activist. \"When I was a child, the canopy was so thick you could not see the sky. Now there are clearings everywhere. The birds have gone. The streams are drying up.\""}]}]}'),

  ('c2000001-0000-0000-0000-000000000006', 'en',
   'Open-Source Healthcare AI: Lessons from Kenya',
   'Kenyan clinicians and engineers are building open-source diagnostic AI trained on African data — and releasing it free to clinics across East Africa.',
   '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"In a small clinic on the outskirts of Kisumu, a nurse named Grace Atieno uses a tablet app to help diagnose tuberculosis. The app analyses chest X-rays using a machine learning model trained partly on data from Kenyan hospitals, validated against local disease patterns, and tested in conditions — poor lighting, low-resolution cameras, intermittent internet — that match the realities of rural healthcare in East Africa."}]},{"type":"paragraph","content":[{"type":"text","text":"\"The TB screening tools from the big international companies, they were trained on hospital scans from Europe and North America,\" says Dr. James Ochieng, one of the project''s founders. \"Our patients look different. Our equipment is different. The prevalence rates are different. We needed something built for us, not repurposed for us.\""}]}]}')

ON CONFLICT (content_id, locale) DO NOTHING;

-- ============================================================
-- 4. Videos
-- ============================================================
INSERT INTO content (id, type, author_id, slug, source_locale, status, is_featured, cover_image_url, likes_count, published_at)
VALUES
  ('c3000001-0000-0000-0000-000000000001', 'video', 'b1000001-0000-0000-0000-000000000003',
   'inside-the-amazon-drone-footage-from-the-frontlines',
   'en', 'published', false,
   'https://images.unsplash.com/photo-1441122456239-401bf08b1a70?w=1200&q=80',
   91, now() - interval '6 days'),

  ('c3000001-0000-0000-0000-000000000002', 'video', 'b1000001-0000-0000-0000-000000000001',
   'dakar-rising-the-city-reinventing-itself',
   'en', 'published', false,
   'https://images.unsplash.com/photo-1583417267826-aebc4d1542e1?w=1200&q=80',
   67, now() - interval '9 days'),

  ('c3000001-0000-0000-0000-000000000003', 'video', '38ec6058-37b5-48a7-a141-5697ee371504',
   'decolonising-the-museum-who-owns-cultural-heritage',
   'en', 'published', false,
   'https://images.unsplash.com/photo-1553361371-9b22f78e8b1d?w=1200&q=80',
   44, now() - interval '12 days')

ON CONFLICT (id) DO NOTHING;

INSERT INTO content_translations (content_id, locale, title, description)
VALUES
  ('c3000001-0000-0000-0000-000000000001', 'en',
   'Inside the Amazon: Drone Footage from the Frontlines',
   'Diego Vargas takes us deep into the Javari Valley with exclusive drone footage documenting deforestation in real time. Indigenous monitors guide the way.'),
  ('c3000001-0000-0000-0000-000000000002', 'en',
   'Dakar Rising: The City Reinventing Itself',
   'From hip-hop to tech hubs, Amara Diallo explores how Dakar''s youth are building a new Africa on their own terms — without waiting for permission.'),
  ('c3000001-0000-0000-0000-000000000003', 'en',
   'Decolonising the Museum: Who Owns Cultural Heritage?',
   'As major European museums return some African artefacts, what does real restitution look like? A conversation with curators, activists, and communities of origin.')
ON CONFLICT (content_id, locale) DO NOTHING;

INSERT INTO video_meta (content_id, embed_url, thumbnail_url, duration)
VALUES
  ('c3000001-0000-0000-0000-000000000001',
   'https://www.youtube.com/embed/dQw4w9WgXcQ',
   'https://images.unsplash.com/photo-1441122456239-401bf08b1a70?w=800&q=80',
   '18:42'),
  ('c3000001-0000-0000-0000-000000000002',
   'https://www.youtube.com/embed/dQw4w9WgXcQ',
   'https://images.unsplash.com/photo-1583417267826-aebc4d1542e1?w=800&q=80',
   '24:15'),
  ('c3000001-0000-0000-0000-000000000003',
   'https://www.youtube.com/embed/dQw4w9WgXcQ',
   'https://images.unsplash.com/photo-1553361371-9b22f78e8b1d?w=800&q=80',
   '31:07')
ON CONFLICT (content_id) DO NOTHING;

-- ============================================================
-- 5. Podcasts
-- ============================================================
INSERT INTO content (id, type, author_id, slug, source_locale, status, is_featured, cover_image_url, likes_count, published_at)
VALUES
  ('c4000001-0000-0000-0000-000000000001', 'podcast', 'b1000001-0000-0000-0000-000000000001',
   'the-invisible-border-ep-12-climate-and-migration',
   'en', 'published', false,
   'https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=800&q=80',
   38, now() - interval '4 days'),

  ('c4000001-0000-0000-0000-000000000002', 'podcast', 'b1000001-0000-0000-0000-000000000004',
   'memory-and-resistance-ep-7-oral-histories-of-biafra',
   'en', 'published', false,
   'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=800&q=80',
   52, now() - interval '7 days'),

  ('c4000001-0000-0000-0000-000000000003', 'podcast', 'b1000001-0000-0000-0000-000000000002',
   'tech-from-the-south-ep-4-building-ai-for-africa',
   'en', 'published', false,
   'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800&q=80',
   27, now() - interval '15 days')

ON CONFLICT (id) DO NOTHING;

INSERT INTO content_translations (content_id, locale, title, description)
VALUES
  ('c4000001-0000-0000-0000-000000000001', 'en',
   'The Invisible Border — Ep. 12: Climate and Migration',
   'What happens when your home becomes uninhabitable? Amara Diallo speaks with climate scientists, policy makers, and families who have already made the journey.'),
  ('c4000001-0000-0000-0000-000000000002', 'en',
   'Memory and Resistance — Ep. 7: Oral Histories of Biafra',
   'Fatima Al-Hassan sits down with three survivors to record stories that official histories have tried to erase. A meditation on testimony, trauma, and the power of witness.'),
  ('c4000001-0000-0000-0000-000000000003', 'en',
   'Tech from the South — Ep. 4: Building AI for Africa',
   'Priya Sharma talks with engineers from Nigeria, Kenya and South Africa who are building machine learning tools on African data, for African contexts.')
ON CONFLICT (content_id, locale) DO NOTHING;

INSERT INTO podcast_meta (content_id, embed_url, cover_image_url, duration, episode_number)
VALUES
  ('c4000001-0000-0000-0000-000000000001',
   'https://open.spotify.com/embed/episode/placeholder',
   'https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=400&q=80',
   '54:18', '12'),
  ('c4000001-0000-0000-0000-000000000002',
   'https://open.spotify.com/embed/episode/placeholder',
   'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=400&q=80',
   '1:12:44', '7'),
  ('c4000001-0000-0000-0000-000000000003',
   'https://open.spotify.com/embed/episode/placeholder',
   'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=400&q=80',
   '48:05', '4')
ON CONFLICT (content_id) DO NOTHING;

-- ============================================================
-- 6. Knowledge Pills
-- ============================================================
INSERT INTO content (id, type, author_id, slug, source_locale, status, is_featured, cover_image_url, likes_count, published_at)
VALUES
  ('c5000001-0000-0000-0000-000000000001', 'pill', 'b1000001-0000-0000-0000-000000000002',
   'what-is-data-colonialism',
   'en', 'published', false,
   'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800&q=80',
   33, now() - interval '2 days'),

  ('c5000001-0000-0000-0000-000000000002', 'pill', 'b1000001-0000-0000-0000-000000000004',
   'understanding-the-right-to-be-forgotten',
   'en', 'published', false,
   null,
   19, now() - interval '5 days'),

  ('c5000001-0000-0000-0000-000000000003', 'pill', 'b1000001-0000-0000-0000-000000000001',
   'what-is-loss-and-damage-in-climate-negotiations',
   'en', 'published', false,
   'https://images.unsplash.com/photo-1569163139599-0f4517e36f51?w=800&q=80',
   41, now() - interval '7 days'),

  ('c5000001-0000-0000-0000-000000000004', 'pill', 'b1000001-0000-0000-0000-000000000003',
   'the-amazon-fund-how-it-works',
   'en', 'published', false,
   null,
   22, now() - interval '11 days'),

  ('c5000001-0000-0000-0000-000000000005', 'pill', '38ec6058-37b5-48a7-a141-5697ee371504',
   'indigenous-rights-undrip-explained',
   'en', 'published', false,
   'https://images.unsplash.com/photo-1446941611757-91d2c3bd3d45?w=800&q=80',
   58, now() - interval '16 days'),

  ('c5000001-0000-0000-0000-000000000006', 'pill', 'b1000001-0000-0000-0000-000000000002',
   'algorithmic-bias-five-things-to-know',
   'en', 'published', false,
   null,
   36, now() - interval '20 days')

ON CONFLICT (id) DO NOTHING;

INSERT INTO content_translations (content_id, locale, title, excerpt, body)
VALUES
  ('c5000001-0000-0000-0000-000000000001', 'en',
   'What Is Data Colonialism?',
   'How the extraction of personal data from communities in the Global South mirrors historical patterns of colonial resource extraction.',
   '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Data colonialism describes the way powerful tech companies and governments extract data from individuals and communities — particularly in the Global South — and use it to build systems that primarily benefit wealthy nations and corporations."}]},{"type":"paragraph","content":[{"type":"text","text":"Like resource colonialism, data colonialism involves taking something valuable from communities without adequate consent or compensation, and using it to consolidate power elsewhere."}]}]}'),

  ('c5000001-0000-0000-0000-000000000002', 'en',
   'Understanding the Right to Be Forgotten',
   'A quick guide to one of digital rights'' most contested concepts — and why it matters differently depending on where you live.',
   '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"The ''right to be forgotten'' is a legal concept that gives individuals the right to request that search engines and data processors remove information about them under certain conditions."}]},{"type":"paragraph","content":[{"type":"text","text":"It originated in EU law (GDPR, Article 17) but has been adopted in various forms in Brazil, Argentina, and other countries. In the US, it remains largely absent from federal law."}]}]}'),

  ('c5000001-0000-0000-0000-000000000003', 'en',
   'What Is "Loss and Damage" in Climate Negotiations?',
   'One of the most contested concepts in international climate policy, explained simply.',
   '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Loss and Damage refers to the harms caused by climate change that cannot be adapted to or mitigated — things like the total submersion of an island nation, or the permanent desertification of farmland."}]},{"type":"paragraph","content":[{"type":"text","text":"At COP27 in 2022, developing nations won a landmark victory when wealthy countries agreed to establish a Loss and Damage fund. But the details of who pays, how much, and who qualifies remain fiercely contested."}]}]}'),

  ('c5000001-0000-0000-0000-000000000004', 'en',
   'The Amazon Fund: How It Works',
   'Norway and Germany have committed billions to protect the Amazon. Here''s what that money actually does.',
   '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"The Amazon Fund is a REDD+ mechanism managed by Brazil''s National Development Bank (BNDES). It receives donations from countries like Norway and Germany in exchange for verified reductions in Amazon deforestation."}]},{"type":"paragraph","content":[{"type":"text","text":"Money goes to Brazilian states, municipalities, Indigenous communities, and NGOs working on forest conservation, sustainable agriculture, and environmental monitoring."}]}]}'),

  ('c5000001-0000-0000-0000-000000000005', 'en',
   'Indigenous Rights: UNDRIP Explained',
   'The UN Declaration on the Rights of Indigenous Peoples — what it says, who opposed it, and why it still matters.',
   '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Adopted by the UN General Assembly in 2007, UNDRIP is the most comprehensive international instrument on the rights of Indigenous peoples. It covers rights to land, culture, identity, language, health, education, and self-determination."}]},{"type":"paragraph","content":[{"type":"text","text":"Four nations voted against it when it was adopted: the US, Canada, Australia, and New Zealand — all countries with large Indigenous populations. All four have since endorsed it, though implementation remains deeply inadequate."}]}]}'),

  ('c5000001-0000-0000-0000-000000000006', 'en',
   'Algorithmic Bias: Five Things to Know',
   'From hiring algorithms to facial recognition — a plain-language guide to why AI systems discriminate and what we can do about it.',
   '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"1. AI learns from historical data, which often encodes historical discrimination. A hiring algorithm trained on past successful employees will replicate whatever biases those hiring decisions contained."}]},{"type":"paragraph","content":[{"type":"text","text":"2. Algorithmic bias is not a bug — it is often a feature. Systems optimised for efficiency frequently replicate inequality because inequality is embedded in the ''normal'' patterns in the training data."}]}]}')

ON CONFLICT (content_id, locale) DO NOTHING;

INSERT INTO pill_meta (content_id, accent_color, image_url)
VALUES
  ('c5000001-0000-0000-0000-000000000001', '#2563eb', 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800&q=80'),
  ('c5000001-0000-0000-0000-000000000002', '#7c3aed', null),
  ('c5000001-0000-0000-0000-000000000003', '#059669', 'https://images.unsplash.com/photo-1569163139599-0f4517e36f51?w=800&q=80'),
  ('c5000001-0000-0000-0000-000000000004', '#047857', null),
  ('c5000001-0000-0000-0000-000000000005', '#b45309', 'https://images.unsplash.com/photo-1446941611757-91d2c3bd3d45?w=800&q=80'),
  ('c5000001-0000-0000-0000-000000000006', '#dc2626', null)
ON CONFLICT (content_id) DO NOTHING;

-- ============================================================
-- 7. Tags
-- ============================================================
-- Upsert tags by slug so re-runs update names without changing existing IDs.
INSERT INTO tags (id, slug, names)
VALUES
  ('d1000001-0000-0000-0000-000000000001', 'surveillance',          '{"en":"Surveillance","es":"Vigilancia","pt":"Vigilância","fr":"Surveillance","de":"Überwachung"}'),
  ('d1000001-0000-0000-0000-000000000002', 'artificial-intelligence','{"en":"Artificial Intelligence","es":"Inteligencia Artificial","pt":"Inteligência Artificial","fr":"Intelligence Artificielle","de":"Künstliche Intelligenz"}'),
  ('d1000001-0000-0000-0000-000000000003', 'climate-justice',        '{"en":"Climate Justice","es":"Justicia Climática","pt":"Justiça Climática","fr":"Justice Climatique","de":"Klimagerechtigkeit"}'),
  ('d1000001-0000-0000-0000-000000000004', 'indigenous-rights',      '{"en":"Indigenous Rights","es":"Derechos Indígenas","pt":"Direitos Indígenas","fr":"Droits Autochtones","de":"Indigene Rechte"}'),
  ('d1000001-0000-0000-0000-000000000005', 'digital-rights',         '{"en":"Digital Rights","es":"Derechos Digitales","pt":"Direitos Digitais","fr":"Droits Numériques","de":"Digitale Rechte"}'),
  ('d1000001-0000-0000-0000-000000000006', 'deforestation',          '{"en":"Deforestation","es":"Deforestación","pt":"Desmatamento","fr":"Déforestation","de":"Abholzung"}'),
  ('d1000001-0000-0000-0000-000000000007', 'police',                 '{"en":"Police","es":"Policía","pt":"Polícia","fr":"Police","de":"Polizei"}')
ON CONFLICT (slug) DO UPDATE SET names = EXCLUDED.names;

-- Tag assignments — look up tag IDs by slug so they survive ID changes.
INSERT INTO content_tags (content_id, tag_id)
SELECT c.content_id::uuid, t.id
FROM (VALUES
  ('c2000001-0000-0000-0000-000000000001', 'surveillance'),
  ('c2000001-0000-0000-0000-000000000001', 'police'),
  ('c2000001-0000-0000-0000-000000000001', 'digital-rights'),
  ('c2000001-0000-0000-0000-000000000002', 'artificial-intelligence'),
  ('c2000001-0000-0000-0000-000000000002', 'digital-rights'),
  ('c2000001-0000-0000-0000-000000000003', 'indigenous-rights'),
  ('c2000001-0000-0000-0000-000000000004', 'climate-justice'),
  ('c2000001-0000-0000-0000-000000000005', 'deforestation'),
  ('c2000001-0000-0000-0000-000000000005', 'indigenous-rights'),
  ('c2000001-0000-0000-0000-000000000006', 'artificial-intelligence'),
  ('c3000001-0000-0000-0000-000000000001', 'deforestation'),
  ('c3000001-0000-0000-0000-000000000001', 'indigenous-rights'),
  ('c3000001-0000-0000-0000-000000000003', 'indigenous-rights'),
  ('c4000001-0000-0000-0000-000000000001', 'climate-justice'),
  ('c4000001-0000-0000-0000-000000000003', 'artificial-intelligence'),
  ('c5000001-0000-0000-0000-000000000001', 'digital-rights'),
  ('c5000001-0000-0000-0000-000000000001', 'artificial-intelligence'),
  ('c5000001-0000-0000-0000-000000000003', 'climate-justice'),
  ('c5000001-0000-0000-0000-000000000005', 'indigenous-rights'),
  ('c5000001-0000-0000-0000-000000000006', 'artificial-intelligence')
) AS c(content_id, tag_slug)
JOIN tags t ON t.slug = c.tag_slug
ON CONFLICT DO NOTHING;
