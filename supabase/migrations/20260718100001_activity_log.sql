-- Simple audit trail: who changed what, and when. Visible only to admins and
-- editors (RLS-gated), written by the authenticated actor performing the action.
CREATE TABLE activity_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type   TEXT NOT NULL,
  entity_id     UUID,
  entity_label  TEXT,
  action        TEXT NOT NULL,
  actor_id      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_name    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX activity_log_created_at_idx ON activity_log (created_at DESC);

ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "activity_log_select_privileged" ON activity_log FOR SELECT
  USING (current_user_role() IN ('admin', 'editor'));

CREATE POLICY "activity_log_insert_own" ON activity_log FOR INSERT
  WITH CHECK (actor_id = auth.uid());
