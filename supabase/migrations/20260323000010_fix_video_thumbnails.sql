-- Fix missing thumbnails on seeded videos (prior runs used ON CONFLICT DO NOTHING,
-- leaving thumbnail_url NULL if video_meta rows existed before images were added)
UPDATE video_meta SET
  thumbnail_url = 'https://images.unsplash.com/photo-1441122456239-401bf08b1a70?w=800&q=80'
WHERE content_id = 'c3000001-0000-0000-0000-000000000001'
  AND thumbnail_url IS NULL;

UPDATE video_meta SET
  thumbnail_url = 'https://images.unsplash.com/photo-1583417267826-aebc4d1542e1?w=800&q=80'
WHERE content_id = 'c3000001-0000-0000-0000-000000000002'
  AND thumbnail_url IS NULL;

UPDATE video_meta SET
  thumbnail_url = 'https://images.unsplash.com/photo-1553361371-9b22f78e8b1d?w=800&q=80'
WHERE content_id = 'c3000001-0000-0000-0000-000000000003'
  AND thumbnail_url IS NULL;

-- Also sync cover_image_url on content rows in case those are also NULL
UPDATE content SET
  cover_image_url = 'https://images.unsplash.com/photo-1441122456239-401bf08b1a70?w=1200&q=80'
WHERE id = 'c3000001-0000-0000-0000-000000000001'
  AND cover_image_url IS NULL;

UPDATE content SET
  cover_image_url = 'https://images.unsplash.com/photo-1583417267826-aebc4d1542e1?w=1200&q=80'
WHERE id = 'c3000001-0000-0000-0000-000000000002'
  AND cover_image_url IS NULL;

UPDATE content SET
  cover_image_url = 'https://images.unsplash.com/photo-1553361371-9b22f78e8b1d?w=1200&q=80'
WHERE id = 'c3000001-0000-0000-0000-000000000003'
  AND cover_image_url IS NULL;
