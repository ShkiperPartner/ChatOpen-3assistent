import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://fcsxnsjnetrtcxprcpur.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZjc3huc2puZXRydGN4cHJjcHVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkyMjEyODUsImV4cCI6MjA3NDc5NzI4NX0.MmIqCxAobuvYAYrFHBsQnglOofs1sXtAb4yiOyB9_Rk';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function listAllTables() {
  try {
    console.log('🔍 Получение списка всех таблиц MaaS в Supabase...\n');

    // Получаем список таблиц через прямой запрос
    const { data, error } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .order('table_name');

    if (error) {
      // Альтернативный способ - через rpc
      console.log('⚠️  Прямой запрос не работает, попробуем через SQL...\n');

      // Просто проверим каждую таблицу отдельно
      const maas_tables = [
        'projects',
        'chats',
        'facts',
        'thread_summaries',
        'decisions',
        'links',
        'sources',
        'maas_metrics',
        'snapshot_cache'
      ];

      console.log('📋 Проверка существования таблиц MaaS:\n');

      for (const table of maas_tables) {
        const { data, error } = await supabase
          .from(table)
          .select('count')
          .limit(0);

        if (error) {
          console.log(`❌ ${table.padEnd(20)} - НЕ СУЩЕСТВУЕТ`);
        } else {
          console.log(`✅ ${table.padEnd(20)} - существует`);
        }
      }
    } else {
      console.log('Таблицы в public schema:');
      data.forEach(row => console.log(`  - ${row.table_name}`));
    }

  } catch (err) {
    console.error('❌ Ошибка:', err.message);
  }
}

listAllTables();
