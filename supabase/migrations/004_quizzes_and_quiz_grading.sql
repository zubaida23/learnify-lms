-- 004_quizzes_and_quiz_grading.sql

CREATE TABLE IF NOT EXISTS public.quizzes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id uuid REFERENCES public.courses (id) ON DELETE CASCADE,
    lesson_id uuid REFERENCES public.lessons (id) ON DELETE CASCADE,
    title text NOT NULL,
    description text,
    instructions text,
    passing_score numeric(5,2) NOT NULL DEFAULT 0 CHECK (passing_score >= 0 AND passing_score <= 100),
    time_limit_minutes integer CHECK (time_limit_minutes IS NULL OR time_limit_minutes > 0),
    attempts_allowed integer NOT NULL DEFAULT 1 CHECK (attempts_allowed >= 1),
    is_published boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CHECK (
        (course_id IS NOT NULL AND lesson_id IS NULL)
        OR (course_id IS NULL AND lesson_id IS NOT NULL)
    )
);

CREATE TABLE IF NOT EXISTS public.quiz_questions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id uuid NOT NULL REFERENCES public.quizzes (id) ON DELETE CASCADE,
    question_text text NOT NULL,
    question_type text NOT NULL CHECK (question_type IN ('multiple_choice', 'true_false', 'short_answer', 'essay')),
    options jsonb,
    points integer NOT NULL DEFAULT 1 CHECK (points > 0),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.quiz_answer_keys (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id uuid NOT NULL UNIQUE REFERENCES public.quiz_questions (id) ON DELETE CASCADE,
    correct_answer jsonb NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.quiz_attempts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id uuid NOT NULL REFERENCES public.quizzes (id) ON DELETE CASCADE,
    student_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
    started_at timestamptz NOT NULL DEFAULT now(),
    submitted_at timestamptz,
    score numeric(5,2) NOT NULL DEFAULT 0,
    total_points integer NOT NULL DEFAULT 0,
    percentage numeric(5,2) NOT NULL DEFAULT 0 CHECK (percentage >= 0 AND percentage <= 100),
    passed boolean NOT NULL DEFAULT false,
    status text NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'submitted', 'graded', 'expired')),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.quiz_responses (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    attempt_id uuid NOT NULL REFERENCES public.quiz_attempts (id) ON DELETE CASCADE,
    question_id uuid NOT NULL REFERENCES public.quiz_questions (id) ON DELETE CASCADE,
    student_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
    submitted_answer jsonb NOT NULL,
    is_correct boolean,
    submitted_at timestamptz NOT NULL DEFAULT now(),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (attempt_id, question_id)
);

