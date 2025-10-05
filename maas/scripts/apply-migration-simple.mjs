import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const supabaseUrl = 'https://fcsxnsjnetrtcxprcpur.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZjc3huc2puZXRydGN4cHJjcHVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkyMjEyODUsImV4cCI6MjA3NDc5NzI4NX0.MmIqCxAobuvYAYrFHBsQnglOofs1sXtAb4yiOyB9_Rk';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function applyMigration() {
  try {
    console.log('🚀 Reading migration file...\n');

    // Read the SQL migration file
    const migrationPath = join(__dirname, '../migrations/20250205000000_add_maas_tables.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');

    console.log('📦 Applying MaaS tables migration...\n');

    // Split by statements and execute one by one
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    let step = 0;
    for (const statement of statements) {
      step++;

      // Skip comments-only statements
      if (statement.match(/^COMMENT ON/i)) {
        console.log(`📝 Step ${step}: Adding comment...`);
      } else if (statement.match(/^CREATE TABLE/i)) {
        const tableName = statement.match(/CREATE TABLE (?:IF NOT EXISTS )?(\w+)/i)?.[1];
        console.log(`📋 Step ${step}: Creating table ${tableName}...`);
      } else if (statement.match(/^CREATE INDEX/i)) {
        console.log(`📋 Step ${step}: Creating index...`);
      } else if (statement.match(/^CREATE POLICY/i)) {
        console.log(`📋 Step ${step}: Creating RLS policy...`);
      } else if (statement.match(/^ALTER TABLE/i)) {
        console.log(`📋 Step ${step}: Altering table...`);
      } else if (statement.match(/^CREATE (?:OR REPLACE )?FUNCTION/i)) {
        console.log(`📋 Step ${step}: Creating function...`);
      } else if (statement.match(/^CREATE (?:OR REPLACE )?TRIGGER/i)) {
        console.log(`📋 Step ${step}: Creating trigger...`);
      } else if (statement.match(/^DROP TRIGGER/i)) {
        console.log(`📋 Step ${step}: Dropping trigger...`);
      } else if (statement.match(/^CREATE EXTENSION/i)) {
        console.log(`📋 Step ${step}: Creating extension...`);
      } else {
        console.log(`📋 Step ${step}: Executing SQL...`);
      }

      const { error } = await supabase.rpc('exec_sql', {
        sql: statement + ';'
      });

      if (error) {
        console.error(`❌ Error at step ${step}:`, error.message);
        console.error('Statement:', statement.substring(0, 100) + '...');
        throw error;
      }

      console.log(`✅ Step ${step} completed\n`);
    }

    console.log('🎉 MaaS tables migration completed successfully!\n');
    console.log('✅ Created tables:');
    console.log('  ✓ facts - User facts and context');
    console.log('  ✓ thread_summaries - Conversation summaries');
    console.log('  ✓ decisions - Decisions from conversations');
    console.log('  ✓ links - Entity relationships');
    console.log('  ✓ sources - External information sources');
    console.log('  ✓ maas_metrics - Usage metrics');
    console.log('  ✓ snapshot_cache - Memory snapshots');

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    process.exit(1);
  }
}

applyMigration();
