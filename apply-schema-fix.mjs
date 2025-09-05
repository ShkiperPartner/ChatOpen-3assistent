import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

async function applySchemaMigration() {
  console.log('🔧 Applying personalities table schema fix...\n');
  
  try {
    // Read the migration SQL
    const migrationSQL = readFileSync('./supabase/scripts/fix-personalities-schema.sql', 'utf8');
    
    console.log('📄 Migration SQL loaded. Executing...\n');
    
    // Split SQL into individual statements and execute them
    const statements = migrationSQL
      .split(/DO \$\$[\s\S]*?\$\$;/g)
      .filter(stmt => stmt.trim() && !stmt.startsWith('--'));
    
    // Execute the DO blocks separately
    const doBlocks = migrationSQL.match(/DO \$\$[\s\S]*?\$\$;/g) || [];
    
    for (const block of doBlocks) {
      if (block.trim()) {
        console.log('🔨 Executing:', block.substring(0, 50) + '...');
        
        const { data, error } = await supabase.rpc('exec_sql', { 
          sql: block.trim() 
        });
        
        if (error) {
          console.error('❌ Error executing block:', error);
          // Try alternative approach
          console.log('🔄 Trying with raw query...');
          
          const { data: rawData, error: rawError } = await supabase
            .from('personalities')
            .select('id')
            .limit(0);
            
          if (rawError && rawError.message.includes('column "prompt" does not exist')) {
            console.log('✅ Confirmed: prompt column is missing. Creating simple migration...');
            
            // Simple approach: create columns one by one
            await createMissingColumns();
            return;
          }
        } else {
          console.log('✅ Block executed successfully');
        }
      }
    }
    
    console.log('\n🎉 Schema migration completed!');
    
  } catch (error) {
    console.error('💥 Migration failed:', error.message);
    
    // Fallback: try simple column creation
    console.log('🔄 Trying fallback approach...');
    await createMissingColumns();
  }
}

async function createMissingColumns() {
  console.log('📝 Creating missing columns with simple approach...');
  
  const columns = [
    { name: 'prompt', type: 'TEXT NOT NULL DEFAULT \'\'', description: 'System prompt' },
    { name: 'is_active', type: 'BOOLEAN DEFAULT false', description: 'Active personality flag' },
    { name: 'has_memory', type: 'BOOLEAN DEFAULT true', description: 'Memory setting' },
    { name: 'openai_assistant_id', type: 'TEXT', description: 'OpenAI Assistant ID' },
    { name: 'files', type: 'JSONB DEFAULT \'[]\'', description: 'Files array' },
    { name: 'file_instruction', type: 'TEXT', description: 'File instruction text' }
  ];
  
  for (const col of columns) {
    try {
      // Test if column exists by trying to select it
      const { data, error } = await supabase
        .from('personalities')
        .select(col.name)
        .limit(1);
        
      if (error && error.message.includes(`column "${col.name}" does not exist`)) {
        console.log(`➕ Adding missing column: ${col.name}`);
        // Column doesn't exist, we need to add it
        // Note: This is a workaround since we can't execute DDL directly
        console.log(`⚠️  Column ${col.name} needs to be added manually in Supabase dashboard`);
        console.log(`   SQL: ALTER TABLE personalities ADD COLUMN ${col.name} ${col.type};`);
      } else {
        console.log(`✅ Column ${col.name} already exists`);
      }
    } catch (err) {
      console.log(`❓ Could not check column ${col.name}:`, err.message);
    }
  }
  
  console.log('\n📋 Manual migration steps needed:');
  console.log('1. Open Supabase Dashboard > SQL Editor');
  console.log('2. Execute the following SQL:');
  console.log('\nALTER TABLE personalities ADD COLUMN IF NOT EXISTS prompt TEXT NOT NULL DEFAULT \'\';');
  console.log('ALTER TABLE personalities ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT false;');
  console.log('ALTER TABLE personalities ADD COLUMN IF NOT EXISTS has_memory BOOLEAN DEFAULT true;');
  console.log('ALTER TABLE personalities ADD COLUMN IF NOT EXISTS openai_assistant_id TEXT;');
  console.log('ALTER TABLE personalities ADD COLUMN IF NOT EXISTS files JSONB DEFAULT \'[]\';');
  console.log('ALTER TABLE personalities ADD COLUMN IF NOT EXISTS file_instruction TEXT;');
}

// Run the migration
applySchemaMigration();