-- 003_enrollments_and_progress.sql

CREATE TABLE IF NOT EXISTS public.enrollments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
    course_id uuid NOT NULL REFERENCES public.courses (id) ON DELETE CASCADE,
    enrollment_status text NOT NULL DEFAULT 'active' CHECK (enrollment_status IN ('active', 'completed', 'paused', 'cancelled')),
    progress_percent numeric(5,2) NOT NULL DEFAULT 0 CHECK (progress_percent >= 0 AND progress_percent <= 100),
    enrolled_at timestamptz NOT NULL DEFAULT now(),
    completed_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (student_id, course_id)
);

CREATE TABLE IF NOT EXISTS public.lesson_progress (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
    lesson_id uuid NOT NULL REFERENCES public.lessons (id) ON DELETE CASCADE,
    status text NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed')),
    progress_percent numeric(5,2) NOT NULL DEFAULT 0 CHECK (progress_percent >= 0 AND progress_percent <= 100),
    started_at timestamptz,
    completed_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (student_id, lesson_id)
);

CREATE OR REPLACE FUNCTION public.create_enrollment_for_student(p_course_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_student_id uuid := auth.uid();
    v_course public.courses%ROWTYPE;
    v_enrollment_id uuid;
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
        RAISE EXCEPTION 'Only student profiles may enroll';
    END IF;

    SELECT *
      INTO v_course
      FROM public.courses c
     WHERE c.id = p_course_id;

    IF v_course.id IS NULL THEN
        RAISE EXCEPTION 'Course not found';
    END IF;

    IF v_course.status <> 'published' OR v_course.is_published IS DISTINCT FROM true THEN
        RAISE EXCEPTION 'Course is not currently published';
    END IF;

    IF v_course.price IS DISTINCT FROM 0 THEN
        RAISE EXCEPTION 'Only free published courses can be enrolled through this workflow';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM public.enrollments e
        WHERE e.student_id = v_student_id
          AND e.course_id = p_course_id
    ) THEN
        RAISE EXCEPTION 'Student is already enrolled in this course';
    END IF;

    INSERT INTO public.enrollments (
        student_id,
        course_id,
        enrollment_status,
        progress_percent,
        enrolled_at,
        completed_at
    )
    VALUES (
        v_student_id,
        p_course_id,
        'active',
        0,
        now(),
        NULL
    )
    RETURNING id INTO v_enrollment_id;

    RETURN v_enrollment_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.record_lesson_progress(p_lesson_id uuid, p_status text, p_progress_percent numeric(5,2))
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_student_id uuid := auth.uid();
    v_lesson public.lessons%ROWTYPE;
    v_enrollment public.enrollments%ROWTYPE;
    v_record_id uuid;
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
        RAISE EXCEPTION 'Only student profiles may update lesson progress';
    END IF;

    SELECT *
      INTO v_lesson
      FROM public.lessons l
     WHERE l.id = p_lesson_id;

    IF v_lesson.id IS NULL THEN
        RAISE EXCEPTION 'Lesson not found';
    END IF;

    SELECT *
      INTO v_enrollment
      FROM public.enrollments e
     WHERE e.student_id = v_student_id
       AND e.course_id = v_lesson.course_id
       AND e.enrollment_status IN ('active', 'completed');

    IF v_enrollment.student_id IS NULL THEN
        RAISE EXCEPTION 'Student is not enrolled in the lesson course';
    END IF;

    IF p_status NOT IN ('not_started', 'in_progress', 'completed') THEN
        RAISE EXCEPTION 'Invalid lesson status';
    END IF;

    IF p_progress_percent < 0 OR p_progress_percent > 100 THEN
        RAISE EXCEPTION 'Progress percent must be between 0 and 100';
    END IF;

    IF p_status = 'completed' AND p_progress_percent <> 100 THEN
        RAISE EXCEPTION 'Completed lessons must report 100%% progress';
    END IF;

    IF p_status <> 'completed' AND p_progress_percent >= 100 THEN
        RAISE EXCEPTION 'Only completed lessons may report 100%% progress';
    END IF;

    -- This stores learner-reported progress. Independent verification of completion
    -- must be implemented outside this RPC and is not implied by the client call.

    INSERT INTO public.lesson_progress (
        student_id,
        lesson_id,
        status,
        progress_percent,
        started_at,
        completed_at
    )
    VALUES (
        v_student_id,
        p_lesson_id,
        p_status,
        p_progress_percent,
        CASE WHEN p_status IN ('in_progress', 'completed') THEN COALESCE((SELECT lp.started_at FROM public.lesson_progress lp WHERE lp.student_id = v_student_id AND lp.lesson_id = p_lesson_id), now()) ELSE NULL END,
        CASE WHEN p_status = 'completed' THEN now() ELSE NULL END
    )
    ON CONFLICT (student_id, lesson_id) DO UPDATE
       SET status = EXCLUDED.status,
           progress_percent = EXCLUDED.progress_percent,
           started_at = COALESCE(public.lesson_progress.started_at, EXCLUDED.started_at),
           completed_at = CASE
               WHEN EXCLUDED.status = 'completed' THEN now()
               ELSE NULL
           END,
           updated_at = now()
    RETURNING id INTO v_record_id;

    RETURN v_record_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.recalculate_enrollment_progress(p_student_id uuid, p_course_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    total_lessons integer;
    completed_lessons integer;
    calculated_progress numeric(5,2);
BEGIN
    SELECT COUNT(*)
      INTO total_lessons
      FROM public.lessons l
     WHERE l.course_id = p_course_id;

    IF total_lessons = 0 THEN
        UPDATE public.enrollments
           SET progress_percent = 0,
               enrollment_status = 'active',
               updated_at = now()
         WHERE student_id = p_student_id
           AND course_id = p_course_id;
        RETURN;
    END IF;

    SELECT COUNT(*)
      INTO completed_lessons
      FROM public.lesson_progress lp
      JOIN public.lessons l ON l.id = lp.lesson_id
     WHERE lp.student_id = p_student_id
       AND l.course_id = p_course_id
       AND lp.status = 'completed';

    calculated_progress := ROUND((completed_lessons::numeric / total_lessons::numeric) * 100, 2);

    UPDATE public.enrollments
       SET progress_percent = calculated_progress,
           enrollment_status = CASE
               WHEN calculated_progress >= 100 THEN 'completed'
               ELSE 'active'
           END,
           completed_at = CASE
               WHEN calculated_progress >= 100 THEN COALESCE(completed_at, now())
               ELSE NULL
           END,
           updated_at = now()
     WHERE student_id = p_student_id
       AND course_id = p_course_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.recalculate_course_progress_on_lesson_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_old_course_id uuid;
    v_new_course_id uuid;
BEGIN
    IF TG_TABLE_NAME = 'lesson_progress' THEN
        IF TG_OP = 'INSERT' THEN
            SELECT l.course_id
              INTO v_new_course_id
              FROM public.lessons l
             WHERE l.id = NEW.lesson_id;

            IF v_new_course_id IS NOT NULL THEN
                PERFORM public.recalculate_enrollment_progress(NEW.student_id, v_new_course_id);
            END IF;
            RETURN NEW;
        ELSIF TG_OP = 'UPDATE' THEN
            IF OLD.lesson_id IS DISTINCT FROM NEW.lesson_id OR OLD.student_id IS DISTINCT FROM NEW.student_id THEN
                SELECT l.course_id
                  INTO v_old_course_id
                  FROM public.lessons l
                 WHERE l.id = OLD.lesson_id;

                IF v_old_course_id IS NOT NULL THEN
                    PERFORM public.recalculate_enrollment_progress(OLD.student_id, v_old_course_id);
                END IF;

                SELECT l.course_id
                  INTO v_new_course_id
                  FROM public.lessons l
                 WHERE l.id = NEW.lesson_id;

                IF v_new_course_id IS NOT NULL THEN
                    PERFORM public.recalculate_enrollment_progress(NEW.student_id, v_new_course_id);
                END IF;
            END IF;

            IF OLD.status IS DISTINCT FROM NEW.status OR OLD.progress_percent IS DISTINCT FROM NEW.progress_percent THEN
                SELECT l.course_id
                  INTO v_new_course_id
                  FROM public.lessons l
                 WHERE l.id = NEW.lesson_id;

                IF v_new_course_id IS NOT NULL THEN
                    PERFORM public.recalculate_enrollment_progress(NEW.student_id, v_new_course_id);
                END IF;
            END IF;

            RETURN NEW;
        ELSIF TG_OP = 'DELETE' THEN
            SELECT l.course_id
              INTO v_old_course_id
              FROM public.lessons l
             WHERE l.id = OLD.lesson_id;

            IF v_old_course_id IS NOT NULL THEN
                PERFORM public.recalculate_enrollment_progress(OLD.student_id, v_old_course_id);
            END IF;
            RETURN OLD;
        END IF;
    ELSIF TG_TABLE_NAME = 'lessons' THEN
        IF TG_OP = 'INSERT' THEN
            PERFORM public.recalculate_enrollment_progress(e.student_id, e.course_id)
            FROM public.enrollments e
            WHERE e.course_id = NEW.course_id;
            RETURN NEW;
        ELSIF TG_OP = 'UPDATE' THEN
            IF OLD.course_id IS DISTINCT FROM NEW.course_id THEN
                PERFORM public.recalculate_enrollment_progress(e.student_id, e.course_id)
                FROM public.enrollments e
                WHERE e.course_id = OLD.course_id;

                PERFORM public.recalculate_enrollment_progress(e.student_id, e.course_id)
                FROM public.enrollments e
                WHERE e.course_id = NEW.course_id;
            ELSE
                PERFORM public.recalculate_enrollment_progress(e.student_id, e.course_id)
                FROM public.enrollments e
                WHERE e.course_id = NEW.course_id;
            END IF;
            RETURN NEW;
        ELSIF TG_OP = 'DELETE' THEN
            PERFORM public.recalculate_enrollment_progress(e.student_id, e.course_id)
            FROM public.enrollments e
            WHERE e.course_id = OLD.course_id;
            RETURN OLD;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_enrollments_set_updated_at
BEFORE UPDATE ON public.enrollments
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_lesson_progress_set_updated_at
BEFORE UPDATE ON public.lesson_progress
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_lesson_progress_recalc
AFTER INSERT OR UPDATE OF student_id, lesson_id, status, progress_percent OR DELETE ON public.lesson_progress
FOR EACH ROW
EXECUTE FUNCTION public.recalculate_course_progress_on_lesson_change();

CREATE TRIGGER trg_lessons_recalc_progress
AFTER INSERT OR UPDATE OF course_id OR DELETE ON public.lessons
FOR EACH ROW
EXECUTE FUNCTION public.recalculate_course_progress_on_lesson_change();

CREATE INDEX IF NOT EXISTS idx_enrollments_student_course
    ON public.enrollments (student_id, course_id);

CREATE INDEX IF NOT EXISTS idx_enrollments_course_id
    ON public.enrollments (course_id);

CREATE INDEX IF NOT EXISTS idx_enrollments_student_status
    ON public.enrollments (student_id, enrollment_status);

CREATE INDEX IF NOT EXISTS idx_lesson_progress_student_lesson
    ON public.lesson_progress (student_id, lesson_id);

CREATE INDEX IF NOT EXISTS idx_lesson_progress_lesson_id
    ON public.lesson_progress (lesson_id);

CREATE INDEX IF NOT EXISTS idx_lesson_progress_status
    ON public.lesson_progress (status);

REVOKE ALL ON TABLE public.enrollments FROM PUBLIC;
REVOKE ALL ON TABLE public.lesson_progress FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_enrollment_for_student(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.record_lesson_progress(uuid, text, numeric) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.recalculate_enrollment_progress(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.recalculate_course_progress_on_lesson_change() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC;

GRANT SELECT ON TABLE public.enrollments TO authenticated;
GRANT SELECT ON TABLE public.lesson_progress TO authenticated;
REVOKE INSERT, UPDATE ON TABLE public.enrollments FROM authenticated;
REVOKE INSERT, UPDATE ON TABLE public.lesson_progress FROM authenticated;
REVOKE UPDATE (student_id, course_id, enrollment_status, progress_percent, enrolled_at, completed_at) ON TABLE public.enrollments FROM authenticated;
REVOKE UPDATE (student_id, lesson_id, status, progress_percent, started_at, completed_at) ON TABLE public.lesson_progress FROM authenticated;
REVOKE DELETE ON TABLE public.enrollments FROM authenticated;
REVOKE DELETE ON TABLE public.lesson_progress FROM authenticated;

GRANT EXECUTE ON FUNCTION public.create_enrollment_for_student(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_lesson_progress(uuid, text, numeric) TO authenticated;
