-- MANUAL MIGRATION FOR PERSONALITIES TABLE
-- Execute this SQL in Supabase Dashboard > SQL Editor

-- Add missing columns to personalities table
ALTER TABLE personalities ADD COLUMN IF NOT EXISTS prompt TEXT NOT NULL DEFAULT '';
ALTER TABLE personalities ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT false;  
ALTER TABLE personalities ADD COLUMN IF NOT EXISTS has_memory BOOLEAN DEFAULT true;
ALTER TABLE personalities ADD COLUMN IF NOT EXISTS openai_assistant_id TEXT;
ALTER TABLE personalities ADD COLUMN IF NOT EXISTS files JSONB DEFAULT '[]';
ALTER TABLE personalities ADD COLUMN IF NOT EXISTS file_instruction TEXT;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS personalities_files_gin_idx ON personalities USING GIN (files);
CREATE INDEX IF NOT EXISTS personalities_assistant_id_idx ON personalities (openai_assistant_id);

-- Add constraint for max 20 files (skip if already exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name = 'personalities_files_limit'
    ) THEN
        ALTER TABLE personalities ADD CONSTRAINT personalities_files_limit 
        CHECK (jsonb_array_length(files) <= 20);
    END IF;
END $$;

-- Verify the changes
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'personalities' 
ORDER BY ordinal_position;