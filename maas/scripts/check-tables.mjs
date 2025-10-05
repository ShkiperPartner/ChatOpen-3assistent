import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://fcsxnsjnetrtcxprcpur.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZjc3huc2puZXRydGN4cHJjcHVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkyMjEyODUsImV4cCI6MjA3NDc5NzI4NX0.MmIqCxAobuvYAYrFHBsQnglOofs1sXtAb4yiOyB9_Rk';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkTables() {
  console.log('🔍 Checking existing tables in Supabase...\n');

  try {
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;`
    });

    if (error) {
      console.error('❌ Error:', error);
    } else {
      console.log('✅ Query executed (but exec_sql returns void)');
      console.log('\nNote: exec_sql function does not return data.');
      console.log('Please check your Supabase dashboard Table Editor to see existing tables.');
    }
  } catch (err) {
    console.error('❌ Error:', err);
  }
}

checkTables();
