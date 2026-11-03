-- 012_assignment_submission_feedback.sql

ALTER TABLE public.assignment_submissions
    ADD COLUMN IF NOT EXISTS feedback_text text;

CREATE OR REPLACE FUNCTION public.grade_assignment_submission(p_submission_id uuid, p_grade numeric(5,2), p_feedback_text text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_submission public.assignment_submissions%ROWTYPE;
    v_assignment public.assignments%ROWTYPE;
    v_course_id uuid;
    v_clean_feedback text;
BEGIN
    IF p_grade IS NULL THEN
        RAISE EXCEPTION 'Grade is required';
    END IF;

    SELECT * INTO v_submission
    FROM public.assignment_submissions
    WHERE id = p_submission_id;

    IF v_submission.id IS NULL THEN
        RAISE EXCEPTION 'Submission not found';
    END IF;

    SELECT * INTO v_assignment
    FROM public.assignments
    WHERE id = v_submission.assignment_id;

    IF v_assignment.id IS NULL THEN
        RAISE EXCEPTION 'Assignment not found';
    END IF;

    v_course_id := v_assignment.course_id;

    IF NOT public.is_admin() AND NOT EXISTS (
        SELECT 1
        FROM public.courses c
        WHERE c.id = v_course_id
          AND c.instructor_id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'Unauthorized to grade assignment submission';
    END IF;

    IF p_grade < 0 OR p_grade > v_assignment.max_score THEN
        RAISE EXCEPTION 'Grade must be between 0 and assignment max score';
    END IF;

    v_clean_feedback := NULLIF(btrim(COALESCE(p_feedback_text, '')), '');

    UPDATE public.assignment_submissions
       SET grade = p_grade,
           feedback_text = v_clean_feedback,
           status = 'graded',
           reviewed_at = now(),
           updated_at = now()
     WHERE id = p_submission_id;
END;
$$;

REVOKE ALL ON FUNCTION public.grade_assignment_submission(uuid, numeric, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.grade_assignment_submission(uuid, numeric, text) TO authenticated;
