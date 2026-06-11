-- Add grading_scale column to user_profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS grading_scale JSONB;
