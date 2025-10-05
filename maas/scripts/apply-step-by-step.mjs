import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const supabaseUrl = 'https://fcsxnsjnetrtcxprcpur.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZjc3huc2puZXRydGN4cHJjcHVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkyMjEyODUsImV4cCI6MjA3NDc5NzI4NX0.MmIqCxAobuvYAYrFHBsQnglOofs1sXtAb4yiOyB9_Rk';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Функция для парсинга SQL команд
function parseSQLCommands(sql) {
  const commands = [];
  let currentCommand = '';
  let inFunction = false;
  let dollarQuoteTag = null;

  const lines = sql.split('\n');

  for (let line of lines) {
    // Пропускаем пустые строки и комментарии
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('--')) {
      continue;
    }

    // Проверяем начало функции
    if (trimmed.match(/CREATE\s+(OR\s+REPLACE\s+)?FUNCTION/i)) {
      inFunction = true;
    }

    // Проверяем dollar quote
    const dollarMatch = trimmed.match(/\$([a-zA-Z]*)\$/);
    if (dollarMatch) {
      if (!dollarQuoteTag) {
        dollarQuoteTag = dollarMatch[0];
      } else if (dollarMatch[0] === dollarQuoteTag) {
        dollarQuoteTag = null;
        if (trimmed.endsWith(';')) {
          currentCommand += line + '\n';
          commands.push(currentCommand.trim());
          currentCommand = '';
          inFunction = false;
          continue;
        }
      }
    }

    currentCommand += line + '\n';

    // Если не внутри функции и строка заканчивается на ;
    if (!inFunction && !dollarQuoteTag && trimmed.endsWith(';')) {
      commands.push(currentCommand.trim());
      currentCommand = '';
    }
  }

  // Добавляем последнюю команду если есть
  if (currentCommand.trim()) {
    commands.push(currentCommand.trim());
  }

  return commands;
}

async function applyMigration() {
  try {
    console.log('🚀 Начинаем применение MaaS миграции...\n');

    // Читаем файл миграции (версия без RLS для учебного проекта)
    const migrationPath = join(__dirname, '../migrations/20250205000001_add_maas_tables_no_rls.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');

    console.log('📝 Парсинг SQL команд...\n');
    const commands = parseSQLCommands(migrationSQL);
    console.log(`✅ Найдено ${commands.length} SQL команд\n`);

    let step = 0;
    let createdTables = [];

    for (const command of commands) {
      step++;

      // Определяем тип команды
      let commandType = 'SQL';
      let commandDesc = '';

      if (command.match(/CREATE EXTENSION/i)) {
        commandType = '🔧 Extension';
        commandDesc = 'uuid-ossp';
      } else if (command.match(/CREATE TABLE.*facts/i)) {
        commandType = '📋 Table';
        commandDesc = 'facts';
        createdTables.push('facts');
      } else if (command.match(/CREATE TABLE.*thread_summaries/i)) {
        commandType = '📋 Table';
        commandDesc = 'thread_summaries';
        createdTables.push('thread_summaries');
      } else if (command.match(/CREATE TABLE.*decisions/i)) {
        commandType = '📋 Table';
        commandDesc = 'decisions';
        createdTables.push('decisions');
      } else if (command.match(/CREATE TABLE.*links/i)) {
        commandType = '📋 Table';
        commandDesc = 'links';
        createdTables.push('links');
      } else if (command.match(/CREATE TABLE.*sources/i)) {
        commandType = '📋 Table';
        commandDesc = 'sources';
        createdTables.push('sources');
      } else if (command.match(/CREATE TABLE.*maas_metrics/i)) {
        commandType = '📋 Table';
        commandDesc = 'maas_metrics';
        createdTables.push('maas_metrics');
      } else if (command.match(/CREATE TABLE.*snapshot_cache/i)) {
        commandType = '📋 Table';
        commandDesc = 'snapshot_cache';
        createdTables.push('snapshot_cache');
      } else if (command.match(/CREATE INDEX/i)) {
        commandType = '🔍 Index';
        const match = command.match(/CREATE INDEX\s+(\w+)/i);
        commandDesc = match ? match[1] : '';
      } else if (command.match(/ALTER TABLE.*ENABLE ROW LEVEL SECURITY/i)) {
        commandType = '🔒 RLS';
        const match = command.match(/ALTER TABLE\s+(\w+)/i);
        commandDesc = match ? `Enable on ${match[1]}` : '';
      } else if (command.match(/CREATE POLICY/i)) {
        commandType = '🔐 Policy';
        const match = command.match(/ON\s+(\w+)/i);
        commandDesc = match ? `on ${match[1]}` : '';
      } else if (command.match(/CREATE.*FUNCTION.*cleanup_expired/i)) {
        commandType = '⚙️  Function';
        commandDesc = 'cleanup_expired_snapshots';
      } else if (command.match(/CREATE.*FUNCTION.*update_updated_at/i)) {
        commandType = '⚙️  Function';
        commandDesc = 'update_updated_at_column';
      } else if (command.match(/CREATE TRIGGER/i)) {
        commandType = '⚡ Trigger';
        const match = command.match(/CREATE TRIGGER\s+(\w+)/i);
        commandDesc = match ? match[1] : '';
      } else if (command.match(/DROP TRIGGER/i)) {
        commandType = '🗑️  Drop';
        const match = command.match(/DROP TRIGGER\s+(\w+)/i);
        commandDesc = match ? match[1] : '';
      } else if (command.match(/COMMENT ON/i)) {
        commandType = '💬 Comment';
      }

      const displayDesc = commandDesc ? ` (${commandDesc})` : '';
      process.stdout.write(`[${step}/${commands.length}] ${commandType}${displayDesc}...`);

      try {
        const { error } = await supabase.rpc('exec_sql', { sql: command });

        if (error) {
          // Игнорируем некоторые ожидаемые ошибки
          if (error.message.includes('already exists')) {
            console.log(' ⚠️  Already exists');
            continue;
          }
          throw error;
        }

        console.log(' ✅');

        // Небольшая задержка между командами
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        console.log(' ❌');
        console.error(`\n⛔ Ошибка в команде ${step}:`);
        console.error(error.message);
        console.error('\nКоманда:', command.substring(0, 200) + '...\n');
        throw error;
      }
    }

    console.log('\n🎉 Миграция успешно применена!\n');
    console.log('✅ Созданные таблицы:');
    createdTables.forEach(table => console.log(`   ✓ ${table}`));

    // Проверяем созданные таблицы
    console.log('\n🔍 Проверка созданных таблиц...\n');

    const tables = ['facts', 'thread_summaries', 'decisions', 'links', 'sources', 'maas_metrics', 'snapshot_cache'];

    for (const table of tables) {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });

      if (error) {
        console.log(`❌ ${table}: ошибка - ${error.message}`);
      } else {
        console.log(`✅ ${table}: таблица существует (записей: ${count || 0})`);
      }
    }

    console.log('\n🎯 MaaS структура готова к использованию!');
    console.log('\n📚 Следующие шаги:');
    console.log('   1. Создайте проект: см. maas/APPLY_MIGRATION.md');
    console.log('   2. Изучите структуру: используйте maas/STEP_4_QUERIES.sql');
    console.log('   3. Добавьте тестовые данные\n');

  } catch (error) {
    console.error('\n💥 Ошибка миграции:', error.message);
    process.exit(1);
  }
}

applyMigration();
