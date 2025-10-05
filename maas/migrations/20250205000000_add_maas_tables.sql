-- Migration: Add MaaS (Memory as a Service) Tables
-- Date: 2025-02-05
-- Description: Creates 7 tables for MaaS functionality

-- Enable UUID extension if not exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. FACTS - Store user facts and context information
-- ============================================================================
CREATE TABLE IF NOT EXISTS facts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  session_id TEXT,
  user_id TEXT,

  subject TEXT NOT NULL,
  value JSONB NOT NULL,
  level TEXT DEFAULT 'fact' CHECK (level IN ('fact', 'insight', 'pattern', 'hypothesis')),
  source_type TEXT DEFAULT 'inferred' CHECK (source_type IN ('user_stated', 'inferred', 'observed', 'derived')),

  confidence NUMERIC(3,2) DEFAULT 1.0 CHECK (confidence >= 0 AND confidence <= 1),
  importance INTEGER DEFAULT 5 CHECK (importance >= 1 AND importance <= 10),

  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',

  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for facts
CREATE INDEX idx_facts_project_id ON facts(project_id);
CREATE INDEX idx_facts_session_id ON facts(session_id) WHERE session_id IS NOT NULL;
CREATE INDEX idx_facts_user_id ON facts(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_facts_subject ON facts(subject);
CREATE INDEX idx_facts_level ON facts(level);
CREATE INDEX idx_facts_source_type ON facts(source_type);
CREATE INDEX idx_facts_active ON facts(is_active) WHERE is_active = true;
CREATE INDEX idx_facts_tags ON facts USING GIN(tags);
CREATE INDEX idx_facts_value ON facts USING GIN(value);

-- RLS for facts
ALTER TABLE facts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own facts"
  ON facts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own facts"
  ON facts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own facts"
  ON facts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own facts"
  ON facts FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- 2. THREAD_SUMMARIES - Store summaries of conversation threads
-- ============================================================================
CREATE TABLE IF NOT EXISTS thread_summaries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  session_id TEXT,
  thread_id TEXT,

  summary_text TEXT NOT NULL,
  summary_type TEXT DEFAULT 'auto' CHECK (summary_type IN ('auto', 'manual', 'periodic')),

  message_count INTEGER DEFAULT 0,
  token_count INTEGER DEFAULT 0,

  first_message_at TIMESTAMP WITH TIME ZONE,
  last_message_at TIMESTAMP WITH TIME ZONE,

  keywords TEXT[] DEFAULT '{}',
  topics JSONB DEFAULT '[]',
  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for thread_summaries
CREATE INDEX idx_thread_summaries_project_id ON thread_summaries(project_id);
CREATE INDEX idx_thread_summaries_session_id ON thread_summaries(session_id) WHERE session_id IS NOT NULL;
CREATE INDEX idx_thread_summaries_thread_id ON thread_summaries(thread_id) WHERE thread_id IS NOT NULL;
CREATE INDEX idx_thread_summaries_keywords ON thread_summaries USING GIN(keywords);
CREATE INDEX idx_thread_summaries_topics ON thread_summaries USING GIN(topics);

-- RLS for thread_summaries
ALTER TABLE thread_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own thread summaries"
  ON thread_summaries FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own thread summaries"
  ON thread_summaries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own thread summaries"
  ON thread_summaries FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own thread summaries"
  ON thread_summaries FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- 3. DECISIONS - Store decisions made in conversations
-- ============================================================================
CREATE TABLE IF NOT EXISTS decisions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  session_id TEXT,

  decision_text TEXT NOT NULL,
  decision_type TEXT NOT NULL CHECK (decision_type IN (
    'action', 'preference', 'plan', 'goal', 'constraint', 'other'
  )),

  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending', 'in_progress', 'completed', 'cancelled', 'deferred'
  )),

  outcome TEXT,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),

  due_date TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,

  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for decisions
CREATE INDEX idx_decisions_project_id ON decisions(project_id);
CREATE INDEX idx_decisions_session_id ON decisions(session_id) WHERE session_id IS NOT NULL;
CREATE INDEX idx_decisions_type ON decisions(decision_type);
CREATE INDEX idx_decisions_status ON decisions(status);
CREATE INDEX idx_decisions_priority ON decisions(priority);
CREATE INDEX idx_decisions_tags ON decisions USING GIN(tags);

-- RLS for decisions
ALTER TABLE decisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own decisions"
  ON decisions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own decisions"
  ON decisions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own decisions"
  ON decisions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own decisions"
  ON decisions FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- 4. LINKS - Store relationships between entities
-- ============================================================================
CREATE TABLE IF NOT EXISTS links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,

  source_type TEXT NOT NULL CHECK (source_type IN (
    'fact', 'decision', 'summary', 'message', 'source', 'chat', 'other'
  )),
  source_id UUID NOT NULL,

  target_type TEXT NOT NULL CHECK (target_type IN (
    'fact', 'decision', 'summary', 'message', 'source', 'chat', 'other'
  )),
  target_id UUID NOT NULL,

  link_type TEXT NOT NULL CHECK (link_type IN (
    'related_to', 'derived_from', 'supports', 'contradicts', 'references', 'depends_on', 'other'
  )),

  strength NUMERIC(3,2) DEFAULT 1.0 CHECK (strength >= 0 AND strength <= 1),
  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for links
