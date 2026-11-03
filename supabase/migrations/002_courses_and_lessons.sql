-- 002_courses_and_lessons.sql

CREATE TABLE IF NOT EXISTS public.courses (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    instructor_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE RESTRICT,
    title text NOT NULL,
    slug text NOT NULL UNIQUE,
    description text,
    short_description text,
    thumbnail_url text,
    category text,
    level text NOT NULL DEFAULT 'beginner' CHECK (level IN ('beginner', 'intermediate', 'advanced')),
    status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    price numeric(10,2) NOT NULL DEFAULT 0,
    is_published boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.lessons (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id uuid NOT NULL REFERENCES public.courses (id) ON DELETE CASCADE,
    title text NOT NULL,
    slug text NOT NULL,
    description text,
    content text,
    video_url text,
    lesson_material_url text,
    duration_minutes integer NOT NULL DEFAULT 0 CHECK (duration_minutes >= 0),
    order_index integer NOT NULL DEFAULT 1,
    is_published boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (course_id, slug),
    UNIQUE (course_id, order_index)
);

CREATE TRIGGER trg_courses_set_updated_at
BEFORE UPDATE ON public.courses
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_lessons_set_updated_at
BEFORE UPDATE ON public.lessons
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_courses_instructor_status
    ON public.courses (instructor_id, status);

CREATE INDEX IF NOT EXISTS idx_courses_slug
    ON public.courses (slug);

CREATE INDEX IF NOT EXISTS idx_courses_status_published
    ON public.courses (status, is_published);

CREATE INDEX IF NOT EXISTS idx_lessons_course_order
    ON public.lessons (course_id, order_index);

CREATE INDEX IF NOT EXISTS idx_lessons_course_slug
    ON public.lessons (course_id, slug);

REVOKE ALL ON TABLE public.courses FROM PUBLIC;
REVOKE ALL ON TABLE public.lessons FROM PUBLIC;

GRANT SELECT ON TABLE public.courses TO authenticated;
GRANT SELECT ON TABLE public.lessons TO authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE public.courses TO authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE public.lessons TO authenticated;

-- RLS will further restrict these privileges.
