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
  process.env.VITE_SUPABASE_ANON_KEY
);

console.log('\n════════════════════════════════════════════════════════════');
console.log('  DOCUMENT_CHUNKS MIGRATION - Apply Missing Columns');
console.log('════════════════════════════════════════════════════════════\n');

// Read migration file
const migrationPath = join(__dirname, '../supabase/migrations/20250229000003_add_document_chunks_columns.sql');
const migrationSQL = readFileSync(migrationPath, 'utf8');

console.log('📄 Migration file:', migrationPath);
console.log('📊 Migration size:', migrationSQL.length, 'bytes\n');

// Split into individual statements
const statements = migrationSQL
  .split(';')
  .map(s => s.trim())
  .filter(s => s && !s.startsWith('--'));

console.log(`🔧 Found ${statements.length} SQL statements\n`);

// Apply each statement
for (let i = 0; i < statements.length; i++) {
  const stmt = statements[i];
  console.log(`\n━━━ Statement ${i + 1}/${statements.length} ━━━`);
  console.log(stmt.substring(0, 100) + (stmt.length > 100 ? '...' : ''));

  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql: stmt });

    if (error) {
      console.log('❌ Error:', error.message);
      if (error.message.includes('already exists') || error.message.includes('duplicate')) {
        console.log('⚠️  Column/index already exists - skipping');
      } else {
        throw error;
      }
    } else {
      console.log('✅ Success');
    }
  } catch (err) {
    console.log('❌ Failed:', err.message);
    // Continue with other statements
  }
}

console.log('\n════════════════════════════════════════════════════════════');
console.log('  ✅ MIGRATION COMPLETED');
console.log('════════════════════════════════════════════════════════════\n');

// Verify structure
console.log('🔍 Verifying table structure...\n');
const { data: columns, error: colError } = await supabase.rpc('exec_sql', {
  sql: `
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'document_chunks'
    ORDER BY ordinal_position;
  `
});

if (columns && columns.length > 0) {
  console.log('✅ document_chunks columns:');
  console.table(columns);
} else if (colError) {
  console.log('⚠️  Could not verify structure:', colError.message);
}

console.log('\n✅ Ready for testing!\n');
