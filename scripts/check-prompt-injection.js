#!/usr/bin/env node

/**
 * OpenAI Prompt Injection Security Checker
 *
 * Проверяет код на потенциальные уязвимости prompt injection:
 * 1. User input напрямую в OpenAI API без валидации
 * 2. Template strings с переменными в system prompts
 * 3. Отсутствие транслитерации для имён ассистентов
 *
 * Использование:
 *   node scripts/check-prompt-injection.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

// Опасные паттерны для поиска
const DANGEROUS_PATTERNS = [
  {
    name: 'Direct variable interpolation in name',
    pattern: /openai.*\.(assistants\.create|assistants\.update).*name:\s*['"`]?\$\{[^}]+\}['"`]?/s,
    severity: 'HIGH',
    description: 'User input in assistant name without transliteration',
  },
  {
    name: 'Direct variable interpolation in instructions',
    pattern: /openai.*\.(assistants\.create|assistants\.update).*instructions:\s*['"`][^'"`]*\$\{[^}]+\}/s,
    severity: 'HIGH',
    description: 'User input in system instructions without validation',
  },
  {
    name: 'Template string in prompt',
    pattern: /prompt.*=.*`[^`]*\$\{.*user|message|input/i,
    severity: 'MEDIUM',
    description: 'User input in template string (potential injection)',
  },
  {
    name: 'Concatenation with user input',
    pattern: /(prompt|instructions|system).*\+.*(user|message|input|content)/i,
    severity: 'MEDIUM',
    description: 'String concatenation with user input',
  },
  {
    name: 'Missing transliterate for Cyrillic',
    pattern: /name:\s*[^,\n]*[а-яА-ЯёЁ]/,
    severity: 'HIGH',
    description: 'Cyrillic characters in name field (OpenAI will reject)',
  },
];

// Паттерны безопасных практик
const SAFE_PATTERNS = [
  /transliterate\(/,
  /sanitize\(/,
  /validate\(/,
  /DOMPurify/,
];

const results = {
  filesScanned: 0,
  issues: [],
  warnings: [],
  safe: [],
};

/**
 * Сканировать файл на опасные паттерны
 */
function scanFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const relativePath = path.relative(process.cwd(), filePath);

  results.filesScanned++;

  // Проверить на опасные паттерны
  for (const { name, pattern, severity, description } of DANGEROUS_PATTERNS) {
    const matches = content.match(pattern);

    if (matches) {
      const lines = content.substring(0, matches.index).split('\n');
      const lineNumber = lines.length;

      results.issues.push({
        file: relativePath,
        line: lineNumber,
        severity,
        pattern: name,
        description,
        snippet: matches[0].substring(0, 100),
      });
    }
  }

  // Проверить на безопасные практики
  for (const safePattern of SAFE_PATTERNS) {
    if (safePattern.test(content)) {
      results.safe.push({
        file: relativePath,
        pattern: safePattern.toString(),
      });
    }
  }
}

/**
 * Рекурсивно сканировать директорию
 */
function scanDirectory(dir, extensions = ['.ts', '.tsx', '.js', '.jsx']) {
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      // Пропустить node_modules и другие служебные директории
      if (['node_modules', '.git', 'dist', 'build'].includes(file)) {
        continue;
      }
      scanDirectory(filePath, extensions);
    } else if (stat.isFile()) {
      const ext = path.extname(file);
      if (extensions.includes(ext)) {
        scanFile(filePath);
      }
    }
  }
}

/**
 * Вывести отчет
 */
