/*
  # Add updated_at to chats table

  1. Changes
    - Add `updated_at` column to chats table
    - Create trigger function to auto-update `updated_at`
    - Create trigger on chats table
    - Backfill existing records with created_at value

  2. Why needed
    - Sort chats by last activity (not creation time)
    - When user sends message, chat "bubbles up" to top
    - Better UX for chat list ordering
*/

-- 1. Add updated_at column
ALTER TABLE public.chats
ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now() NOT NULL;

-- 2. Backfill existing records (set updated_at = created_at for existing chats)
UPDATE public.chats
SET updated_at = created_at
WHERE updated_at IS NULL OR updated_at = now();

-- 3. Create trigger function to auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Create trigger on chats table
DROP TRIGGER IF EXISTS update_chats_updated_at ON public.chats;
CREATE TRIGGER update_chats_updated_at
  BEFORE UPDATE ON public.chats
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Create index for faster sorting by updated_at
CREATE INDEX IF NOT EXISTS chats_updated_at_idx ON public.chats(updated_at DESC);
