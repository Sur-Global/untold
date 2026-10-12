-- Videos uploaded by editors/admins (creators can only embed YouTube/Vimeo/links).
-- Uploads go straight from the browser to storage through a signed URL that only
-- editors/admins can request (see app/api/upload/video), so no storage INSERT policy is needed.
-- The size limit here is capped by the project-wide limit in Supabase → Storage settings.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'content-videos', 'content-videos', true, 524288000,
  ARRAY['video/mp4', 'video/webm', 'video/quicktime']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read for content videos"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'content-videos');