function printReport() {
  log('cyan', '\n🤖 OpenAI Security Check Results\n');
  log('blue', `Files scanned: ${results.filesScanned}`);

  // Критические и высокие проблемы
  const highSeverity = results.issues.filter(i => i.severity === 'HIGH');
  const mediumSeverity = results.issues.filter(i => i.severity === 'MEDIUM');

  if (highSeverity.length > 0) {
    log('red', `\n❌ Found ${highSeverity.length} HIGH severity issue(s):\n`);

    highSeverity.forEach((issue, idx) => {
      console.log(`${idx + 1}. ${issue.file}:${issue.line}`);
      log('red', `   [${issue.severity}] ${issue.pattern}`);
      console.log(`   ${issue.description}`);
      console.log(`   Snippet: ${issue.snippet}...\n`);
    });
  }

  if (mediumSeverity.length > 0) {
    log('yellow', `\n⚠️  Found ${mediumSeverity.length} MEDIUM severity issue(s):\n`);

    mediumSeverity.forEach((issue, idx) => {
      console.log(`${idx + 1}. ${issue.file}:${issue.line}`);
      log('yellow', `   [${issue.severity}] ${issue.pattern}`);
      console.log(`   ${issue.description}\n`);
    });
  }

  // Безопасные практики
  if (results.safe.length > 0) {
    log('green', `\n✅ Found ${results.safe.length} instance(s) of safe practices`);
    const uniqueFiles = [...new Set(results.safe.map(s => s.file))];
    uniqueFiles.forEach(file => {
      console.log(`   - ${file}`);
    });
  }

  // Итоговый вердикт
  console.log('\n' + '━'.repeat(60));

  if (highSeverity.length > 0) {
    log('red', '\n❌ SECURITY CHECK FAILED');
    log('red', 'Found HIGH severity issues that must be fixed.');
    log('red', '\nRecommendations:');
    console.log('  1. Use transliterate() for all assistant names');
    console.log('  2. Validate/sanitize user input before OpenAI API');
    console.log('  3. Avoid template strings with user variables in prompts');
    process.exit(1);
  }

  if (mediumSeverity.length > 0) {
    log('yellow', '\n⚠️  SECURITY CHECK PASSED WITH WARNINGS');
    log('yellow', 'Consider addressing MEDIUM severity issues.');
    process.exit(0);
  }

  log('green', '\n✅ SECURITY CHECK PASSED');
  log('green', 'No prompt injection vulnerabilities detected.');
  process.exit(0);
}

// Специфичные проверки для проекта
function checkProjectSpecific() {
  log('cyan', '🔍 Running project-specific checks...\n');

  // Проверить что transliterate функция существует
  const openaiLibPath = path.join(process.cwd(), 'src', 'lib', 'openai.ts');

  if (fs.existsSync(openaiLibPath)) {
    const content = fs.readFileSync(openaiLibPath, 'utf8');

    if (!content.includes('transliterate')) {
      results.issues.push({
        file: 'src/lib/openai.ts',
        line: 0,
        severity: 'HIGH',
        pattern: 'Missing transliterate function',
        description: 'OpenAI service should have transliterate function for Cyrillic names',
      });
      log('red', '❌ Missing transliterate function in openai.ts');
    } else {
      log('green', '✅ Found transliterate function in openai.ts');
    }

    // Проверить что createAssistant использует транслитерацию
    if (content.includes('createAssistant') && !content.match(/transliterate.*name/)) {
      results.issues.push({
        file: 'src/lib/openai.ts',
        line: 0,
        severity: 'HIGH',
        pattern: 'createAssistant without transliteration',
        description: 'createAssistant should transliterate name parameter',
      });
      log('red', '❌ createAssistant does not use transliterate for name');
    } else {
      log('green', '✅ createAssistant properly uses transliteration');
    }
  } else {
    log('yellow', '⚠️  Could not find src/lib/openai.ts');
  }
}

// Main
function main() {
  log('cyan', '═'.repeat(60));
  log('cyan', '  OpenAI Prompt Injection Security Scanner');
  log('cyan', '═'.repeat(60));

  const srcDir = path.join(process.cwd(), 'src');

  if (!fs.existsSync(srcDir)) {
    log('red', '❌ Source directory not found: src/');
    process.exit(1);
  }

  // Сканировать все файлы в src/
  log('blue', '\nScanning source files...\n');
  scanDirectory(srcDir);

  // Специфичные проверки для проекта
  checkProjectSpecific();

  // Вывести отчет
  printReport();
}

main();
