-- supabase/migrations/20260613100000_add_sound_enabled_to_profile.sql
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS sound_enabled boolean DEFAULT true;
