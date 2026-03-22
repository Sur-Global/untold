-- Seed image credits for existing articles
-- 1. Add cover image credits to articles that have a cover image but no credits
-- 2. Add credits to inline images in article body JSON

-- Step 1: cover image credits
UPDATE content
SET image_credits = 'Photo: Unsplash'
WHERE type = 'article'
  AND status = 'published'
  AND cover_image_url IS NOT NULL
  AND (image_credits IS NULL OR image_credits = '');

-- Step 2: recursive function to add credits to image nodes in TipTap JSON
CREATE OR REPLACE FUNCTION _add_image_credit(node jsonb)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
BEGIN
  IF node IS NULL THEN
    RETURN node;
  END IF;

  -- Add credit to image nodes that don't already have one
  IF node->>'type' = 'image' THEN
    IF (node->'attrs'->>'credit') IS NULL OR (node->'attrs'->>'credit') = '' THEN
      RETURN jsonb_set(node, '{attrs,credit}', '"Photo: Unsplash"'::jsonb);
    END IF;
    RETURN node;
  END IF;

  -- Recurse into content array
  IF node ? 'content' AND jsonb_typeof(node->'content') = 'array' AND jsonb_array_length(node->'content') > 0 THEN
    RETURN jsonb_set(
      node,
      '{content}',
      (SELECT jsonb_agg(_add_image_credit(el)) FROM jsonb_array_elements(node->'content') AS el)
    );
  END IF;

  RETURN node;
END;
$$;

-- Step 3: apply to all article body translations that contain image nodes
UPDATE content_translations ct
SET body = _add_image_credit(ct.body)
FROM content c
WHERE ct.content_id = c.id
  AND c.type = 'article'
  AND ct.body IS NOT NULL
  AND ct.body::text LIKE '%"type":"image"%';

-- Clean up the helper function
DROP FUNCTION IF EXISTS _add_image_credit(jsonb);
