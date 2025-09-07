/*
  # Create personalities table

  1. Extensions
    - Enable pgcrypto for UUID generation

  2. New Tables
    - `personalities`
      - `id` (uuid, primary key)
      - `name` (text)
      - `description` (text)
      - `has_memory` (boolean, default true)
      - `created_at` (timestamp)

  3. Security
    - Note: No RLS policies included initially
    - Consider enabling RLS if exposing via Data API
*/

-- Create extension for UUID generation if not present
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Create the `personalities` table if it does not exist
CREATE TABLE IF NOT EXISTS public.personalities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text,
  prompt text NOT NULL,
  is_active boolean DEFAULT true,
  has_memory boolean DEFAULT true,
  files jsonb DEFAULT '[]'::jsonb,
  file_instruction text,
  openai_assistant_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Create trigger for updated_at
CREATE TRIGGER update_personalities_updated_at
  BEFORE UPDATE ON public.personalities
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Enable RLS
ALTER TABLE public.personalities ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS policies
CREATE POLICY "Users can view their own personalities"
  ON public.personalities FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own personalities"
  ON public.personalities FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own personalities"
  ON public.personalities FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own personalities"
  ON public.personalities FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- 5. Create indexes for performance
CREATE INDEX IF NOT EXISTS personalities_user_id_idx ON public.personalities(user_id);
CREATE INDEX IF NOT EXISTS personalities_active_idx ON public.personalities(is_active) WHERE is_active = true;