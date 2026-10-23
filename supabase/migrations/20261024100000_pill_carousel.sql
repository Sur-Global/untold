-- Knowledge pills can be a carousel of slides (photo with text, text on the brand's lilac, or a finished image).
--   format             'text' (a very short written pill, as before) or 'carousel'
--   slides             the slides in the language the pill was written in:
--                      [{ id, kind: 'photo'|'text'|'image', image_url, text, credit, logo, logo_color }]
--   slide_translations the texts of the slides in the other languages: { en: [{ id, text }], … }
ALTER TABLE pill_meta
  ADD COLUMN format TEXT NOT NULL DEFAULT 'text' CHECK (format IN ('text', 'carousel')),
  ADD COLUMN slides JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN slide_translations JSONB;
