-- Authors can star their own content to feature it first on their author page.
-- Separate from is_featured / is_hero_featured, which are site-wide editorial picks.
ALTER TABLE content ADD COLUMN is_author_featured BOOLEAN NOT NULL DEFAULT FALSE;
