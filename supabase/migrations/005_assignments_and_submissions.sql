-- 005_assignments_and_submissions.sql

CREATE TABLE IF NOT EXISTS public.assignments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id uuid NOT NULL REFERENCES public.courses (id) ON DELETE CASCADE,
    title text NOT NULL,
    description text,
    instructions text,
    due_date timestamptz,
    max_score integer NOT NULL DEFAULT 100 CHECK (max_score > 0),
    is_published boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.assignment_submissions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id uuid NOT NULL REFERENCES public.assignments (id) ON DELETE CASCADE,
    student_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
    file_url text,
    submission_text text,
    grade numeric(5,2) CHECK (grade >= 0),
    status text NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'reviewed', 'graded', 'late')),
    submitted_at timestamptz NOT NULL DEFAULT now(),
    reviewed_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (assignment_id, student_id)
);

CREATE OR REPLACE FUNCTION public.submit_assignment(p_assignment_id uuid, p_file_url text, p_submission_text text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_student_id uuid := auth.uid();
    v_assignment public.assignments%ROWTYPE;
    v_enrollment public.enrollments%ROWTYPE;
    v_submission_id uuid;
    v_submission_status text;
BEGIN
    IF v_student_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = v_student_id
          AND p.role = 'student'
    ) THEN
        RAISE EXCEPTION 'Only student profiles may submit assignments';
    END IF;

    SELECT *
      INTO v_assignment
      FROM public.assignments a
     WHERE a.id = p_assignment_id;

    IF v_assignment.id IS NULL THEN
        RAISE EXCEPTION 'Assignment not found';
    END IF;

    IF v_assignment.is_published IS DISTINCT FROM true THEN
        RAISE EXCEPTION 'Assignment is not published';
    END IF;

    SELECT *
      INTO v_enrollment
      FROM public.enrollments e
     WHERE e.student_id = v_student_id
       AND e.course_id = v_assignment.course_id
       AND e.enrollment_status IN ('active', 'completed');

    IF v_enrollment.student_id IS NULL THEN
        RAISE EXCEPTION 'Student is not enrolled in the assignment course';
    END IF;

    IF COALESCE(p_file_url, '') = '' AND COALESCE(p_submission_text, '') = '' THEN
        RAISE EXCEPTION 'Submission requires file_url or submission_text';
    END IF;

    IF COALESCE(p_submission_text, '') <> '' AND btrim(p_submission_text) = '' THEN
        RAISE EXCEPTION 'Submission text cannot be blank or whitespace only';
    END IF;

    IF p_file_url IS NOT NULL AND btrim(p_file_url) = '' THEN
        RAISE EXCEPTION 'file_url cannot be blank or whitespace only';
    END IF;

    v_submission_status := CASE
        WHEN v_assignment.due_date IS NOT NULL AND now() > v_assignment.due_date THEN 'late'
        ELSE 'submitted'
    END;

    INSERT INTO public.assignment_submissions (
        assignment_id,
        student_id,
        file_url,
        submission_text,
        grade,
        status,
        submitted_at,
        reviewed_at
    )
    VALUES (
        p_assignment_id,
        v_student_id,
        p_file_url,
        p_submission_text,
        NULL,
        v_submission_status,
        now(),
        NULL
    )
    ON CONFLICT (assignment_id, student_id) DO UPDATE
       SET file_url = EXCLUDED.file_url,
           submission_text = EXCLUDED.submission_text,
           status = EXCLUDED.status,
           submitted_at = now(),
           reviewed_at = NULL,
           updated_at = now()
    RETURNING id INTO v_submission_id;

    RETURN v_submission_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.grade_assignment_submission(p_submission_id uuid, p_grade numeric(5,2))
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_submission public.assignment_submissions%ROWTYPE;
    v_assignment public.assignments%ROWTYPE;
    v_course_id uuid;
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

    UPDATE public.assignment_submissions
       SET grade = p_grade,
           status = 'graded',
           reviewed_at = now(),
           updated_at = now()
     WHERE id = p_submission_id;
END;
$$;

CREATE TRIGGER trg_assignments_set_updated_at
BEFORE UPDATE ON public.assignments
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_assignment_submissions_set_updated_at
BEFORE UPDATE ON public.assignment_submissions
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_assignments_course_id
    ON public.assignments (course_id);

CREATE INDEX IF NOT EXISTS idx_assignments_due_date
    ON public.assignments (due_date);

CREATE INDEX IF NOT EXISTS idx_assignment_submissions_assignment_student
    ON public.assignment_submissions (assignment_id, student_id);

CREATE INDEX IF NOT EXISTS idx_assignment_submissions_student_id
    ON public.assignment_submissions (student_id);

CREATE INDEX IF NOT EXISTS idx_assignment_submissions_status
    ON public.assignment_submissions (status);

REVOKE ALL ON TABLE public.assignments FROM PUBLIC;
REVOKE ALL ON TABLE public.assignment_submissions FROM PUBLIC;
REVOKE ALL ON FUNCTION public.submit_assignment(uuid, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.grade_assignment_submission(uuid, numeric) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC;

GRANT SELECT ON TABLE public.assignments TO authenticated;
GRANT SELECT ON TABLE public.assignment_submissions TO authenticated;
REVOKE INSERT, UPDATE ON TABLE public.assignment_submissions FROM authenticated;
REVOKE DELETE ON TABLE public.assignment_submissions FROM authenticated;
REVOKE INSERT (grade, reviewed_at) ON TABLE public.assignment_submissions FROM authenticated;
REVOKE UPDATE (grade, reviewed_at, status) ON TABLE public.assignment_submissions FROM authenticated;

GRANT EXECUTE ON FUNCTION public.submit_assignment(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.grade_assignment_submission(uuid, numeric) TO authenticated;
