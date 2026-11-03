-- 008_storage_buckets.sql

-- Private bucket strategy:
-- - Public URLs are not used for unpublished or restricted content.
-- - Authenticated users access objects only when authorized by policies.
-- - Files are organized by course and assignment ownership.

-- Bucket: course-thumbnails
-- Bucket: lesson-materials
-- Bucket: assignment-submissions

-- Storage access is configured in Supabase Storage policies manually after migration execution.
-- The following is the intended policy model, not executed SQL.

-- Policy model summary:
-- 1) course-thumbnails:
--    - instructors/admins write for their courses
--    - students read only if course is published and enrolled
--    - unauthenticated users cannot read
-- 2) lesson-materials:
--    - instructors/admins write for their lessons/courses
--    - students read only for published and enrolled course content
--    - unauthenticated users cannot read
-- 3) assignment-submissions:
--    - students upload/download own files only
--    - instructors read submissions for assignments in their own courses
--    - admins read all authorized files
--    - other students cannot access any submission file

-- This migration intentionally documents the storage bucket design
-- without performing any runtime or external storage setup.
