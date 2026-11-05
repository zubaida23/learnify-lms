
import { createClient } from "@supabase/supabase-js";

export type ProfileRole = "admin" | "instructor" | "student";

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          avatar_url: string | null;
          role: ProfileRole;
          status: string;
          bio: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          email?: string;
          full_name?: string;
          avatar_url?: string | null;
          role?: ProfileRole;
          status?: string;
          bio?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string;
          avatar_url?: string | null;
          role?: ProfileRole;
          status?: string;
          bio?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      courses: {
        Row: {
          id: string;
          instructor_id: string;
          title: string;
          slug: string;
          description: string | null;
          short_description: string | null;
          thumbnail_url: string | null;
          category: string | null;
          level: string;
          status: string;
          price: number;
          is_published: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          instructor_id?: string;
          title?: string;
          slug?: string;
          description?: string | null;
          short_description?: string | null;
          thumbnail_url?: string | null;
          category?: string | null;
          level?: string;
          status?: string;
          price?: number;
          is_published?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          instructor_id?: string;
          title?: string;
          slug?: string;
          description?: string | null;
          short_description?: string | null;
          thumbnail_url?: string | null;
          category?: string | null;
          level?: string;
          status?: string;
          price?: number;
          is_published?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      assignments: {
        Row: {
          id: string;
          course_id: string;
          title: string;
          description: string | null;
          instructions: string | null;
          due_date: string | null;
          max_score: number;
          is_published: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          course_id?: string;
          title?: string;
          description?: string | null;
          instructions?: string | null;
          due_date?: string | null;
          max_score?: number;
          is_published?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          course_id?: string;
          title?: string;
          description?: string | null;
          instructions?: string | null;
          due_date?: string | null;
          max_score?: number;
          is_published?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      assignment_submissions: {
        Row: {
          id: string;
          assignment_id: string;
          student_id: string;
          file_url: string | null;
          submission_text: string | null;
          feedback_text: string | null;
          grade: number | null;
          status: string;
          submitted_at: string | null;
          reviewed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          assignment_id?: string;
          student_id?: string;
          file_url?: string | null;
          submission_text?: string | null;
          feedback_text?: string | null;
          grade?: number | null;
          status?: string;
          submitted_at?: string | null;
          reviewed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          assignment_id?: string;
          student_id?: string;
          file_url?: string | null;
          submission_text?: string | null;
          feedback_text?: string | null;
          grade?: number | null;
          status?: string;
          submitted_at?: string | null;
          reviewed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      enrollments: {
        Row: {
          id: string;
          student_id: string;
          course_id: string;
          enrollment_status: string;
          progress_percent: number;
          enrolled_at: string;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          student_id?: string;
          course_id?: string;
          enrollment_status?: string;
          progress_percent?: number;
          enrolled_at?: string;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          student_id?: string;
          course_id?: string;
          enrollment_status?: string;
          progress_percent?: number;
          enrolled_at?: string;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      quizzes: {
        Row: {
          id: string;
          course_id: string | null;
          lesson_id: string | null;
          title: string;
          description: string | null;
          instructions: string | null;
          passing_score: number;
          time_limit_minutes: number | null;
          attempts_allowed: number;
          is_published: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          course_id?: string | null;
          lesson_id?: string | null;
          title: string;
          description?: string | null;
          instructions?: string | null;
          passing_score?: number;
          time_limit_minutes?: number | null;
          attempts_allowed?: number;
          is_published?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          course_id?: string | null;
          lesson_id?: string | null;
          title?: string;
          description?: string | null;
          instructions?: string | null;
          passing_score?: number;
          time_limit_minutes?: number | null;
          attempts_allowed?: number;
          is_published?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      quiz_questions: {
        Row: {
          id: string;
          quiz_id: string;
          question_text: string;
          question_type: string;
          options: Json | null;
          points: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          quiz_id: string;
          question_text: string;
          question_type: string;
          options?: Json | null;
          points?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          quiz_id?: string;
          question_text?: string;
          question_type?: string;
          options?: Json | null;
          points?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };

    Views: Record<string, never>;


Functions: {
  submit_quiz_attempt: {
    Args: {
      p_quiz_id: string;
      p_answers: Json;
    };
    Returns: Json;
  };

  create_enrollment_for_student: {
    Args: {
      p_course_id: string;
    };
    Returns: Json;
  };

  record_lesson_progress: {
    Args: {
      p_lesson_id: string;
      p_status: string;
      p_progress_percent: number;
    };
    Returns: Json;
  };
};


    Enums: Record<string, never>;
  };
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl) {
  throw new Error(
    "Missing environment variable: NEXT_PUBLIC_SUPABASE_URL. Add it to your .env.local file."
  );
}

if (!supabaseKey) {
  throw new Error(
    "Missing environment variable: NEXT_PUBLIC_SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY. Add it to your .env.local file."
  );
}

export const supabase = createClient<Database>(
  supabaseUrl,
  supabaseKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);
