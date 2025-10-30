-- Migration: Add missing columns to document_chunks
-- Date: 2025-02-29
-- Purpose: Align document_chunks table with TypeScript interface

-- Add user_id for user ownership
ALTER TABLE document_chunks
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add is_public for public/private documents
ALTER TABLE document_chunks
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false;

-- Add project_id for MaaS integration
ALTER TABLE document_chunks
ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE SET NULL;

-- Add file_size for file metadata
ALTER TABLE document_chunks
ADD COLUMN IF NOT EXISTS file_size BIGINT;

-- Add source_url for web sources
ALTER TABLE document_chunks
ADD COLUMN IF NOT EXISTS source_url TEXT;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_document_chunks_user_id ON document_chunks(user_id);
CREATE INDEX IF NOT EXISTS idx_document_chunks_is_public ON document_chunks(is_public) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_document_chunks_project_id ON document_chunks(project_id);

-- Add comments
COMMENT ON COLUMN document_chunks.user_id IS 'Owner of the document (NULL = public/system document)';
COMMENT ON COLUMN document_chunks.is_public IS 'Whether document is publicly accessible';
COMMENT ON COLUMN document_chunks.project_id IS 'Associated MaaS project';
COMMENT ON COLUMN document_chunks.file_size IS 'Size of source file in bytes';
COMMENT ON COLUMN document_chunks.source_url IS 'URL of source document (if from web)';
