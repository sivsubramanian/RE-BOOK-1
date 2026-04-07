-- 004 - Cloudinary image storage cleanup

-- Remove legacy local-upload paths so frontend fallback is used when needed.
UPDATE books
SET image_url = ''
WHERE image_url LIKE '/uploads/%'
   OR image_url LIKE '%/uploads/%';