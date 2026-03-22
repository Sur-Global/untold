-- Set a fallback thumbnail for any video that still has a null thumbnail_url
-- (catches user-created videos that were saved without a thumbnail)
UPDATE video_meta
SET thumbnail_url = 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=800&q=80'
WHERE thumbnail_url IS NULL;

-- Also sync cover_image_url on the content row if it's null
UPDATE content
SET cover_image_url = 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=800&q=80'
WHERE type = 'video'
  AND cover_image_url IS NULL;
