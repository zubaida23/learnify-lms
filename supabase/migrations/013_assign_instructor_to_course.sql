
-- Remove the old function signature so it cannot remain as an overload.
DROP FUNCTION IF EXISTS public.create_course_for_admin(
    text, text, text, text, text, text, numeric
);

CREATE OR REPLACE FUNCTION public.create_course_for_admin(
    p_title text,
    p_description text,
    p_instructor_id uuid,
    p_short_description text DEFAULT NULL,
    p_status text DEFAULT 'draft',
    p_level text DEFAULT 'beginner',
    p_category text DEFAULT 'General',
    p_price numeric(10,2) DEFAULT 0
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id uuid := auth.uid();
    v_slug text;
    v_course_id uuid;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Admin access is required to create courses';
    END IF;

    IF p_title IS NULL OR btrim(p_title) = '' THEN
        RAISE EXCEPTION 'Course title is required';
    END IF;

    IF p_description IS NULL OR btrim(p_description) = '' THEN
        RAISE EXCEPTION 'Course description is required';
    END IF;

    IF p_instructor_id IS NULL OR NOT EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE id = p_instructor_id
          AND role = 'instructor'
          AND status = 'active'
    ) THEN
        RAISE EXCEPTION 'Please select an active instructor';
    END IF;

    IF p_status NOT IN ('draft', 'published', 'archived') THEN
        RAISE EXCEPTION 'Invalid course status';
    END IF;

    IF p_level NOT IN ('beginner', 'intermediate', 'advanced') THEN
        RAISE EXCEPTION 'Invalid course level';
    END IF;

    v_slug := lower(regexp_replace(trim(p_title), '[^a-z0-9]+', '-', 'g'));
    v_slug := trim(both '-' from v_slug);

    IF v_slug = '' THEN
        v_slug := 'course';
    END IF;

    v_slug := v_slug || '-' || replace(gen_random_uuid()::text, '-', '');

    INSERT INTO public.courses (
        instructor_id,
        title,
        slug,
        description,
        short_description,
        category,
        level,
        status,
        price,
        is_published
    )
    VALUES (
        p_instructor_id,
        trim(p_title),
        v_slug,
        p_description,
        p_short_description,
        p_category,
        p_level,
        p_status,
        p_price,
        p_status = 'published'
    )
    RETURNING id INTO v_course_id;

    RETURN v_course_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_course_for_admin(
    text, text, uuid, text, text, text, text, numeric
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.create_course_for_admin(
    text, text, uuid, text, text, text, text, numeric
) TO authenticated;
