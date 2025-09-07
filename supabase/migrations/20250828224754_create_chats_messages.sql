/*
  # Create chats and messages tables

  1. Extensions
    - Enable pgcrypto for UUID generation

  2. New Tables
    - `chats`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `title` (text)
      - `created_at` (timestamp)
    - `messages` 
      - `id` (uuid, primary key)
      - `chat_id` (uuid, foreign key to chats.id)
      - `role` (text, 'user' or 'assistant')
      - `content` (text)
      - `created_at` (timestamp)

  3. Security
    - Enable RLS on both tables
    - Add policies for authenticated users to manage their own data
*/

-- убедитесь, что расширение pgcrypto включено для генерации uuid
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. создаём таблицу chats
CREATE TABLE IF NOT EXISTS public.chats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title text,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- 2. создаём таблицу messages c правильным типом chat_id
CREATE TABLE IF NOT EXISTS public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id uuid REFERENCES public.chats(id) ON DELETE CASCADE NOT NULL,
  role text NOT NULL CHECK (role IN ('user','assistant')),
  content text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- 3. включаем RLS
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- 4. политики RLS для chats
CREATE POLICY "Users can view their own chats"
  ON public.chats FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own chats"
  ON public.chats FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own chats"
  ON public.chats FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own chats"
  ON public.chats FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- 5. политики RLS для messages
CREATE POLICY "Users can view their own messages"
  ON public.messages FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.chats c
    WHERE c.id = chat_id AND c.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert their own messages"
  ON public.messages FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.chats c
    WHERE c.id = chat_id AND c.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete their own messages"
  ON public.messages FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.chats c
    WHERE c.id = chat_id AND c.user_id = auth.uid()
  ));