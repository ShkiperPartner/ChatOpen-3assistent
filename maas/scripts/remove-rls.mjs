import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const inputPath = join(__dirname, '../migrations/20250205000000_add_maas_tables.sql');
const outputPath = join(__dirname, '../migrations/20250205000001_add_maas_tables_no_rls.sql');

const content = readFileSync(inputPath, 'utf-8');
const lines = content.split('\n');

const result = [];
let skipUntil = null;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const trimmed = line.trim();

  // Начало RLS секции
  if (trimmed.startsWith('-- RLS for')) {
    // Пропускаем до следующей секции (начинается с --)
    skipUntil = 'next-section';
    continue;
  }

  // Если пропускаем RLS
  if (skipUntil === 'next-section') {
    // Продолжаем пропускать пока не встретим новую секцию
    if (trimmed.startsWith('--') && !trimmed.includes('RLS') && !trimmed.includes('POLICY')) {
      // Нашли следующую секцию
      skipUntil = null;
      result.push(line);
    }
    continue;
  }

  // ALTER TABLE ENABLE ROW LEVEL SECURITY
  if (trimmed.match(/ALTER TABLE.*ENABLE ROW LEVEL SECURITY/i)) {
    continue;
  }

  // CREATE POLICY
  if (trimmed.match(/CREATE POLICY/i)) {
    // Пропускаем всю policy (может быть многострочной)
    skipUntil = 'policy-end';
    continue;
  }

  if (skipUntil === 'policy-end') {
    if (trimmed.endsWith(');')) {
      skipUntil = null;
    }
    continue;
  }

  result.push(line);
}

const output = result.join('\n');
writeFileSync(outputPath, output, 'utf-8');

console.log('✅ Создан файл миграции без RLS политик:');
console.log(`   ${outputPath}`);
