-- Remove all tags associated with video content (auto-imported from YouTube metadata)
delete from content_tags
where content_id in (
  select id from content where type = 'video'
);

-- Remove orphaned tags (no longer referenced by any content)
delete from tags
where id not in (
  select distinct tag_id from content_tags
);
