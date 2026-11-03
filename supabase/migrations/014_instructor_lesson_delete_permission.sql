
-- Remove the old admin-only delete policy
DROP POLICY IF EXISTS lessons_delete_admin_only
ON public.lessons;

-- Allow Admin and the assigned Instructor to delete lessons
CREATE POLICY lessons_delete_admin_or_owner
ON public.lessons
FOR DELETE
USING (
    public.is_admin()
    OR EXISTS (
        SELECT 1
        FROM public.courses c
        WHERE c.id = course_id
        AND c.instructor_id = auth.uid()
    )
);
