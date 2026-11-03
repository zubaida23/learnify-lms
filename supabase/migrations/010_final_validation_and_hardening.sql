-- 010_final_validation_and_hardening.sql

-- Final validation and security hardening for the Learnify LMS schema.
-- This file contains final privilege cleanup and consistency checks.

REVOKE ALL ON TABLE public.profiles FROM PUBLIC;
REVOKE ALL ON TABLE public.courses FROM PUBLIC;
REVOKE ALL ON TABLE public.lessons FROM PUBLIC;
REVOKE ALL ON TABLE public.enrollments FROM PUBLIC;
REVOKE ALL ON TABLE public.lesson_progress FROM PUBLIC;
REVOKE ALL ON TABLE public.quizzes FROM PUBLIC;
REVOKE ALL ON TABLE public.quiz_questions FROM PUBLIC;
REVOKE ALL ON TABLE public.quiz_answer_keys FROM PUBLIC;
REVOKE ALL ON TABLE public.quiz_attempts FROM PUBLIC;
REVOKE ALL ON TABLE public.quiz_responses FROM PUBLIC;
REVOKE ALL ON TABLE public.assignments FROM PUBLIC;
REVOKE ALL ON TABLE public.assignment_submissions FROM PUBLIC;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_instructor() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_student() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_authenticated() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_profile_owner(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_course_instructor(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_enrolled_in_course(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_assignment_instructor_owned(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_quiz_instructor_owned(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.has_course_access(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_submit_quiz_attempt(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_grade_submission(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_enroll_in_course(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_mark_lesson_complete(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_enrollment_for_student(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.record_lesson_progress(uuid, text, numeric) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_quiz_attempt(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.submit_quiz_response(uuid, uuid, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.submit_quiz_attempt(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.grade_quiz_attempt(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.submit_assignment(uuid, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.grade_assignment_submission(uuid, numeric) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.upsert_quiz_answer_key(uuid, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.delete_quiz_answer_key(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.recalculate_enrollment_progress(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.recalculate_course_progress_on_lesson_change() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC;

-- Authentication role access is intentionally minimal and restricted by RLS.
-- Direct DML on protected LMS lifecycle tables remains revoked unless performed through approved RPCs.

GRANT SELECT ON TABLE public.profiles TO authenticated;
GRANT UPDATE (full_name, avatar_url, bio) ON TABLE public.profiles TO authenticated;
REVOKE UPDATE (status) ON TABLE public.profiles FROM authenticated;
REVOKE UPDATE (role) ON TABLE public.profiles FROM authenticated;
REVOKE INSERT ON TABLE public.profiles FROM authenticated;
REVOKE DELETE ON TABLE public.profiles FROM authenticated;

GRANT SELECT ON TABLE public.courses TO authenticated;
GRANT SELECT ON TABLE public.lessons TO authenticated;
GRANT SELECT ON TABLE public.enrollments TO authenticated;
GRANT SELECT ON TABLE public.lesson_progress TO authenticated;
GRANT SELECT ON TABLE public.quizzes TO authenticated;
GRANT SELECT ON TABLE public.quiz_questions TO authenticated;
GRANT SELECT ON TABLE public.quiz_attempts TO authenticated;
GRANT SELECT ON TABLE public.quiz_responses TO authenticated;
GRANT SELECT ON TABLE public.assignments TO authenticated;
GRANT SELECT ON TABLE public.assignment_submissions TO authenticated;

REVOKE INSERT, UPDATE, DELETE ON TABLE public.courses FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.courses FROM anon;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.lessons FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.lessons FROM anon;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.enrollments FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.enrollments FROM anon;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.lesson_progress FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.lesson_progress FROM anon;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.quizzes FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.quizzes FROM anon;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.quiz_questions FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.quiz_questions FROM anon;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.assignments FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.assignments FROM anon;

REVOKE UPDATE (score, total_points, percentage, passed, status) ON TABLE public.quiz_attempts FROM authenticated;
REVOKE UPDATE (is_correct) ON TABLE public.quiz_responses FROM authenticated;
REVOKE UPDATE (grade, reviewed_at, status) ON TABLE public.assignment_submissions FROM authenticated;

REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLE public.quiz_answer_keys FROM authenticated;
REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLE public.quiz_answer_keys FROM anon;

REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_instructor() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_student() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_authenticated() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_profile_owner(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_course_instructor(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_enrolled_in_course(uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_assignment_instructor_owned(uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_quiz_instructor_owned(uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_course_access(uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.can_submit_quiz_attempt(uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.can_grade_submission(uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.can_enroll_in_course(uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.can_mark_lesson_complete(uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.create_enrollment_for_student(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.record_lesson_progress(uuid, text, numeric) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.create_quiz_attempt(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.submit_quiz_response(uuid, uuid, jsonb) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.submit_quiz_attempt(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.grade_quiz_attempt(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.submit_assignment(uuid, text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.grade_assignment_submission(uuid, numeric) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.upsert_quiz_answer_key(uuid, jsonb) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.delete_quiz_answer_key(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.recalculate_enrollment_progress(uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.recalculate_course_progress_on_lesson_change() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.create_enrollment_for_student(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_lesson_progress(uuid, text, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_quiz_attempt(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_quiz_response(uuid, uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_quiz_attempt(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.grade_quiz_attempt(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_assignment(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.grade_assignment_submission(uuid, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_quiz_answer_key(uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_quiz_answer_key(uuid) TO authenticated;

-- The application should use only the approved RPCs for enrollment, lesson completion,
-- quiz response submission, grading, and answer-key management. Direct table writes
-- remain revoked to keep server-side authorization checks authoritative.

-- Final validation comment:
-- 1. Only frontend-facing secure RPCs are granted to authenticated users.
-- 2. Internal helper functions remain inaccessible as direct RPCs.
-- 3. Quiz answer keys remain private and inaccessible through direct authenticated table access.
-- 4. Role and status fields remain protected from ordinary users.
-- 5. Direct DML on LMS lifecycle tables remains revoked for authenticated users.
