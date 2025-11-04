-- ============================================================================
-- Add RLS Policies for MaaS Tables (ДНЕВНИК)
-- ============================================================================
-- Date: 2025-11-04
-- Description: Enable RLS and create policies for Memory-as-a-Service tables
--
-- Why: MaaS tables were created without RLS, causing 400 errors in Memory Service
-- Fix: Add RLS with user_id based policies for secure access
-- ============================================================================

-- ============================================================================
-- 1. PROJECTS Table
-- ============================================================================

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Users can view their own projects
CREATE POLICY "Users can view own projects"
  ON projects
  FOR SELECT
  USING (auth.uid()::text = user_id);

-- Users can insert their own projects
CREATE POLICY "Users can create own projects"
  ON projects
  FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

-- Users can update their own projects
CREATE POLICY "Users can update own projects"
  ON projects
  FOR UPDATE
  USING (auth.uid()::text = user_id);

-- ============================================================================
-- 2. FACTS Table
-- ============================================================================

ALTER TABLE facts ENABLE ROW LEVEL SECURITY;

-- Users can view facts from their projects
CREATE POLICY "Users can view own facts"
  ON facts
  FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()::text
    )
    OR user_id = auth.uid()::text
  );

-- Users can insert facts to their projects
CREATE POLICY "Users can create facts"
  ON facts
  FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()::text
    )
    OR user_id = auth.uid()::text
  );

-- Users can update their own facts
CREATE POLICY "Users can update own facts"
  ON facts
  FOR UPDATE
  USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()::text
    )
    OR user_id = auth.uid()::text
  );

-- ============================================================================
-- 3. THREAD_SUMMARIES Table
-- ============================================================================

ALTER TABLE thread_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own thread summaries"
  ON thread_summaries
  FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()::text
    )
  );

CREATE POLICY "Users can create thread summaries"
  ON thread_summaries
  FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()::text
    )
  );

-- ============================================================================
-- 4. DECISIONS Table
-- ============================================================================

ALTER TABLE decisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own decisions"
  ON decisions
  FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()::text
    )
  );

CREATE POLICY "Users can create decisions"
  ON decisions
  FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()::text
    )
  );

-- ============================================================================
-- 5. LINKS Table
-- ============================================================================

ALTER TABLE links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own links"
  ON links
  FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()::text
    )
  );

CREATE POLICY "Users can create links"
  ON links
  FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()::text
    )
  );

-- ============================================================================
-- 6. SOURCES Table
-- ============================================================================

ALTER TABLE sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sources"
  ON sources
  FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()::text
    )
  );

CREATE POLICY "Users can create sources"
  ON sources
  FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()::text
    )
  );

-- ============================================================================
-- 7. MAAS_METRICS Table
-- ============================================================================

ALTER TABLE maas_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own maas metrics"
  ON maas_metrics
  FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()::text
    )
  );

CREATE POLICY "Users can create maas metrics"
  ON maas_metrics
  FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()::text
    )
  );

-- ============================================================================
-- 8. SNAPSHOT_CACHE Table
-- ============================================================================

ALTER TABLE snapshot_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own snapshots"
  ON snapshot_cache
  FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()::text
    )
  );

CREATE POLICY "Users can create snapshots"
  ON snapshot_cache
  FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()::text
    )
  );

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON POLICY "Users can view own projects" ON projects IS
  'Users can only see their own projects';

COMMENT ON POLICY "Users can view own facts" ON facts IS
  'Users can only see facts from their projects or directly associated with them';

-- Done! Now MaaS tables are secured with RLS
