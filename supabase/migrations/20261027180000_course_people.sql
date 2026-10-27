-- The people of a course: up to four teachers and two SurGlobal facilitators, each with a name, a line about their role, a
-- short presentation, a photo and a link. Free entries (they need not have a profile on the platform).
ALTER TABLE course_meta
  -- [{ "group": "teacher" | "facilitator", "name": "…", "role": "…", "bio": "…", "photo_url": "https://…", "link_url": "https://…" }]
  ADD COLUMN IF NOT EXISTS people JSONB NOT NULL DEFAULT '[]';