CREATE INDEX idx_links_project_id ON links(project_id);
CREATE INDEX idx_links_source ON links(source_type, source_id);
CREATE INDEX idx_links_target ON links(target_type, target_id);
CREATE INDEX idx_links_type ON links(link_type);

-- RLS for links
ALTER TABLE links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own links"
  ON links FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own links"
  ON links FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own links"
  ON links FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own links"
  ON links FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- 5. SOURCES - Store external information sources
-- ============================================================================
CREATE TABLE IF NOT EXISTS sources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,

  source_type TEXT NOT NULL CHECK (source_type IN (
    'web', 'document', 'api', 'database', 'manual', 'other'
  )),

  source_url TEXT,
  source_title TEXT,
  source_content TEXT,
  source_excerpt TEXT,

  author TEXT,
  published_at TIMESTAMP WITH TIME ZONE,
  accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  credibility_score NUMERIC(3,2) DEFAULT 0.5 CHECK (credibility_score >= 0 AND credibility_score <= 1),

  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for sources
CREATE INDEX idx_sources_project_id ON sources(project_id);
CREATE INDEX idx_sources_type ON sources(source_type);
CREATE INDEX idx_sources_url ON sources(source_url) WHERE source_url IS NOT NULL;
CREATE INDEX idx_sources_tags ON sources USING GIN(tags);
CREATE INDEX idx_sources_metadata ON sources USING GIN(metadata);

-- RLS for sources
ALTER TABLE sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own sources"
  ON sources FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sources"
  ON sources FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sources"
  ON sources FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sources"
  ON sources FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- 6. MAAS_METRICS - Store usage metrics for MaaS
-- ============================================================================
CREATE TABLE IF NOT EXISTS maas_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,

  metric_type TEXT NOT NULL CHECK (metric_type IN (
    'fact_created', 'fact_updated', 'decision_made', 'summary_generated',
    'link_created', 'source_added', 'snapshot_created', 'query_executed', 'other'
  )),

  metric_value NUMERIC,
  metric_unit TEXT,

  entity_type TEXT,
  entity_id UUID,

  metadata JSONB DEFAULT '{}',

  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for maas_metrics
CREATE INDEX idx_maas_metrics_project_id ON maas_metrics(project_id);
CREATE INDEX idx_maas_metrics_type ON maas_metrics(metric_type);
CREATE INDEX idx_maas_metrics_recorded_at ON maas_metrics(recorded_at);
CREATE INDEX idx_maas_metrics_entity ON maas_metrics(entity_type, entity_id) WHERE entity_type IS NOT NULL;

-- RLS for maas_metrics
ALTER TABLE maas_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own metrics"
  ON maas_metrics FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own metrics"
  ON maas_metrics FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- 7. SNAPSHOT_CACHE - Store cached snapshots of memory state
-- ============================================================================
CREATE TABLE IF NOT EXISTS snapshot_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  session_id TEXT,

  snapshot_type TEXT NOT NULL CHECK (snapshot_type IN (
    'full', 'incremental', 'summary', 'context', 'other'
  )),

  snapshot_data JSONB NOT NULL,

  version INTEGER DEFAULT 1,
  size_bytes INTEGER,

  expires_at TIMESTAMP WITH TIME ZONE,
  last_accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  access_count INTEGER DEFAULT 0,

  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for snapshot_cache
CREATE INDEX idx_snapshot_cache_project_id ON snapshot_cache(project_id);
CREATE INDEX idx_snapshot_cache_session_id ON snapshot_cache(session_id) WHERE session_id IS NOT NULL;
CREATE INDEX idx_snapshot_cache_type ON snapshot_cache(snapshot_type);
CREATE INDEX idx_snapshot_cache_expires_at ON snapshot_cache(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX idx_snapshot_cache_data ON snapshot_cache USING GIN(snapshot_data);

-- RLS for snapshot_cache
ALTER TABLE snapshot_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own snapshots"
  ON snapshot_cache FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own snapshots"
  ON snapshot_cache FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own snapshots"
  ON snapshot_cache FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own snapshots"
  ON snapshot_cache FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- Cleanup function for expired snapshots
-- ============================================================================
CREATE OR REPLACE FUNCTION cleanup_expired_snapshots()
RETURNS void AS $$
BEGIN
  DELETE FROM snapshot_cache
  WHERE expires_at IS NOT NULL
    AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Trigger to update updated_at timestamp
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to tables with updated_at
CREATE TRIGGER update_facts_updated_at
  BEFORE UPDATE ON facts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_thread_summaries_updated_at
  BEFORE UPDATE ON thread_summaries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_decisions_updated_at
  BEFORE UPDATE ON decisions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sources_updated_at
  BEFORE UPDATE ON sources
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Comments for documentation
-- ============================================================================
COMMENT ON TABLE facts IS 'Stores user facts and contextual information extracted from conversations';
COMMENT ON TABLE thread_summaries IS 'Stores summaries of conversation threads';
COMMENT ON TABLE decisions IS 'Stores decisions made during conversations';
COMMENT ON TABLE links IS 'Stores relationships between different entities';
COMMENT ON TABLE sources IS 'Stores external information sources';
COMMENT ON TABLE maas_metrics IS 'Stores usage metrics for MaaS functionality';
COMMENT ON TABLE snapshot_cache IS 'Stores cached snapshots of memory state';
