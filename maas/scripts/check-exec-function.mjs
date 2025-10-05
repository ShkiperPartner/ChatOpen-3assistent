import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://fcsxnsjnetrtcxprcpur.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZjc3huc2puZXRydGN4cHJjcHVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkyMjEyODUsImV4cCI6MjA3NDc5NzI4NX0.MmIqCxAobuvYAYrFHBsQnglOofs1sXtAb4yiOyB9_Rk';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkExecFunction() {
  console.log('🔍 Checking if exec_sql function exists...\n');

  try {
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: `SELECT 1 as test;`
    });

    if (error) {
      console.log('❌ exec_sql function NOT found');
      console.log('Error:', error.message);
      console.log('\n📝 You need to create it first. Run this SQL in Supabase SQL Editor:');
      console.log(`
CREATE OR REPLACE FUNCTION public.exec_sql(sql text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE sql;
END;
$$;
      `);
    } else {
      console.log('✅ exec_sql function exists and working!');
      console.log('You can now run: node maas/scripts/apply-maas-migration.mjs');
    }
  } catch (err) {
    console.error('❌ Error checking function:', err);
  }
}

checkExecFunction();
