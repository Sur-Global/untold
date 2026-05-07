-- Singleton JSON document for platform / marketing settings (admin-editable)

CREATE TABLE platform_settings (
  id          text PRIMARY KEY DEFAULT 'default',
  settings    jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER platform_settings_updated_at
  BEFORE UPDATE ON platform_settings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

INSERT INTO platform_settings (id, settings) VALUES ('default', '{}')
ON CONFLICT (id) DO NOTHING;

ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "platform_settings_select_all" ON platform_settings FOR SELECT USING (true);

CREATE POLICY "platform_settings_insert_admin" ON platform_settings FOR INSERT
  WITH CHECK (current_user_role() = 'admin');

CREATE POLICY "platform_settings_update_admin" ON platform_settings FOR UPDATE
  USING (current_user_role() = 'admin')
  WITH CHECK (current_user_role() = 'admin');

CREATE POLICY "platform_settings_delete_admin" ON platform_settings FOR DELETE
  USING (current_user_role() = 'admin');
