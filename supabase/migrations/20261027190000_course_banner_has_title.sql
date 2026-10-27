-- The picture at the top of a course page may already carry the course's title and subtitle (a designed banner): then the page
-- does not repeat them under it.
ALTER TABLE course_meta
  ADD COLUMN IF NOT EXISTS banner_has_title BOOLEAN NOT NULL DEFAULT FALSE;
