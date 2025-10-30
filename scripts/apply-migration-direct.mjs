import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

console.log('\n════════════════════════════════════════════════════════════');
console.log('  DOCUMENT_CHUNKS MIGRATION - Direct Apply');
console.log('════════════════════════════════════════════════════════════\n');

// Read migration file
const migrationPath = join(__dirname, '../supabase/migrations/20250229000003_add_document_chunks_columns.sql');
const migrationSQL = readFileSync(migrationPath, 'utf8');

console.log('📄 Applying full migration as single query...\n');

try {
  // Apply the entire migration as one query
  const { data, error } = await supabase.from('document_chunks').select('*').limit(0);

  if (error) {
    console.log('❌ Error checking table:', error.message);
  }

  // Try to use REST API to execute SQL
  const response = await fetch(`${process.env.VITE_SUPABASE_URL}/rest/v1/rpc/query`, {
    method: 'POST',
    headers: {
      'apikey': process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query: migrationSQL })
  });

  if (!response.ok) {
    console.log('⚠️  REST API not available\n');
    console.log('📋 Please apply this migration manually in Supabase SQL Editor:\n');
    console.log('─'.repeat(60));
    console.log(migrationSQL);
    console.log('─'.repeat(60));
    console.log('\n📍 Go to: https://supabase.com/dashboard/project/_/sql/new');
  } else {
    const result = await response.json();
    console.log('✅ Migration applied successfully!');
    console.log('Result:', result);
  }

} catch (err) {
  console.log('\n⚠️  Automatic migration failed:', err.message);
  console.log('\n📋 Please apply this migration manually in Supabase SQL Editor:\n');
  console.log('─'.repeat(60));
  console.log(migrationSQL);
  console.log('─'.repeat(60));
  console.log('\n📍 Steps:');
  console.log('1. Go to: https://supabase.com/dashboard/project/_/sql/new');
  console.log('2. Copy the SQL above');
  console.log('3. Paste and run in SQL Editor');
  console.log('4. Come back and run: node scripts/test-memory-service.mjs\n');
}

console.log('\n════════════════════════════════════════════════════════════\n');
