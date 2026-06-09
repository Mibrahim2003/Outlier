-- Migration: Create todos table for the Pending Tasks system
-- Run this in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS todos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  due_date DATE NOT NULL,
  course TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Enable Row Level Security
ALTER TABLE todos ENABLE ROW LEVEL SECURITY;

-- Policy: users can only manage their own todos
CREATE POLICY "Users can manage their own todos"
  ON todos FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create a unique constraint for upsert conflict target
ALTER TABLE todos ADD CONSTRAINT todos_user_id_id_unique UNIQUE (user_id, id);
