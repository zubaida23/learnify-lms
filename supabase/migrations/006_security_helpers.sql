-- 006_security_helpers.sql

CREATE OR REPLACE FUNCTION public.is_course_instructor(p_course_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.courses c
        WHERE c.id = p_course_id
          AND c.instructor_id = auth.uid()
    );
$$;

CREATE OR REPLACE FUNCTION public.is_enrolled_in_course(p_course_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
    SELECT (
        p_user_id = auth.uid()
        AND EXISTS (
            SELECT 1
            FROM public.enrollments e
            WHERE e.course_id = p_course_id
              AND e.student_id = auth.uid()
              AND e.enrollment_status IN ('active', 'completed')
        )
    );
$$;

CREATE OR REPLACE FUNCTION public.can_enroll_in_course(p_course_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT (
        p_user_id = auth.uid()
        AND EXISTS (
            SELECT 1
            FROM public.courses c
            WHERE c.id = p_course_id
              AND c.status = 'published'
              AND c.is_published = true
              AND c.price = 0
              AND NOT EXISTS (
                  SELECT 1
                  FROM public.enrollments e
                  WHERE e.course_id = c.id
                    AND e.student_id = auth.uid()
              )
        )
    );
$$;

CREATE OR REPLACE FUNCTION public.can_mark_lesson_complete(p_lesson_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT (
        p_user_id = auth.uid()
        AND EXISTS (
            SELECT 1
            FROM public.lessons l
            JOIN public.enrollments e ON e.course_id = l.course_id
            WHERE l.id = p_lesson_id
              AND e.student_id = auth.uid()
              AND e.enrollment_status IN ('active', 'completed')
        )
    );
$$;

CREATE OR REPLACE FUNCTION public.is_assignment_instructor_owned(p_assignment_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
    SELECT (
        p_user_id = auth.uid()
        AND EXISTS (
            SELECT 1
            FROM public.assignments a
            JOIN public.courses c ON c.id = a.course_id
            WHERE a.id = p_assignment_id
              AND c.instructor_id = auth.uid()
        )
    );
$$;

CREATE OR REPLACE FUNCTION public.is_quiz_instructor_owned(p_quiz_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
    SELECT (
        p_user_id = auth.uid()
        AND EXISTS (
            SELECT 1
            FROM public.quizzes q
            LEFT JOIN public.lessons l ON l.id = q.lesson_id
            JOIN public.courses c ON c.id = COALESCE(q.course_id, l.course_id)
            WHERE q.id = p_quiz_id
              AND c.instructor_id = auth.uid()
        )
    );
$$;

CREATE OR REPLACE FUNCTION public.has_course_access(p_course_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
    SELECT (
        p_user_id = auth.uid()
        AND (
            public.is_admin()
            OR public.is_course_instructor(p_course_id)
            OR public.is_enrolled_in_course(p_course_id, auth.uid())
        )
    );
$$;

CREATE OR REPLACE FUNCTION public.can_submit_quiz_attempt(p_quiz_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
    SELECT (
        p_user_id = auth.uid()
        AND EXISTS (
            SELECT 1
            FROM public.quizzes q
            LEFT JOIN public.lessons l ON l.id = q.lesson_id
            JOIN public.enrollments e ON e.course_id = COALESCE(q.course_id, l.course_id)
            WHERE q.id = p_quiz_id
              AND q.is_published = true
              AND e.student_id = auth.uid()
              AND e.enrollment_status IN ('active', 'completed')
        )
    );
$$;

CREATE OR REPLACE FUNCTION public.can_grade_submission(p_submission_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
    SELECT (
        p_user_id = auth.uid()
        AND (
            public.is_admin()
            OR EXISTS (
                SELECT 1
                FROM public.assignment_submissions s
                JOIN public.assignments a ON a.id = s.assignment_id
                JOIN public.courses c ON c.id = a.course_id
                WHERE s.id = p_submission_id
                  AND c.instructor_id = auth.uid()
            )
        )
    );
$$;

CREATE OR REPLACE FUNCTION public.upsert_quiz_answer_key(p_question_id uuid, p_correct_answer jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id uuid := auth.uid();
    v_question public.quiz_questions%ROWTYPE;
    v_answer_key_id uuid;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    SELECT *
      INTO v_question
      FROM public.quiz_questions qq
     WHERE qq.id = p_question_id;

    IF v_question.id IS NULL THEN
        RAISE EXCEPTION 'Question not found';
    END IF;

    IF NOT public.is_admin() AND NOT EXISTS (
        SELECT 1
        FROM public.quizzes q
        LEFT JOIN public.lessons l ON l.id = q.lesson_id
        JOIN public.courses c ON c.id = COALESCE(q.course_id, l.course_id)
        WHERE q.id = v_question.quiz_id
          AND c.instructor_id = v_user_id
    ) THEN
        RAISE EXCEPTION 'Unauthorized to manage answer keys for this quiz';
    END IF;

    INSERT INTO public.quiz_answer_keys (
        question_id,
        correct_answer
    )
    VALUES (
        p_question_id,
        p_correct_answer
    )
    ON CONFLICT (question_id) DO UPDATE
       SET correct_answer = EXCLUDED.correct_answer,
           updated_at = now()
    RETURNING id INTO v_answer_key_id;

    RETURN v_answer_key_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_quiz_answer_key(p_question_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id uuid := auth.uid();
    v_question public.quiz_questions%ROWTYPE;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    SELECT *
      INTO v_question
      FROM public.quiz_questions qq
     WHERE qq.id = p_question_id;

    IF v_question.id IS NULL THEN
        RAISE EXCEPTION 'Question not found';
    END IF;

    IF NOT public.is_admin() AND NOT EXISTS (
        SELECT 1
        FROM public.quizzes q
        LEFT JOIN public.lessons l ON l.id = q.lesson_id
        JOIN public.courses c ON c.id = COALESCE(q.course_id, l.course_id)
        WHERE q.id = v_question.quiz_id
          AND c.instructor_id = v_user_id
    ) THEN
        RAISE EXCEPTION 'Unauthorized to remove answer keys for this quiz';
    END IF;

    DELETE FROM public.quiz_answer_keys
     WHERE question_id = p_question_id;
END;
$$;

REVOKE ALL ON FUNCTION public.is_course_instructor(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_enrolled_in_course(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_enroll_in_course(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_mark_lesson_complete(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_assignment_instructor_owned(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_quiz_instructor_owned(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.has_course_access(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_submit_quiz_attempt(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_grade_submission(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.upsert_quiz_answer_key(uuid, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.delete_quiz_answer_key(uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.upsert_quiz_answer_key(uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_quiz_answer_key(uuid) TO authenticated;
