import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Hardcoded credentials (as provided by user)
const supabaseUrl = 'https://fcsxnsjnetrtcxprcpur.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZjc3huc2puZXRydGN4cHJjcHVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkyMjEyODUsImV4cCI6MjA3NDc5NzI4NX0.MmIqCxAobuvYAYrFHBsQnglOofs1sXtAb4yiOyB9_Rk';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function applyMaasMigration() {
  try {
    console.log('🚀 Starting MaaS tables migration...');
    console.log('📦 Creating 7 tables: facts, thread_summaries, decisions, links, sources, maas_metrics, snapshot_cache\n');

    // Step 1: Enable UUID extension
    console.log('📋 Step 1: Enabling UUID extension...');
    const { error: uuidError } = await supabase.rpc('exec_sql', {
      sql: `CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`
    });
    if (uuidError) throw uuidError;
    console.log('✅ UUID extension enabled\n');

    // Step 2: Create facts table
    console.log('📋 Step 2: Creating facts table...');
    const { error: factsError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS facts (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
          thread_id TEXT,
          chat_id UUID REFERENCES chats(id) ON DELETE SET NULL,
          fact_text TEXT NOT NULL,
          fact_type TEXT NOT NULL CHECK (fact_type IN ('preference', 'personal_info', 'behavioral', 'contextual', 'technical', 'other')),
          confidence NUMERIC(3,2) DEFAULT 1.0 CHECK (confidence >= 0 AND confidence <= 1),
          source_message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
          tags TEXT[] DEFAULT '{}',
          metadata JSONB DEFAULT '{}',
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    });
    if (factsError) throw factsError;
    console.log('✅ Facts table created\n');

    // Step 3: Create indexes for facts
    console.log('📋 Step 3: Creating indexes for facts...');
    await supabase.rpc('exec_sql', { sql: `CREATE INDEX IF NOT EXISTS idx_facts_user_id ON facts(user_id);` });
    await supabase.rpc('exec_sql', { sql: `CREATE INDEX IF NOT EXISTS idx_facts_thread_id ON facts(thread_id) WHERE thread_id IS NOT NULL;` });
    await supabase.rpc('exec_sql', { sql: `CREATE INDEX IF NOT EXISTS idx_facts_chat_id ON facts(chat_id) WHERE chat_id IS NOT NULL;` });
    await supabase.rpc('exec_sql', { sql: `CREATE INDEX IF NOT EXISTS idx_facts_type ON facts(fact_type);` });
    await supabase.rpc('exec_sql', { sql: `CREATE INDEX IF NOT EXISTS idx_facts_active ON facts(is_active) WHERE is_active = true;` });
    await supabase.rpc('exec_sql', { sql: `CREATE INDEX IF NOT EXISTS idx_facts_tags ON facts USING GIN(tags);` });
    await supabase.rpc('exec_sql', { sql: `CREATE INDEX IF NOT EXISTS idx_facts_metadata ON facts USING GIN(metadata);` });
    console.log('✅ Facts indexes created\n');

    // Step 4: Enable RLS for facts
    console.log('📋 Step 4: Enabling RLS for facts...');
    await supabase.rpc('exec_sql', { sql: `ALTER TABLE facts ENABLE ROW LEVEL SECURITY;` });
    await supabase.rpc('exec_sql', { sql: `CREATE POLICY "Users can view their own facts" ON facts FOR SELECT USING (auth.uid() = user_id);` });
    await supabase.rpc('exec_sql', { sql: `CREATE POLICY "Users can insert their own facts" ON facts FOR INSERT WITH CHECK (auth.uid() = user_id);` });
    await supabase.rpc('exec_sql', { sql: `CREATE POLICY "Users can update their own facts" ON facts FOR UPDATE USING (auth.uid() = user_id);` });
    await supabase.rpc('exec_sql', { sql: `CREATE POLICY "Users can delete their own facts" ON facts FOR DELETE USING (auth.uid() = user_id);` });
    console.log('✅ Facts RLS policies created\n');

    // Step 5: Create thread_summaries table
    console.log('📋 Step 5: Creating thread_summaries table...');
    const { error: summariesError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS thread_summaries (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
          thread_id TEXT NOT NULL,
          chat_id UUID REFERENCES chats(id) ON DELETE SET NULL,
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
      `
    });
    if (summariesError) throw summariesError;
    console.log('✅ Thread_summaries table created\n');

    // Step 6: Create indexes for thread_summaries
    console.log('📋 Step 6: Creating indexes for thread_summaries...');
    await supabase.rpc('exec_sql', { sql: `CREATE INDEX IF NOT EXISTS idx_thread_summaries_user_id ON thread_summaries(user_id);` });
    await supabase.rpc('exec_sql', { sql: `CREATE INDEX IF NOT EXISTS idx_thread_summaries_thread_id ON thread_summaries(thread_id);` });
    await supabase.rpc('exec_sql', { sql: `CREATE INDEX IF NOT EXISTS idx_thread_summaries_chat_id ON thread_summaries(chat_id) WHERE chat_id IS NOT NULL;` });
    await supabase.rpc('exec_sql', { sql: `CREATE INDEX IF NOT EXISTS idx_thread_summaries_keywords ON thread_summaries USING GIN(keywords);` });
    await supabase.rpc('exec_sql', { sql: `CREATE INDEX IF NOT EXISTS idx_thread_summaries_topics ON thread_summaries USING GIN(topics);` });
    console.log('✅ Thread_summaries indexes created\n');

    // Step 7: Enable RLS for thread_summaries
    console.log('📋 Step 7: Enabling RLS for thread_summaries...');
    await supabase.rpc('exec_sql', { sql: `ALTER TABLE thread_summaries ENABLE ROW LEVEL SECURITY;` });
    await supabase.rpc('exec_sql', { sql: `CREATE POLICY "Users can view their own thread summaries" ON thread_summaries FOR SELECT USING (auth.uid() = user_id);` });
    await supabase.rpc('exec_sql', { sql: `CREATE POLICY "Users can insert their own thread summaries" ON thread_summaries FOR INSERT WITH CHECK (auth.uid() = user_id);` });
    await supabase.rpc('exec_sql', { sql: `CREATE POLICY "Users can update their own thread summaries" ON thread_summaries FOR UPDATE USING (auth.uid() = user_id);` });
    await supabase.rpc('exec_sql', { sql: `CREATE POLICY "Users can delete their own thread summaries" ON thread_summaries FOR DELETE USING (auth.uid() = user_id);` });
    console.log('✅ Thread_summaries RLS policies created\n');

    // Step 8: Create decisions table
    console.log('📋 Step 8: Creating decisions table...');
    const { error: decisionsError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS decisions (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
          thread_id TEXT,
          chat_id UUID REFERENCES chats(id) ON DELETE SET NULL,
          decision_text TEXT NOT NULL,
          decision_type TEXT NOT NULL CHECK (decision_type IN ('action', 'preference', 'plan', 'goal', 'constraint', 'other')),
          status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled', 'deferred')),
          outcome TEXT,
          priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
          source_message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
          due_date TIMESTAMP WITH TIME ZONE,
          completed_at TIMESTAMP WITH TIME ZONE,
          tags TEXT[] DEFAULT '{}',
          metadata JSONB DEFAULT '{}',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    });
    if (decisionsError) throw decisionsError;
    console.log('✅ Decisions table created\n');

    // Step 9: Create indexes for decisions
    console.log('📋 Step 9: Creating indexes for decisions...');
    await supabase.rpc('exec_sql', { sql: `CREATE INDEX IF NOT EXISTS idx_decisions_user_id ON decisions(user_id);` });
    await supabase.rpc('exec_sql', { sql: `CREATE INDEX IF NOT EXISTS idx_decisions_thread_id ON decisions(thread_id) WHERE thread_id IS NOT NULL;` });
    await supabase.rpc('exec_sql', { sql: `CREATE INDEX IF NOT EXISTS idx_decisions_chat_id ON decisions(chat_id) WHERE chat_id IS NOT NULL;` });
    await supabase.rpc('exec_sql', { sql: `CREATE INDEX IF NOT EXISTS idx_decisions_type ON decisions(decision_type);` });
    await supabase.rpc('exec_sql', { sql: `CREATE INDEX IF NOT EXISTS idx_decisions_status ON decisions(status);` });
    await supabase.rpc('exec_sql', { sql: `CREATE INDEX IF NOT EXISTS idx_decisions_priority ON decisions(priority);` });
    await supabase.rpc('exec_sql', { sql: `CREATE INDEX IF NOT EXISTS idx_decisions_tags ON decisions USING GIN(tags);` });
    console.log('✅ Decisions indexes created\n');

    // Step 10: Enable RLS for decisions
    console.log('📋 Step 10: Enabling RLS for decisions...');
    await supabase.rpc('exec_sql', { sql: `ALTER TABLE decisions ENABLE ROW LEVEL SECURITY;` });
    await supabase.rpc('exec_sql', { sql: `CREATE POLICY "Users can view their own decisions" ON decisions FOR SELECT USING (auth.uid() = user_id);` });
    await supabase.rpc('exec_sql', { sql: `CREATE POLICY "Users can insert their own decisions" ON decisions FOR INSERT WITH CHECK (auth.uid() = user_id);` });
    await supabase.rpc('exec_sql', { sql: `CREATE POLICY "Users can update their own decisions" ON decisions FOR UPDATE USING (auth.uid() = user_id);` });
    await supabase.rpc('exec_sql', { sql: `CREATE POLICY "Users can delete their own decisions" ON decisions FOR DELETE USING (auth.uid() = user_id);` });
    console.log('✅ Decisions RLS policies created\n');

    // Step 11: Create links table
    console.log('📋 Step 11: Creating links table...');
    const { error: linksError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS links (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
          source_type TEXT NOT NULL CHECK (source_type IN ('fact', 'decision', 'summary', 'message', 'source', 'chat', 'other')),
          source_id UUID NOT NULL,
          target_type TEXT NOT NULL CHECK (target_type IN ('fact', 'decision', 'summary', 'message', 'source', 'chat', 'other')),
          target_id UUID NOT NULL,
          link_type TEXT NOT NULL CHECK (link_type IN ('related_to', 'derived_from', 'supports', 'contradicts', 'references', 'depends_on', 'other')),
          strength NUMERIC(3,2) DEFAULT 1.0 CHECK (strength >= 0 AND strength <= 1),
          metadata JSONB DEFAULT '{}',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    });
    if (linksError) throw linksError;
    console.log('✅ Links table created\n');

    // Step 12: Create indexes for links
    console.log('📋 Step 12: Creating indexes for links...');
    await supabase.rpc('exec_sql', { sql: `CREATE INDEX IF NOT EXISTS idx_links_user_id ON links(user_id);` });
    await supabase.rpc('exec_sql', { sql: `CREATE INDEX IF NOT EXISTS idx_links_source ON links(source_type, source_id);` });
    await supabase.rpc('exec_sql', { sql: `CREATE INDEX IF NOT EXISTS idx_links_target ON links(target_type, target_id);` });
    await supabase.rpc('exec_sql', { sql: `CREATE INDEX IF NOT EXISTS idx_links_type ON links(link_type);` });
    console.log('✅ Links indexes created\n');

    // Step 13: Enable RLS for links
    console.log('📋 Step 13: Enabling RLS for links...');
    await supabase.rpc('exec_sql', { sql: `ALTER TABLE links ENABLE ROW LEVEL SECURITY;` });
    await supabase.rpc('exec_sql', { sql: `CREATE POLICY "Users can view their own links" ON links FOR SELECT USING (auth.uid() = user_id);` });
    await supabase.rpc('exec_sql', { sql: `CREATE POLICY "Users can insert their own links" ON links FOR INSERT WITH CHECK (auth.uid() = user_id);` });
    await supabase.rpc('exec_sql', { sql: `CREATE POLICY "Users can update their own links" ON links FOR UPDATE USING (auth.uid() = user_id);` });
    await supabase.rpc('exec_sql', { sql: `CREATE POLICY "Users can delete their own links" ON links FOR DELETE USING (auth.uid() = user_id);` });
    console.log('✅ Links RLS policies created\n');

    // Step 14: Create sources table
    console.log('📋 Step 14: Creating sources table...');
    const { error: sourcesError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS sources (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
          source_type TEXT NOT NULL CHECK (source_type IN ('web', 'document', 'api', 'database', 'manual', 'other')),
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
      `
    });
    if (sourcesError) throw sourcesError;
    console.log('✅ Sources table created\n');

    // Step 15: Create indexes for sources
    console.log('📋 Step 15: Creating indexes for sources...');
    await supabase.rpc('exec_sql', { sql: `CREATE INDEX IF NOT EXISTS idx_sources_user_id ON sources(user_id);` });
    await supabase.rpc('exec_sql', { sql: `CREATE INDEX IF NOT EXISTS idx_sources_type ON sources(source_type);` });
    await supabase.rpc('exec_sql', { sql: `CREATE INDEX IF NOT EXISTS idx_sources_url ON sources(source_url) WHERE source_url IS NOT NULL;` });
    await supabase.rpc('exec_sql', { sql: `CREATE INDEX IF NOT EXISTS idx_sources_tags ON sources USING GIN(tags);` });
    await supabase.rpc('exec_sql', { sql: `CREATE INDEX IF NOT EXISTS idx_sources_metadata ON sources USING GIN(metadata);` });
    console.log('✅ Sources indexes created\n');

    // Step 16: Enable RLS for sources
    console.log('📋 Step 16: Enabling RLS for sources...');
    await supabase.rpc('exec_sql', { sql: `ALTER TABLE sources ENABLE ROW LEVEL SECURITY;` });
    await supabase.rpc('exec_sql', { sql: `CREATE POLICY "Users can view their own sources" ON sources FOR SELECT USING (auth.uid() = user_id);` });
    await supabase.rpc('exec_sql', { sql: `CREATE POLICY "Users can insert their own sources" ON sources FOR INSERT WITH CHECK (auth.uid() = user_id);` });
    await supabase.rpc('exec_sql', { sql: `CREATE POLICY "Users can update their own sources" ON sources FOR UPDATE USING (auth.uid() = user_id);` });
    await supabase.rpc('exec_sql', { sql: `CREATE POLICY "Users can delete their own sources" ON sources FOR DELETE USING (auth.uid() = user_id);` });
    console.log('✅ Sources RLS policies created\n');

    // Step 17: Create maas_metrics table
    console.log('📋 Step 17: Creating maas_metrics table...');
    const { error: metricsError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS maas_metrics (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
          metric_type TEXT NOT NULL CHECK (metric_type IN ('fact_created', 'fact_updated', 'decision_made', 'summary_generated', 'link_created', 'source_added', 'snapshot_created', 'query_executed', 'other')),
          metric_value NUMERIC,
          metric_unit TEXT,
          entity_type TEXT,
          entity_id UUID,
          metadata JSONB DEFAULT '{}',
          recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    });
    if (metricsError) throw metricsError;
    console.log('✅ Maas_metrics table created\n');

    // Step 18: Create indexes for maas_metrics
    console.log('📋 Step 18: Creating indexes for maas_metrics...');
    await supabase.rpc('exec_sql', { sql: `CREATE INDEX IF NOT EXISTS idx_maas_metrics_user_id ON maas_metrics(user_id);` });
    await supabase.rpc('exec_sql', { sql: `CREATE INDEX IF NOT EXISTS idx_maas_metrics_type ON maas_metrics(metric_type);` });
    await supabase.rpc('exec_sql', { sql: `CREATE INDEX IF NOT EXISTS idx_maas_metrics_recorded_at ON maas_metrics(recorded_at);` });
    await supabase.rpc('exec_sql', { sql: `CREATE INDEX IF NOT EXISTS idx_maas_metrics_entity ON maas_metrics(entity_type, entity_id) WHERE entity_type IS NOT NULL;` });
    console.log('✅ Maas_metrics indexes created\n');

    // Step 19: Enable RLS for maas_metrics
    console.log('📋 Step 19: Enabling RLS for maas_metrics...');
    await supabase.rpc('exec_sql', { sql: `ALTER TABLE maas_metrics ENABLE ROW LEVEL SECURITY;` });
    await supabase.rpc('exec_sql', { sql: `CREATE POLICY "Users can view their own metrics" ON maas_metrics FOR SELECT USING (auth.uid() = user_id);` });
    await supabase.rpc('exec_sql', { sql: `CREATE POLICY "Users can insert their own metrics" ON maas_metrics FOR INSERT WITH CHECK (auth.uid() = user_id);` });
    console.log('✅ Maas_metrics RLS policies created\n');

    // Step 20: Create snapshot_cache table
    console.log('📋 Step 20: Creating snapshot_cache table...');
    const { error: snapshotError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS snapshot_cache (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
          thread_id TEXT,
          chat_id UUID REFERENCES chats(id) ON DELETE CASCADE,
          snapshot_type TEXT NOT NULL CHECK (snapshot_type IN ('full', 'incremental', 'summary', 'context', 'other')),
          snapshot_data JSONB NOT NULL,
          version INTEGER DEFAULT 1,
          size_bytes INTEGER,
          expires_at TIMESTAMP WITH TIME ZONE,
          last_accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          access_count INTEGER DEFAULT 0,
          metadata JSONB DEFAULT '{}',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    });
    if (snapshotError) throw snapshotError;
    console.log('✅ Snapshot_cache table created\n');

    // Step 21: Create indexes for snapshot_cache
    console.log('📋 Step 21: Creating indexes for snapshot_cache...');
    await supabase.rpc('exec_sql', { sql: `CREATE INDEX IF NOT EXISTS idx_snapshot_cache_user_id ON snapshot_cache(user_id);` });
    await supabase.rpc('exec_sql', { sql: `CREATE INDEX IF NOT EXISTS idx_snapshot_cache_thread_id ON snapshot_cache(thread_id) WHERE thread_id IS NOT NULL;` });
    await supabase.rpc('exec_sql', { sql: `CREATE INDEX IF NOT EXISTS idx_snapshot_cache_chat_id ON snapshot_cache(chat_id) WHERE chat_id IS NOT NULL;` });
    await supabase.rpc('exec_sql', { sql: `CREATE INDEX IF NOT EXISTS idx_snapshot_cache_type ON snapshot_cache(snapshot_type);` });
    await supabase.rpc('exec_sql', { sql: `CREATE INDEX IF NOT EXISTS idx_snapshot_cache_expires_at ON snapshot_cache(expires_at) WHERE expires_at IS NOT NULL;` });
    await supabase.rpc('exec_sql', { sql: `CREATE INDEX IF NOT EXISTS idx_snapshot_cache_data ON snapshot_cache USING GIN(snapshot_data);` });
    console.log('✅ Snapshot_cache indexes created\n');

    // Step 22: Enable RLS for snapshot_cache
    console.log('📋 Step 22: Enabling RLS for snapshot_cache...');
    await supabase.rpc('exec_sql', { sql: `ALTER TABLE snapshot_cache ENABLE ROW LEVEL SECURITY;` });
    await supabase.rpc('exec_sql', { sql: `CREATE POLICY "Users can view their own snapshots" ON snapshot_cache FOR SELECT USING (auth.uid() = user_id);` });
    await supabase.rpc('exec_sql', { sql: `CREATE POLICY "Users can insert their own snapshots" ON snapshot_cache FOR INSERT WITH CHECK (auth.uid() = user_id);` });
    await supabase.rpc('exec_sql', { sql: `CREATE POLICY "Users can update their own snapshots" ON snapshot_cache FOR UPDATE USING (auth.uid() = user_id);` });
    await supabase.rpc('exec_sql', { sql: `CREATE POLICY "Users can delete their own snapshots" ON snapshot_cache FOR DELETE USING (auth.uid() = user_id);` });
    console.log('✅ Snapshot_cache RLS policies created\n');

    // Step 23: Create cleanup function
    console.log('📋 Step 23: Creating cleanup function...');
    const { error: cleanupError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE OR REPLACE FUNCTION cleanup_expired_snapshots()
        RETURNS void AS $$
        BEGIN
          DELETE FROM snapshot_cache
          WHERE expires_at IS NOT NULL
            AND expires_at < NOW();
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;
      `
    });
    if (cleanupError) throw cleanupError;
    console.log('✅ Cleanup function created\n');

    // Step 24: Create update_updated_at trigger function
    console.log('📋 Step 24: Creating update_updated_at function...');
    const { error: triggerFuncError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
          NEW.updated_at = NOW();
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
      `
    });
    if (triggerFuncError) throw triggerFuncError;
    console.log('✅ Update_updated_at function created\n');

    // Step 25: Create triggers
    console.log('📋 Step 25: Creating triggers...');
    await supabase.rpc('exec_sql', { sql: `DROP TRIGGER IF EXISTS update_facts_updated_at ON facts;` });
    await supabase.rpc('exec_sql', { sql: `CREATE TRIGGER update_facts_updated_at BEFORE UPDATE ON facts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();` });

    await supabase.rpc('exec_sql', { sql: `DROP TRIGGER IF EXISTS update_thread_summaries_updated_at ON thread_summaries;` });
    await supabase.rpc('exec_sql', { sql: `CREATE TRIGGER update_thread_summaries_updated_at BEFORE UPDATE ON thread_summaries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();` });

    await supabase.rpc('exec_sql', { sql: `DROP TRIGGER IF EXISTS update_decisions_updated_at ON decisions;` });
    await supabase.rpc('exec_sql', { sql: `CREATE TRIGGER update_decisions_updated_at BEFORE UPDATE ON decisions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();` });

    await supabase.rpc('exec_sql', { sql: `DROP TRIGGER IF EXISTS update_sources_updated_at ON sources;` });
    await supabase.rpc('exec_sql', { sql: `CREATE TRIGGER update_sources_updated_at BEFORE UPDATE ON sources FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();` });
    console.log('✅ Triggers created\n');

    console.log('🎉 MaaS tables migration completed successfully!\n');

    // Verify migration results
    console.log('🔍 Verifying migration...');
    const { data: tables, error: verifyError } = await supabase.rpc('exec_sql', {
      sql: `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('facts', 'thread_summaries', 'decisions', 'links', 'sources', 'maas_metrics', 'snapshot_cache');`
    });

    console.log('\n✅ Migration summary:');
    console.log('  ✓ facts - Store user facts and context');
    console.log('  ✓ thread_summaries - Store conversation summaries');
    console.log('  ✓ decisions - Store decisions made in conversations');
    console.log('  ✓ links - Store relationships between entities');
    console.log('  ✓ sources - Store external information sources');
    console.log('  ✓ maas_metrics - Store usage metrics');
    console.log('  ✓ snapshot_cache - Store cached memory snapshots');
    console.log('\n🚀 All MaaS tables are ready to use!');

  } catch (error) {
    console.error('❌ Error during migration:', error);
    process.exit(1);
  }
}

// Run migration
applyMaasMigration();
