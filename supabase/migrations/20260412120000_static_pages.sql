-- Static CMS pages (e.g. /about, /contact) with translations and optional footer links

CREATE TABLE static_pages (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                TEXT UNIQUE NOT NULL,
  status              content_status NOT NULL DEFAULT 'draft',
  show_in_footer      BOOLEAN NOT NULL DEFAULT FALSE,
  footer_sort_order   INT NOT NULL DEFAULT 0,
  published_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER static_pages_updated_at
  BEFORE UPDATE ON static_pages
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE static_page_translations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  static_page_id  UUID NOT NULL REFERENCES static_pages(id) ON DELETE CASCADE,
  locale          TEXT NOT NULL,
  title           TEXT NOT NULL,
  body            JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (static_page_id, locale)
);

CREATE INDEX static_pages_footer_idx
  ON static_pages (footer_sort_order)
  WHERE status = 'published' AND show_in_footer = TRUE;

ALTER TABLE static_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE static_page_translations ENABLE ROW LEVEL SECURITY;

-- Published pages: public read
CREATE POLICY "static_pages_select_published" ON static_pages FOR SELECT
  USING (status = 'published');

CREATE POLICY "static_pages_admin_all" ON static_pages FOR ALL
  USING (current_user_role() = 'admin')
  WITH CHECK (current_user_role() = 'admin');

-- Translations: read rows for published pages, or admin reads all
CREATE POLICY "static_page_tr_select_published" ON static_page_translations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM static_pages sp
      WHERE sp.id = static_page_translations.static_page_id
        AND sp.status = 'published'
    )
  );

CREATE POLICY "static_page_tr_select_admin" ON static_page_translations FOR SELECT
  USING (current_user_role() = 'admin');

CREATE POLICY "static_page_tr_insert_admin" ON static_page_translations FOR INSERT
  WITH CHECK (current_user_role() = 'admin');

CREATE POLICY "static_page_tr_update_admin" ON static_page_translations FOR UPDATE
  USING (current_user_role() = 'admin')
  WITH CHECK (current_user_role() = 'admin');

CREATE POLICY "static_page_tr_delete_admin" ON static_page_translations FOR DELETE
  USING (current_user_role() = 'admin');
