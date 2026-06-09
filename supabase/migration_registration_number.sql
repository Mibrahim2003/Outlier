-- Add registration_number column to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS registration_number text DEFAULT '';
