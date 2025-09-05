-- Fix personalities table schema - add missing prompt column
-- This migration ensures all required columns exist

-- Check if prompt column exists and add it if not
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'personalities' AND column_name = 'prompt'
  ) THEN
    ALTER TABLE personalities ADD COLUMN prompt TEXT NOT NULL DEFAULT '';
    RAISE NOTICE 'Added prompt column to personalities table';
  ELSE
    RAISE NOTICE 'Prompt column already exists';
  END IF;
END $$;

-- Ensure other critical columns exist
DO $$
BEGIN
  -- Add is_active if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'personalities' AND column_name = 'is_active'
  ) THEN
    ALTER TABLE personalities ADD COLUMN is_active BOOLEAN DEFAULT false;
    RAISE NOTICE 'Added is_active column';
  END IF;

  -- Add has_memory if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'personalities' AND column_name = 'has_memory'
  ) THEN
    ALTER TABLE personalities ADD COLUMN has_memory BOOLEAN DEFAULT true;
    RAISE NOTICE 'Added has_memory column';
  END IF;

  -- Add openai_assistant_id if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'personalities' AND column_name = 'openai_assistant_id'
  ) THEN
    ALTER TABLE personalities ADD COLUMN openai_assistant_id TEXT;
    RAISE NOTICE 'Added openai_assistant_id column';
  END IF;

  -- Add files JSONB column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'personalities' AND column_name = 'files'
  ) THEN
    ALTER TABLE personalities ADD COLUMN files JSONB DEFAULT '[]';
    RAISE NOTICE 'Added files column';
  END IF;

  -- Add file_instruction if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'personalities' AND column_name = 'file_instruction'
  ) THEN
    ALTER TABLE personalities ADD COLUMN file_instruction TEXT;
    RAISE NOTICE 'Added file_instruction column';
  END IF;
END $$;

-- Create or update constraints
DO $$
BEGIN
  -- Add GIN index for files JSONB if not exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'personalities' AND indexname = 'personalities_files_gin_idx'
  ) THEN
    CREATE INDEX personalities_files_gin_idx ON personalities USING GIN (files);
    RAISE NOTICE 'Created GIN index for files column';
  END IF;

  -- Add index for openai_assistant_id if not exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'personalities' AND indexname = 'personalities_assistant_id_idx'
  ) THEN
    CREATE INDEX personalities_assistant_id_idx ON personalities (openai_assistant_id);
    RAISE NOTICE 'Created index for openai_assistant_id';
  END IF;
END $$;

-- Add file limit constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints 
    WHERE constraint_name = 'personalities_files_limit'
  ) THEN
    ALTER TABLE personalities 
    ADD CONSTRAINT personalities_files_limit 
    CHECK (jsonb_array_length(files) <= 20);
    RAISE NOTICE 'Added files limit constraint (max 20 files)';
  END IF;
END $$;