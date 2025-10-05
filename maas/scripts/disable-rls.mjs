import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://fcsxnsjnetrtcxprcpur.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZjc3huc2puZXRydGN4cHJjcHVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkyMjEyODUsImV4cCI6MjA3NDc5NzI4NX0.MmIqCxAobuvYAYrFHBsQnglOofs1sXtAb4yiOyB9_Rk';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function disableRLS() {
  const tables = ['facts', 'thread_summaries', 'decisions', 'links', 'sources', 'maas_metrics', 'snapshot_cache'];

  console.log('🔓 Отключение RLS для учебного проекта MaaS...\n');

  for (const table of tables) {
    try {
      const { error } = await supabase.rpc('exec_sql', {
        sql: `ALTER TABLE ${table} DISABLE ROW LEVEL SECURITY;`
      });

      if (error) {
        console.log(`❌ ${table}: ${error.message}`);
      } else {
        console.log(`✅ ${table}: RLS отключен`);
      }
    } catch (err) {
      console.log(`❌ ${table}: ${err.message}`);
    }
  }

  console.log('\n✅ RLS отключен для всех MaaS таблиц');
  console.log('⚠️  Это учебный проект - в продакшене RLS должен быть включен!\n');
}

disableRLS();
