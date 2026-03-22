-- Add missing images to knowledge pills
UPDATE pill_meta SET image_url = 'https://images.unsplash.com/photo-1614064641938-3bbee52942c7?w=800&q=80'
  WHERE content_id = 'c5000001-0000-0000-0000-000000000002'; -- Right to Be Forgotten (digital privacy)

UPDATE pill_meta SET image_url = 'https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?w=800&q=80'
  WHERE content_id = 'c5000001-0000-0000-0000-000000000004'; -- Amazon Fund (rainforest)

UPDATE pill_meta SET image_url = 'https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=800&q=80'
  WHERE content_id = 'c5000001-0000-0000-0000-000000000006'; -- Algorithmic Bias (AI/tech)
