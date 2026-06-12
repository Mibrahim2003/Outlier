-- supabase/migrations/20260612000000_add_ai_engine_to_profile.sql
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ai_persona text DEFAULT 'tactical';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS auto_generate_insights boolean DEFAULT false;