CREATE OR REPLACE FUNCTION public.create_quiz_attempt(p_quiz_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_student_id uuid := auth.uid();
    v_quiz public.quizzes%ROWTYPE;
    v_course_id uuid;
    v_lesson_id uuid;
    v_attempt_count integer;
    v_attempt_id uuid;
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
        RAISE EXCEPTION 'Only student profiles may create quiz attempts';
    END IF;

    SELECT *
      INTO v_quiz
      FROM public.quizzes q
     WHERE q.id = p_quiz_id
     FOR UPDATE;

    IF v_quiz.id IS NULL THEN
        RAISE EXCEPTION 'Quiz not found';
    END IF;

    IF v_quiz.is_published IS DISTINCT FROM true THEN
        RAISE EXCEPTION 'Quiz is not published';
    END IF;

    v_course_id := v_quiz.course_id;
    v_lesson_id := v_quiz.lesson_id;

    IF v_course_id IS NULL AND v_lesson_id IS NOT NULL THEN
        SELECT l.course_id INTO v_course_id FROM public.lessons l WHERE l.id = v_lesson_id;
    END IF;

    IF v_course_id IS NULL THEN
        RAISE EXCEPTION 'Quiz does not resolve to a valid course context';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM public.enrollments e
        WHERE e.student_id = v_student_id
          AND e.course_id = v_course_id
          AND e.enrollment_status IN ('active', 'completed')
    ) THEN
        RAISE EXCEPTION 'Student is not enrolled in the course';
    END IF;

    SELECT COUNT(*)
      INTO v_attempt_count
      FROM public.quiz_attempts qa
     WHERE qa.quiz_id = p_quiz_id
       AND qa.student_id = v_student_id
       AND qa.status IN ('in_progress', 'submitted', 'graded');

    IF v_attempt_count >= v_quiz.attempts_allowed THEN
        RAISE EXCEPTION 'Maximum quiz attempts exceeded';
    END IF;

    INSERT INTO public.quiz_attempts (
        quiz_id,
        student_id,
        status,
        score,
        total_points,
        percentage,
        passed
    )
    VALUES (
        p_quiz_id,
        v_student_id,
        'in_progress',
        0,
        0,
        0,
        false
    )
    RETURNING id INTO v_attempt_id;

    RETURN v_attempt_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.submit_quiz_response(p_attempt_id uuid, p_question_id uuid, p_answer jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_student_id uuid := auth.uid();
    v_attempt public.quiz_attempts%ROWTYPE;
    v_question public.quiz_questions%ROWTYPE;
BEGIN
    IF v_student_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    IF p_answer IS NULL THEN
        RAISE EXCEPTION 'Answer payload is required';
    END IF;

    SELECT *
      INTO v_attempt
      FROM public.quiz_attempts qa
     WHERE qa.id = p_attempt_id;

    IF v_attempt.id IS NULL THEN
        RAISE EXCEPTION 'Quiz attempt not found';
    END IF;

    IF v_attempt.student_id <> v_student_id THEN
        RAISE EXCEPTION 'Attempt does not belong to current user';
    END IF;

    IF v_attempt.status <> 'in_progress' THEN
        RAISE EXCEPTION 'Only in-progress attempts can receive responses';
    END IF;

    SELECT *
      INTO v_question
      FROM public.quiz_questions qq
     WHERE qq.id = p_question_id;

    IF v_question.id IS NULL THEN
        RAISE EXCEPTION 'Question not found';
    END IF;

    IF v_question.quiz_id <> v_attempt.quiz_id THEN
        RAISE EXCEPTION 'Question does not belong to the attempt quiz';
    END IF;

    INSERT INTO public.quiz_responses (
        attempt_id,
        question_id,
        student_id,
        submitted_answer,
        is_correct,
        submitted_at
    )
    VALUES (
        p_attempt_id,
        p_question_id,
        v_student_id,
        p_answer,
        NULL,
        now()
    )
    ON CONFLICT (attempt_id, question_id) DO UPDATE
       SET submitted_answer = EXCLUDED.submitted_answer,
           updated_at = now(),
           submitted_at = now();
END;
$$;

CREATE OR REPLACE FUNCTION public.submit_quiz_attempt(p_attempt_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_student_id uuid := auth.uid();
    v_attempt public.quiz_attempts%ROWTYPE;
BEGIN
    IF v_student_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    SELECT *
      INTO v_attempt
      FROM public.quiz_attempts qa
     WHERE qa.id = p_attempt_id
     FOR UPDATE;

    IF v_attempt.id IS NULL THEN
        RAISE EXCEPTION 'Quiz attempt not found';
    END IF;

    IF v_attempt.student_id <> v_student_id THEN
        RAISE EXCEPTION 'Attempt does not belong to current user';
    END IF;

    IF v_attempt.status <> 'in_progress' THEN
        RAISE EXCEPTION 'Only in-progress attempts may be submitted';
    END IF;

    UPDATE public.quiz_attempts
       SET status = 'submitted',
           submitted_at = now(),
           updated_at = now()
     WHERE id = p_attempt_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.grade_quiz_attempt(p_attempt_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_attempt public.quiz_attempts%ROWTYPE;
    v_total_points integer := 0;
    v_score numeric(5,2) := 0;
    v_question_record record;
    v_submitted_answer jsonb;
    v_correct_answer jsonb;
    v_is_correct boolean;
    v_effective_course_id uuid;
BEGIN
    SELECT * INTO v_attempt
    FROM public.quiz_attempts
    WHERE id = p_attempt_id;

    IF v_attempt.id IS NULL THEN
        RAISE EXCEPTION 'Quiz attempt not found';
    END IF;

    IF v_attempt.status <> 'submitted' THEN
        RAISE EXCEPTION 'Only submitted attempts may be graded';
    END IF;

    SELECT COALESCE(q.course_id, l.course_id)
      INTO v_effective_course_id
      FROM public.quizzes q
      LEFT JOIN public.lessons l ON l.id = q.lesson_id
     WHERE q.id = v_attempt.quiz_id;

    IF v_effective_course_id IS NULL THEN
        RAISE EXCEPTION 'Quiz does not resolve to a valid course';
    END IF;

    IF NOT public.is_admin() AND NOT EXISTS (
        SELECT 1
        FROM public.courses c
        WHERE c.id = v_effective_course_id
          AND c.instructor_id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'Unauthorized to grade this quiz attempt';
    END IF;

    FOR v_question_record IN
        SELECT qq.id, qq.points
        FROM public.quiz_questions qq
        WHERE qq.quiz_id = v_attempt.quiz_id
    LOOP
        v_total_points := v_total_points + v_question_record.points;

        SELECT qr.submitted_answer
          INTO v_submitted_answer
          FROM public.quiz_responses qr
         WHERE qr.attempt_id = p_attempt_id
           AND qr.question_id = v_question_record.id
         ORDER BY qr.created_at DESC
         LIMIT 1;

        SELECT qak.correct_answer
          INTO v_correct_answer
          FROM public.quiz_answer_keys qak
         WHERE qak.question_id = v_question_record.id;

        IF v_correct_answer IS NOT NULL AND v_submitted_answer IS NOT NULL THEN
            v_is_correct := (v_submitted_answer = v_correct_answer);
            IF v_is_correct THEN
                v_score := v_score + v_question_record.points;
            END IF;
        END IF;
    END LOOP;

    UPDATE public.quiz_attempts
       SET score = v_score,
           total_points = v_total_points,
           percentage = CASE
               WHEN v_total_points = 0 THEN 0
               ELSE ROUND((v_score / v_total_points) * 100, 2)
           END,
           passed = CASE
               WHEN v_total_points = 0 THEN false
               ELSE ROUND((v_score / v_total_points) * 100, 2) >= (
                   SELECT q.passing_score
                   FROM public.quizzes q
                   WHERE q.id = v_attempt.quiz_id
               )
           END,
           status = 'graded',
           submitted_at = COALESCE(submitted_at, now()),
           updated_at = now()
     WHERE id = p_attempt_id;

    UPDATE public.quiz_responses qr
       SET is_correct = (
           SELECT qak.correct_answer = qr.submitted_answer
           FROM public.quiz_answer_keys qak
           WHERE qak.question_id = qr.question_id
       ),
           updated_at = now()
     WHERE qr.attempt_id = p_attempt_id;
END;
$$;

CREATE TRIGGER trg_quizzes_set_updated_at
BEFORE UPDATE ON public.quizzes
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_quiz_questions_set_updated_at
BEFORE UPDATE ON public.quiz_questions
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_quiz_answer_keys_set_updated_at
BEFORE UPDATE ON public.quiz_answer_keys
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_quiz_attempts_set_updated_at
BEFORE UPDATE ON public.quiz_attempts
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_quiz_responses_set_updated_at
BEFORE UPDATE ON public.quiz_responses
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_quizzes_course_id
    ON public.quizzes (course_id);

CREATE INDEX IF NOT EXISTS idx_quizzes_lesson_id
    ON public.quizzes (lesson_id);

CREATE INDEX IF NOT EXISTS idx_quizzes_published
    ON public.quizzes (is_published);

CREATE INDEX IF NOT EXISTS idx_quiz_questions_quiz_id
    ON public.quiz_questions (quiz_id);

CREATE INDEX IF NOT EXISTS idx_quiz_answer_keys_question_id
    ON public.quiz_answer_keys (question_id);

CREATE INDEX IF NOT EXISTS idx_quiz_attempts_quiz_student
    ON public.quiz_attempts (quiz_id, student_id);

CREATE INDEX IF NOT EXISTS idx_quiz_attempts_student_id
    ON public.quiz_attempts (student_id);

CREATE INDEX IF NOT EXISTS idx_quiz_responses_attempt_question
    ON public.quiz_responses (attempt_id, question_id);

REVOKE ALL ON TABLE public.quizzes FROM PUBLIC;
REVOKE ALL ON TABLE public.quiz_questions FROM PUBLIC;
REVOKE ALL ON TABLE public.quiz_answer_keys FROM PUBLIC;
REVOKE ALL ON TABLE public.quiz_attempts FROM PUBLIC;
REVOKE ALL ON TABLE public.quiz_responses FROM PUBLIC;

REVOKE ALL ON FUNCTION public.create_quiz_attempt(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.submit_quiz_response(uuid, uuid, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.submit_quiz_attempt(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.grade_quiz_attempt(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC;

GRANT SELECT ON TABLE public.quizzes TO authenticated;
GRANT SELECT ON TABLE public.quiz_questions TO authenticated;
GRANT SELECT ON TABLE public.quiz_attempts TO authenticated;
GRANT SELECT ON TABLE public.quiz_responses TO authenticated;
REVOKE INSERT ON TABLE public.quiz_attempts FROM authenticated;
REVOKE INSERT ON TABLE public.quiz_responses FROM authenticated;
REVOKE UPDATE (score, total_points, percentage, passed, status) ON TABLE public.quiz_attempts FROM authenticated;
REVOKE UPDATE (is_correct) ON TABLE public.quiz_responses FROM authenticated;
REVOKE DELETE ON TABLE public.quiz_attempts FROM authenticated;
REVOKE DELETE ON TABLE public.quiz_responses FROM authenticated;
REVOKE INSERT ON TABLE public.quiz_answer_keys FROM authenticated;
REVOKE SELECT ON TABLE public.quiz_answer_keys FROM authenticated;
REVOKE UPDATE ON TABLE public.quiz_answer_keys FROM authenticated;
REVOKE DELETE ON TABLE public.quiz_answer_keys FROM authenticated;

GRANT EXECUTE ON FUNCTION public.create_quiz_attempt(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_quiz_response(uuid, uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_quiz_attempt(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.grade_quiz_attempt(uuid) TO authenticated;
