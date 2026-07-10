-- Add theme_color column to courses table
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS theme_color text DEFAULT 'yellow';
