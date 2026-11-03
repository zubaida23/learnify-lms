-- 007_rls_policies.sql

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_answer_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignment_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY profiles_select_own_or_admin
ON public.profiles
FOR SELECT
USING (
    auth.uid() = id
    OR public.is_admin()
);

CREATE POLICY profiles_update_own_non_role_or_admin
ON public.profiles
FOR UPDATE
USING (
    auth.uid() = id
    OR public.is_admin()
)
WITH CHECK (
    auth.uid() = id
    OR public.is_admin()
);

CREATE POLICY profiles_insert_trigger_only
ON public.profiles
FOR INSERT
WITH CHECK (false);

CREATE POLICY profiles_delete_admin_only
ON public.profiles
FOR DELETE
USING (public.is_admin());

CREATE POLICY courses_select_access
ON public.courses
FOR SELECT
USING (
    public.is_admin()
    OR instructor_id = auth.uid()
    OR (
        status = 'published'
        AND is_published = true
    )
);

CREATE POLICY courses_manage_own_or_admin
ON public.courses
FOR INSERT
WITH CHECK (
    public.is_admin()
    OR (
        public.is_instructor()
        AND instructor_id = auth.uid()
    )
);

CREATE POLICY courses_update_own_or_admin
ON public.courses
FOR UPDATE
USING (
    public.is_admin() OR instructor_id = auth.uid()
)
WITH CHECK (
    public.is_admin() OR instructor_id = auth.uid()
);

CREATE POLICY courses_delete_admin_only
ON public.courses
FOR DELETE
USING (public.is_admin());

CREATE POLICY lessons_select_access
ON public.lessons
FOR SELECT
USING (
    public.is_admin()
    OR EXISTS (
        SELECT 1
        FROM public.courses c
        WHERE c.id = course_id
          AND c.instructor_id = auth.uid()
    )
    OR EXISTS (
        SELECT 1
        FROM public.enrollments e
        WHERE e.course_id = course_id
          AND e.student_id = auth.uid()
          AND e.enrollment_status IN ('active', 'completed')
    )
);

CREATE POLICY lessons_manage_own_or_admin
ON public.lessons
FOR INSERT
WITH CHECK (
    public.is_admin()
    OR EXISTS (
        SELECT 1
        FROM public.courses c
        WHERE c.id = course_id
          AND c.instructor_id = auth.uid()
    )
);

CREATE POLICY lessons_update_own_or_admin
ON public.lessons
FOR UPDATE
USING (
    public.is_admin()
    OR EXISTS (
        SELECT 1
        FROM public.courses c
        WHERE c.id = course_id
          AND c.instructor_id = auth.uid()
    )
)
WITH CHECK (
    public.is_admin()
    OR EXISTS (
        SELECT 1
        FROM public.courses c
        WHERE c.id = course_id
          AND c.instructor_id = auth.uid()
    )
);

CREATE POLICY lessons_delete_admin_only
ON public.lessons
FOR DELETE
USING (public.is_admin());

CREATE POLICY enrollments_select_access
ON public.enrollments
FOR SELECT
USING (
    public.is_admin()
    OR student_id = auth.uid()
    OR EXISTS (
        SELECT 1
        FROM public.courses c
        WHERE c.id = course_id
          AND c.instructor_id = auth.uid()
    )
);

CREATE POLICY enrollments_insert_access
ON public.enrollments
FOR INSERT
WITH CHECK (false);

CREATE POLICY enrollments_update_access
ON public.enrollments
FOR UPDATE
USING (false)
WITH CHECK (false);

CREATE POLICY lesson_progress_select_access
ON public.lesson_progress
FOR SELECT
USING (
    public.is_admin()
    OR student_id = auth.uid()
    OR EXISTS (
        SELECT 1
        FROM public.lessons l
        JOIN public.courses c ON c.id = l.course_id
        WHERE l.id = lesson_id
          AND c.instructor_id = auth.uid()
    )
);

CREATE POLICY lesson_progress_insert_update_own
ON public.lesson_progress
FOR INSERT
WITH CHECK (false);

CREATE POLICY lesson_progress_update_own
ON public.lesson_progress
FOR UPDATE
USING (false)
WITH CHECK (false);

CREATE POLICY lesson_progress_delete_admin_only
ON public.lesson_progress
FOR DELETE
USING (public.is_admin());

CREATE POLICY quizzes_select_access
ON public.quizzes
FOR SELECT
USING (
    public.is_admin()
    OR EXISTS (
        SELECT 1
        FROM public.courses c
        WHERE c.id = COALESCE(course_id, (
            SELECT l.course_id
            FROM public.lessons l
            WHERE l.id = lesson_id
        ))
          AND c.instructor_id = auth.uid()
    )
    OR (
        is_published = true
        AND EXISTS (
            SELECT 1
            FROM public.enrollments e
            WHERE e.course_id = COALESCE(course_id, (
                SELECT l.course_id
                FROM public.lessons l
                WHERE l.id = lesson_id
            ))
              AND e.student_id = auth.uid()
              AND e.enrollment_status IN ('active', 'completed')
        )
    )
);

