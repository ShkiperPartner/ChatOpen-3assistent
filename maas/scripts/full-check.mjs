import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://fcsxnsjnetrtcxprcpur.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZjc3huc2puZXRydGN4cHJjcHVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkyMjEyODUsImV4cCI6MjA3NDc5NzI4NX0.MmIqCxAobuvYAYrFHBsQnglOofs1sXtAb4yiOyB9_Rk';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function fullCheck() {
  console.log('🔍 ПОЛНАЯ ПРОВЕРКА SUPABASE БД\n');
  console.log('='.repeat(80));

  // Список таблиц для проверки
  const allTables = [
    // Основные таблицы
    'users',
    'personalities',
    'chats',
    'messages',

    // MaaS таблицы
    'projects',
    'facts',
    'thread_summaries',
    'decisions',
    'links',
    'sources',
    'maas_metrics',
    'snapshot_cache'
  ];

  console.log('\n📋 ПРОВЕРКА СУЩЕСТВОВАНИЯ ТАБЛИЦ:\n');

  const existingTables = [];
  const missingTables = [];

  for (const table of allTables) {
    try {
      const { data, error, count } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });

      if (error) {
        console.log(`❌ ${table.padEnd(25)} - НЕ СУЩЕСТВУЕТ (${error.code})`);
        missingTables.push(table);
      } else {
        console.log(`✅ ${table.padEnd(25)} - существует (записей: ${count || 0})`);
        existingTables.push({ table, count: count || 0 });
      }
    } catch (err) {
      console.log(`❌ ${table.padEnd(25)} - ОШИБКА: ${err.message}`);
      missingTables.push(table);
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log(`\n📊 ИТОГО: ${existingTables.length} таблиц существует, ${missingTables.length} отсутствует\n`);

  // Детальная информация по существующим таблицам
  console.log('='.repeat(80));
  console.log('\n📦 СОДЕРЖИМОЕ ТАБЛИЦ:\n');

  for (const { table, count } of existingTables) {
    if (count > 0) {
      console.log(`\n${table.toUpperCase()} (${count} записей):`);
      console.log('-'.repeat(80));

      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(5);

      if (!error && data) {
        data.forEach((row, i) => {
          console.log(`\n  Запись ${i + 1}:`);

          // Выводим только ключевые поля
          if (table === 'projects') {
            console.log(`    ID: ${row.id}`);
            console.log(`    User ID: ${row.user_id}`);
            console.log(`    Name: ${row.name}`);
            console.log(`    Mission: ${row.mission}`);
            console.log(`    Status: ${row.status}`);
          } else if (table === 'facts') {
            console.log(`    ID: ${row.id}`);
            console.log(`    Project ID: ${row.project_id}`);
            console.log(`    Subject: ${row.subject}`);
            console.log(`    Value: ${JSON.stringify(row.value)}`);
            console.log(`    Level: ${row.level}`);
          } else if (table === 'thread_summaries') {
            console.log(`    ID: ${row.id}`);
            console.log(`    Project ID: ${row.project_id}`);
            console.log(`    Summary: ${row.summary_text?.substring(0, 100)}...`);
          } else if (table === 'decisions') {
            console.log(`    ID: ${row.id}`);
            console.log(`    Decision: ${row.decision_text?.substring(0, 80)}`);
            console.log(`    Type: ${row.decision_type}, Status: ${row.status}`);
          } else if (table === 'links') {
            console.log(`    ID: ${row.id}`);
            console.log(`    ${row.source_type}(${row.source_id}) --[${row.link_type}]--> ${row.target_type}(${row.target_id})`);
            console.log(`    Strength: ${row.strength}`);
          } else if (table === 'sources') {
            console.log(`    ID: ${row.id}`);
            console.log(`    Type: ${row.source_type}`);
            console.log(`    URL: ${row.source_url}`);
            console.log(`    Title: ${row.source_title}`);
          } else if (table === 'maas_metrics') {
            console.log(`    ID: ${row.id}`);
            console.log(`    Type: ${row.metric_type}`);
            console.log(`    Value: ${row.metric_value} ${row.metric_unit || ''}`);
          } else if (table === 'snapshot_cache') {
            console.log(`    ID: ${row.id}`);
            console.log(`    Type: ${row.snapshot_type}`);
            console.log(`    Version: ${row.version}`);
            console.log(`    Size: ${row.size_bytes} bytes`);
          } else {
            // Для остальных таблиц - первые 3 поля
            const keys = Object.keys(row).slice(0, 5);
            keys.forEach(key => {
              const value = typeof row[key] === 'object'
                ? JSON.stringify(row[key]).substring(0, 60)
                : String(row[key]).substring(0, 60);
              console.log(`    ${key}: ${value}`);
            });
          }
        });
      }
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('\n🎯 ФИНАЛЬНАЯ СТАТИСТИКА:\n');

  const maas_tables = existingTables.filter(t =>
    ['facts', 'thread_summaries', 'decisions', 'links', 'sources', 'maas_metrics', 'snapshot_cache'].includes(t.table)
  );

  const manual_tables = existingTables.filter(t =>
    ['projects', 'chats'].includes(t.table)
  );

  const main_tables = existingTables.filter(t =>
    ['users', 'personalities', 'messages'].includes(t.table)
  );

  console.log(`✋ Созданы вручную: ${manual_tables.length} таблиц`);
  manual_tables.forEach(t => console.log(`   - ${t.table} (${t.count} записей)`));

  console.log(`\n🤖 Из миграции MaaS: ${maas_tables.length} таблиц`);
  maas_tables.forEach(t => console.log(`   - ${t.table} (${t.count} записей)`));

  console.log(`\n📋 Основная БД: ${main_tables.length} таблиц`);
  main_tables.forEach(t => console.log(`   - ${t.table} (${t.count} записей)`));

  console.log(`\n🔢 ИТОГО В MAAS: ${manual_tables.length + maas_tables.length} таблиц (${manual_tables.length} вручную + ${maas_tables.length} миграция)`);

  console.log('\n' + '='.repeat(80));
}

fullCheck().catch(console.error);
