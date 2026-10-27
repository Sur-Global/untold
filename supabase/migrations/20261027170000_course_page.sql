-- The page of a course: banner, key facts, who it is for, who gives it, price note and the registration to the
-- introductory sessions (a button to the organisers' form, or the form embedded). The subtitle is the translation's
-- excerpt and the full description is its body (rich text), so they need no columns here.
ALTER TABLE course_meta
  ADD COLUMN banner_url TEXT,
  ADD COLUMN modality TEXT CHECK (modality IN ('online', 'in_person', 'hybrid')),
  ADD COLUMN place TEXT,
  ADD COLUMN starts_on DATE,
  ADD COLUMN language_label TEXT,
  ADD COLUMN level TEXT CHECK (level IN ('introductory', 'intermediate', 'advanced')),
  ADD COLUMN certificate BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN audience TEXT,
  ADD COLUMN price_note TEXT,
  ADD COLUMN provider_name TEXT,
  ADD COLUMN provider_url TEXT,
  ADD COLUMN registration_mode TEXT NOT NULL DEFAULT 'button' CHECK (registration_mode IN ('button', 'embed')),
  ADD COLUMN registration_url TEXT,
  ADD COLUMN registration_label TEXT,
  ADD COLUMN registration_note TEXT,
  -- up to two: [{ "date": "2026-02-12", "time": "18:00", "status": "open" | "few" | "full" }]
  ADD COLUMN intro_sessions JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN intro_timezone TEXT;