CREATE POLICY quizzes_manage_owner_or_admin
ON public.quizzes
FOR INSERT
WITH CHECK (
    public.is_admin()
    OR EXISTS (
        SELECT 1
        FROM public.courses c
        WHERE c.id = COALESCE(course_id, (
            SELECT l.course_id
            FROM public.lessons l
            WHERE l.id = lesson_id
        ))
          AND c.instructor_id = auth.uid()
    )
);

CREATE POLICY quizzes_update_owner_or_admin
ON public.quizzes
FOR UPDATE
USING (
    public.is_admin()
    OR EXISTS (
        SELECT 1
        FROM public.courses c
        WHERE c.id = COALESCE(course_id, (
            SELECT l.course_id
            FROM public.lessons l
            WHERE l.id = lesson_id
        ))
          AND c.instructor_id = auth.uid()
    )
)
WITH CHECK (
    public.is_admin()
    OR EXISTS (
        SELECT 1
        FROM public.courses c
        WHERE c.id = COALESCE(course_id, (
            SELECT l.course_id
            FROM public.lessons l
            WHERE l.id = lesson_id
        ))
          AND c.instructor_id = auth.uid()
    )
);

CREATE POLICY quizzes_delete_admin_only
ON public.quizzes
FOR DELETE
USING (public.is_admin());

CREATE POLICY quiz_questions_select_access
ON public.quiz_questions
FOR SELECT
USING (
    public.is_admin()
    OR EXISTS (
        SELECT 1
        FROM public.quizzes q
        LEFT JOIN public.lessons l ON l.id = q.lesson_id
        JOIN public.courses c ON c.id = COALESCE(q.course_id, l.course_id)
        WHERE q.id = quiz_id
          AND c.instructor_id = auth.uid()
    )
    OR EXISTS (
        SELECT 1
        FROM public.quizzes q
        LEFT JOIN public.lessons l ON l.id = q.lesson_id
        JOIN public.enrollments e ON e.course_id = COALESCE(q.course_id, l.course_id)
        WHERE q.id = quiz_id
          AND q.is_published = true
          AND e.student_id = auth.uid()
          AND e.enrollment_status IN ('active', 'completed')
    )
);

CREATE POLICY quiz_questions_manage_owner_or_admin
ON public.quiz_questions
FOR INSERT
WITH CHECK (
    public.is_admin()
    OR EXISTS (
        SELECT 1
        FROM public.quizzes q
        LEFT JOIN public.lessons l ON l.id = q.lesson_id
        JOIN public.courses c ON c.id = COALESCE(q.course_id, l.course_id)
        WHERE q.id = quiz_id
          AND c.instructor_id = auth.uid()
    )
);

CREATE POLICY quiz_questions_update_owner_or_admin
ON public.quiz_questions
FOR UPDATE
USING (
    public.is_admin()
    OR EXISTS (
        SELECT 1
        FROM public.quizzes q
        LEFT JOIN public.lessons l ON l.id = q.lesson_id
        JOIN public.courses c ON c.id = COALESCE(q.course_id, l.course_id)
        WHERE q.id = quiz_id
          AND c.instructor_id = auth.uid()
    )
)
WITH CHECK (
    public.is_admin()
    OR EXISTS (
        SELECT 1
        FROM public.quizzes q
        LEFT JOIN public.lessons l ON l.id = q.lesson_id
        JOIN public.courses c ON c.id = COALESCE(q.course_id, l.course_id)
        WHERE q.id = quiz_id
          AND c.instructor_id = auth.uid()
    )
);

CREATE POLICY quiz_questions_delete_admin_only
ON public.quiz_questions
FOR DELETE
USING (public.is_admin());

CREATE POLICY quiz_answer_keys_admin_or_instructor_owned
ON public.quiz_answer_keys
FOR SELECT
USING (
    public.is_admin()
    OR EXISTS (
        SELECT 1
        FROM public.quiz_questions qq
        JOIN public.quizzes q ON q.id = qq.quiz_id
        LEFT JOIN public.lessons l ON l.id = q.lesson_id
        JOIN public.courses c ON c.id = COALESCE(q.course_id, l.course_id)
        WHERE qq.id = question_id
          AND c.instructor_id = auth.uid()
    )
);

CREATE POLICY quiz_answer_keys_insert_manage_owned
ON public.quiz_answer_keys
FOR INSERT
WITH CHECK (
    public.is_admin()
    OR EXISTS (
        SELECT 1
        FROM public.quiz_questions qq
        JOIN public.quizzes q ON q.id = qq.quiz_id
        LEFT JOIN public.lessons l ON l.id = q.lesson_id
        JOIN public.courses c ON c.id = COALESCE(q.course_id, l.course_id)
        WHERE qq.id = question_id
          AND c.instructor_id = auth.uid()
    )
);

