-- Create buckets
INSERT INTO storage.buckets (id, name, public)
VALUES
  ('content-images', 'content-images', true),
  ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- content-images: authenticated users can upload to their own sub-folder
CREATE POLICY "Authenticated users can upload content images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'content-images' AND (storage.foldername(name))[2] = auth.uid()::text);

CREATE POLICY "Authenticated users can update their content images"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'content-images' AND (storage.foldername(name))[2] = auth.uid()::text);

CREATE POLICY "Public read for content images"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'content-images');

-- avatars: authenticated users can upload/replace their own avatar only
CREATE POLICY "Authenticated users can upload their avatar"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'avatars' AND name = auth.uid()::text || '.webp');

CREATE POLICY "Authenticated users can update their avatar"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'avatars' AND name = auth.uid()::text || '.webp');

CREATE POLICY "Public read for avatars"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'avatars');
