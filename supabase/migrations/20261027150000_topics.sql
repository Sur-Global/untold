-- "Topics": the few tags (about a dozen) the editors choose as the themes of the site. They are what the listing pages
-- offer to explore, what is shown above a piece of content and what gets its own page. The rest of the tags stay as
-- plain tags (search, related content). Chosen in Admin → Topics.
--   descriptions: a short sentence per language, shown on the topic's page
ALTER TABLE tags
  ADD COLUMN is_topic BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN descriptions JSONB NOT NULL DEFAULT '{}';

-- The tags that already have the most content (11 or more pieces) are the first topics.
UPDATE tags SET is_topic = TRUE WHERE slug IN (
  'futuros', 'diseno', 'cultura', 'decolonizacion', 'innovacion', 'derechos-humanos', 'soberania',
  'tecnologia', 'educacion', 'arte', 'habilidades-para-el-futuro', 'sostenibilidad', 'inteligencia-artificial'
);
