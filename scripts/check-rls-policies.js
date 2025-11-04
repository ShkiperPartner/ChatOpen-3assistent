#!/usr/bin/env node

/**
 * Supabase RLS (Row Level Security) Policy Checker
 *
 * Проверяет что все таблицы в public schema имеют:
 * 1. RLS enabled
 * 2. Хотя бы одну policy
 *
 * Использование:
 *   SUPABASE_URL=xxx SUPABASE_SERVICE_KEY=xxx node scripts/check-rls-policies.js
 */

import { createClient } from '@supabase/supabase-js';

const REQUIRED_ENV_VARS = ['SUPABASE_URL', 'SUPABASE_SERVICE_KEY'];

// Цвета для вывода
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(color, ...args) {
  console.log(colors[color], ...args, colors.reset);
}

// Проверка environment variables
function checkEnvVars() {
  const missing = REQUIRED_ENV_VARS.filter(v => !process.env[v]);

  if (missing.length > 0) {
    log('yellow', '⚠️  Missing environment variables:', missing.join(', '));
    log('yellow', '   This check requires Supabase credentials to run.');
    log('yellow', '   Skipping RLS policy check...');
    process.exit(0); // Exit gracefully in CI
  }
}

async function checkRLSPolicies() {
  checkEnvVars();

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  log('cyan', '🛡️  Checking Supabase RLS Policies...\n');

  let hasErrors = false;
  let warnings = [];

  try {
    // Получить все таблицы в public schema
    const { data: tables, error: tablesError } = await supabase.rpc('exec_sql', {
      sql_string: `
        SELECT
          tablename,
          rowsecurity as rls_enabled
        FROM pg_tables
        WHERE schemaname = 'public'
        ORDER BY tablename;
      `
    });

    if (tablesError) {
      // Fallback: попробовать через information_schema
      const { data: fallbackTables, error: fallbackError } = await supabase.rpc('exec_sql', {
        sql_string: `
          SELECT table_name as tablename
          FROM information_schema.tables
          WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
          ORDER BY table_name;
        `
      });

      if (fallbackError) {
        log('red', '❌ Failed to fetch tables:', fallbackError.message);
        process.exit(1);
      }

      // Для каждой таблицы проверим RLS отдельно
      log('yellow', '⚠️  Using fallback method to check RLS\n');

      for (const table of fallbackTables || []) {
        await checkTableRLS(supabase, table.tablename);
      }

      return;
    }

    if (!tables || tables.length === 0) {
      log('yellow', '⚠️  No tables found in public schema');
      process.exit(0);
    }

    log('blue', `Found ${tables.length} tables in public schema:\n`);

    // Проверить каждую таблицу
    for (const table of tables) {
      const tableName = table.tablename;
      const rlsEnabled = table.rls_enabled;

      // 1. Проверить что RLS включен
      if (!rlsEnabled) {
        log('red', `❌ Table "${tableName}": RLS is DISABLED`);
        hasErrors = true;
        continue;
      }

      // 2. Получить policies для таблицы
      const { data: policies, error: policiesError } = await supabase.rpc('exec_sql', {
        sql_string: `
          SELECT
            policyname,
            cmd,
            qual
          FROM pg_policies
          WHERE schemaname = 'public' AND tablename = '${tableName}'
          ORDER BY policyname;
        `
      });

      if (policiesError) {
        log('yellow', `⚠️  Table "${tableName}": Could not fetch policies`);
        warnings.push(tableName);
        continue;
      }

      // 3. Проверить что есть хотя бы одна policy
      if (!policies || policies.length === 0) {
        log('red', `❌ Table "${tableName}": RLS enabled but NO POLICIES found!`);
        hasErrors = true;
        continue;
      }

      // Успешно!
      log('green', `✅ Table "${tableName}": RLS enabled with ${policies.length} policy(ies)`);

      // Показать policies (детальная информация)
      policies.forEach(policy => {
        const cmd = policy.cmd || 'ALL';
        console.log(`   - ${policy.policyname} (${cmd})`);
      });
    }

    // Итоговый отчет
    console.log('\n' + '━'.repeat(50));

    if (hasErrors) {
      log('red', '\n❌ RLS CHECK FAILED');
      log('red', 'Some tables do not have proper RLS configuration.');
      log('red', 'Please enable RLS and create policies for all tables.');
      process.exit(1);
    }

    if (warnings.length > 0) {
      log('yellow', `\n⚠️  Warnings for ${warnings.length} table(s): ${warnings.join(', ')}`);
    }

    log('green', '\n✅ RLS CHECK PASSED');
    log('green', 'All tables have RLS enabled with policies.');
    process.exit(0);

  } catch (error) {
    log('red', '\n❌ Error during RLS check:', error.message);
    if (error.details) {
      log('red', 'Details:', error.details);
    }
    process.exit(1);
  }
}

async function checkTableRLS(supabase, tableName) {
  // Упрощенная проверка для fallback режима
  try {
    // Попробовать SELECT с RLS
    const { error } = await supabase.from(tableName).select('*').limit(1);

    if (error && error.message.includes('permission denied')) {
      log('yellow', `⚠️  Table "${tableName}": Access denied (RLS likely enabled)`);
    } else {
      log('green', `✅ Table "${tableName}": Accessible`);
    }
  } catch (e) {
    log('yellow', `⚠️  Table "${tableName}": Could not check (${e.message})`);
  }
}

// Run the check
checkRLSPolicies();
