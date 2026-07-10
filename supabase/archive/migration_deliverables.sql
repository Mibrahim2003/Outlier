-- ============================================================
-- Outlier Dashboard — Course Deliverables Schema Migration
-- Run this in the Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS public.course_deliverables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id TEXT NOT NULL,
  type TEXT NOT NULL, -- 'quiz', 'assignment', 'midterm', 'final', 'project'
  title TEXT NOT NULL,
  date TEXT,
  score TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.course_deliverables ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own course deliverables"
  ON public.course_deliverables FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own course deliverables"
  ON public.course_deliverables FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own course deliverables"
  ON public.course_deliverables FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own course deliverables"
  ON public.course_deliverables FOR DELETE
  USING (auth.uid() = user_id);

-- Create a unique constraint to avoid duplicate upserts if we ever use them
ALTER TABLE public.course_deliverables ADD CONSTRAINT course_deliverables_user_id_id_unique UNIQUE (user_id, id);