CREATE POLICY quiz_answer_keys_update_manage_owned
ON public.quiz_answer_keys
FOR UPDATE
USING (
    public.is_admin()
    OR EXISTS (
        SELECT 1
        FROM public.quiz_questions qq
        JOIN public.quizzes q ON q.id = qq.quiz_id
        LEFT JOIN public.lessons l ON l.id = q.lesson_id
        JOIN public.courses c ON c.id = COALESCE(q.course_id, l.course_id)
        WHERE qq.id = question_id
          AND c.instructor_id = auth.uid()
    )
)
WITH CHECK (
    public.is_admin()
    OR EXISTS (
        SELECT 1
        FROM public.quiz_questions qq
        JOIN public.quizzes q ON q.id = qq.quiz_id
        LEFT JOIN public.lessons l ON l.id = q.lesson_id
        JOIN public.courses c ON c.id = COALESCE(q.course_id, l.course_id)
        WHERE qq.id = question_id
          AND c.instructor_id = auth.uid()
    )
);

CREATE POLICY quiz_answer_keys_delete_admin_only
ON public.quiz_answer_keys
FOR DELETE
USING (public.is_admin());

CREATE POLICY quiz_attempts_select_access
ON public.quiz_attempts
FOR SELECT
USING (
    public.is_admin()
    OR student_id = auth.uid()
    OR EXISTS (
        SELECT 1
        FROM public.quizzes q
        LEFT JOIN public.lessons l ON l.id = q.lesson_id
        JOIN public.courses c ON c.id = COALESCE(q.course_id, l.course_id)
        WHERE q.id = quiz_id
          AND c.instructor_id = auth.uid()
    )
);

CREATE POLICY quiz_attempts_insert_own
ON public.quiz_attempts
FOR INSERT
WITH CHECK (false);

CREATE POLICY quiz_attempts_update_admin_or_instructor_for_grading
ON public.quiz_attempts
FOR UPDATE
USING (false)
WITH CHECK (false);

CREATE POLICY quiz_responses_select_own_or_course_owner
ON public.quiz_responses
FOR SELECT
USING (
    public.is_admin()
    OR student_id = auth.uid()
    OR EXISTS (
        SELECT 1
        FROM public.quiz_attempts qa
        JOIN public.quizzes q ON q.id = qa.quiz_id
        LEFT JOIN public.lessons l ON l.id = q.lesson_id
        JOIN public.courses c ON c.id = COALESCE(q.course_id, l.course_id)
        WHERE qa.id = attempt_id
          AND c.instructor_id = auth.uid()
    )
);

CREATE POLICY quiz_responses_insert_own
ON public.quiz_responses
FOR INSERT
WITH CHECK (false);

CREATE POLICY quiz_responses_update_own_or_admin
ON public.quiz_responses
FOR UPDATE
USING (false)
WITH CHECK (false);

CREATE POLICY assignment_select_access
ON public.assignments
FOR SELECT
USING (
    public.is_admin()
    OR EXISTS (
        SELECT 1
        FROM public.courses c
        WHERE c.id = course_id
          AND c.instructor_id = auth.uid()
    )
    OR (
        is_published = true
        AND EXISTS (
            SELECT 1
            FROM public.enrollments e
            WHERE e.course_id = course_id
              AND e.student_id = auth.uid()
              AND e.enrollment_status IN ('active', 'completed')
        )
    )
);

CREATE POLICY assignments_manage_own_or_admin
ON public.assignments
FOR INSERT
WITH CHECK (
    public.is_admin()
    OR EXISTS (
        SELECT 1
        FROM public.courses c
        WHERE c.id = course_id
          AND c.instructor_id = auth.uid()
    )
);

CREATE POLICY assignments_update_own_or_admin
ON public.assignments
FOR UPDATE
USING (
    public.is_admin()
    OR EXISTS (
        SELECT 1
        FROM public.courses c
        WHERE c.id = course_id
          AND c.instructor_id = auth.uid()
    )
)
WITH CHECK (
    public.is_admin()
    OR EXISTS (
        SELECT 1
        FROM public.courses c
        WHERE c.id = course_id
          AND c.instructor_id = auth.uid()
    )
);

CREATE POLICY assignments_delete_admin_only
ON public.assignments
FOR DELETE
USING (public.is_admin());

CREATE POLICY assignment_submissions_select_access
ON public.assignment_submissions
FOR SELECT
USING (
    public.is_admin()
    OR student_id = auth.uid()
    OR EXISTS (
        SELECT 1
        FROM public.assignments a
        JOIN public.courses c ON c.id = a.course_id
        WHERE a.id = assignment_id
          AND c.instructor_id = auth.uid()
    )
);

CREATE POLICY assignment_submissions_insert_own
ON public.assignment_submissions
FOR INSERT
WITH CHECK (false);

CREATE POLICY assignment_submissions_update_own
ON public.assignment_submissions
FOR UPDATE
USING (false)
WITH CHECK (false);

CREATE POLICY assignment_submissions_grade_by_instructor_or_admin
ON public.assignment_submissions
FOR UPDATE
USING (false)
WITH CHECK (false);

CREATE POLICY assignment_submissions_delete_admin_only
ON public.assignment_submissions
FOR DELETE
USING (public.is_admin());
