# Security Automation Plan

**Дата создания:** 2025-01-31
**Статус:** Planned (для будущей разработки)
**Приоритет:** High (Security - критический аспект)

---

## 🎯 Цель

Создать многоуровневую систему автоматической проверки безопасности кода, которая:
1. Работает по требованию (slash команда `/security`)
2. Автоматически проверяет при git commit (git hooks)
3. Интегрируется в CI/CD pipeline
4. Накапливает знания о специфичных для проекта уязвимостях

---

## 📊 Архитектура решения

### Трёхуровневая защита:

```
┌─────────────────────────────────────────┐
│  Уровень 1: Manual Check                │
│  /security - полный аудит по требованию  │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│  Уровень 2: Git Hooks                   │
│  Pre-commit - быстрая проверка перед     │
│  коммитом (секреты, опасные паттерны)    │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│  Уровень 3: CI/CD Pipeline              │
│  GitHub Actions - полный аудит при PR    │
│  + dependency scanning                   │
└─────────────────────────────────────────┘
```

---

## 🚀 Уровень 1: Slash команда `/security`

### Файл: `.claude/commands/security.md`

**Что проверяет:**

#### 1. OWASP Top 10
- SQL Injection
- XSS (Cross-Site Scripting)
- Authentication/Authorization
- Sensitive Data Exposure
- Security Misconfiguration
- CSRF
- Insecure Dependencies
- API Security

#### 2. Специфично для проекта

**Supabase RLS:**
```sql
-- Проверяет что все таблицы защищены
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND rowsecurity = false;

-- Проверяет наличие policies
SELECT schemaname, tablename, policyname, cmd, qual
FROM pg_policies
WHERE schemaname = 'public';
```

**OpenAI API Security:**
- API keys не в коде
- Транслитерация против prompt injection
- Rate limiting
- Input validation

**Frontend Security:**
- dangerouslySetInnerHTML usage
- localStorage для sensitive data
- User input sanitization

#### 3. Code Patterns Scanning

```bash
# Опасные паттерны
patterns=(
  "eval\("
  "dangerouslySetInnerHTML"
  "innerHTML\s*="
  "password\s*=\s*['\"]"
  "api.*key\s*=\s*['\"]"
  "secret\s*=\s*['\"]"
  "\$\{.*query"
)
```

#### 4. Dependency Audit

```bash
npm audit --json | jq '.vulnerabilities'
```

#### 5. Генерация отчета

**Формат отчета:** `security-audit-YYYY-MM-DD.md`

```markdown
# Security Audit Report

## Summary
- Files checked: N
- Critical issues: X
- Warnings: Y
- Dependencies: Z

## 🔴 Critical Issues
[Список с file:line и описанием]

## ⚠️ Warnings
[Список предупреждений]

## ✅ Passed Checks
[Список успешных проверок]

## 📋 Recommendations
[Конкретные рекомендации]
```

---

## 🔒 Уровень 2: Git Pre-commit Hook

### Файл: `scripts/security-check.sh`

**Быстрые проверки (< 5 сек):**

```bash
#!/bin/bash
# Security Pre-commit Hook

echo "🔒 Running security checks..."

ISSUES=0

# 1. Hardcoded secrets
if git diff --cached | grep -iE "(api[_-]?key|password|secret|token)\s*=\s*['\"][^'\"]+['\"]"; then
    echo "❌ Found hardcoded secrets!"
    ISSUES=$((ISSUES+1))
fi

# 2. .env files in commit
if git diff --cached --name-only | grep -E "\.env$"; then
    echo "❌ .env file in commit!"
    ISSUES=$((ISSUES+1))
fi

# 3. Dangerous patterns
if git diff --cached | grep -E "eval\(|dangerouslySetInnerHTML"; then
    echo "⚠️ Dangerous patterns found"
    ISSUES=$((ISSUES+1))
fi

# 4. Large files (>5MB)
if git diff --cached --name-only | xargs -I{} bash -c 'test -f "{}" && test $(stat -f%z "{}" 2>/dev/null || stat -c%s "{}") -gt 5242880' 2>/dev/null; then
    echo "⚠️ Large file in commit"
fi

if [ $ISSUES -gt 0 ]; then
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "Found $ISSUES security issues!"
    echo "Fix or use --no-verify to skip"
    exit 1
fi

echo "✅ Security checks passed!"
```

### Установка hook:

```bash
# Вариант 1: Husky (рекомендуется)
npm install --save-dev husky
npx husky init
echo "bash scripts/security-check.sh" > .husky/pre-commit
chmod +x .husky/pre-commit

# Вариант 2: Нативный git hook
cp scripts/security-check.sh .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```

---

## 🤖 Уровень 3: CI/CD Pipeline

### GitHub Actions: `.github/workflows/security.yml`

```yaml
name: Security Audit

on:
  pull_request:
    branches: [main, develop]
  push:
    branches: [main]
  schedule:
    # Еженедельная проверка каждый понедельник в 9:00
    - cron: '0 9 * * 1'

jobs:
  security-audit:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      # 1. Dependency Audit
      - name: Audit npm packages
        run: |
          npm audit --audit-level=moderate || true
          npm audit --json > audit-report.json

      # 2. Secret Scanning
      - name: TruffleHog Secret Scan
        uses: trufflesecurity/trufflehog@main
        with:
          path: ./
          base: ${{ github.event.repository.default_branch }}
          head: HEAD

      # 3. Code Scanning (CodeQL)
      - name: Initialize CodeQL
        uses: github/codeql-action/init@v3
        with:
          languages: javascript, typescript

      - name: Perform CodeQL Analysis
        uses: github/codeql-action/analyze@v3

      # 4. Custom Security Checks
      - name: Run custom security checks
        run: bash scripts/security-check.sh

      # 5. Supabase RLS Check
      - name: Check RLS Policies
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_KEY: ${{ secrets.SUPABASE_SERVICE_KEY }}
        run: node scripts/check-rls-policies.js

      # 6. Upload Report
      - name: Upload security report
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: security-audit-report
          path: |
            audit-report.json
            security-report.md
```

---

## 🛠️ Дополнительные инструменты

### Специфичные проверки для проекта

#### 1. RLS Policy Checker

**Файл: `scripts/check-rls-policies.js`**

```javascript
// Проверяет что все таблицы имеют RLS enabled
const { createClient } = require('@supabase/supabase-js');

async function checkRLS() {
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  // Получить все таблицы
  const { data: tables } = await supabase
    .from('pg_tables')
    .select('tablename, rowsecurity')
    .eq('schemaname', 'public');

  const unprotected = tables.filter(t => !t.rowsecurity);

  if (unprotected.length > 0) {
    console.error('❌ Tables without RLS:', unprotected);
    process.exit(1);
  }

  console.log('✅ All tables have RLS enabled');
}

checkRLS();
```

#### 2. OpenAI Prompt Injection Checker

**Файл: `scripts/check-prompt-injection.js`**

```javascript
// Проверяет что все user inputs проходят через транслитерацию
const fs = require('fs');
const path = require('path');

const dangerousPatterns = [
  /openai.*\.create.*\(\{[^}]*name:\s*['"`][^'"`]*\$\{/,  // name: `${var}`
  /openai.*\.create.*\(\{[^}]*instructions:\s*['"`][^'"`]*\$\{/,
];

function scanFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');

  for (const pattern of dangerousPatterns) {
    if (pattern.test(content)) {
      console.error(`❌ Potential prompt injection: ${filePath}`);
      return false;
    }
  }

  return true;
}

// Scan src/ directory
// ...
```

---

## 📋 План реализации

### Phase 1: Basic Security (1-2 дня)
- [ ] Создать `/security` команду с базовыми проверками
- [ ] Добавить проверку на hardcoded secrets
- [ ] Добавить dependency audit
- [ ] Создать генерацию отчета

### Phase 2: Git Hooks (1 день)
- [ ] Создать `scripts/security-check.sh`
- [ ] Настроить Husky
- [ ] Протестировать pre-commit hook
- [ ] Добавить bypass опцию (--no-verify)

### Phase 3: Specialized Checks (2-3 дня)
- [ ] RLS policy checker
- [ ] OpenAI prompt injection scanner
- [ ] Frontend XSS scanner
- [ ] Custom rules для проекта

### Phase 4: CI/CD Integration (2-3 дня)
- [ ] Создать GitHub Actions workflow
- [ ] Интегрировать CodeQL
- [ ] Добавить TruffleHog
- [ ] Настроить scheduled scans
- [ ] PR blocking при critical issues

### Phase 5: Reporting & Monitoring (1-2 дня)
- [ ] Dashboard для security metrics
- [ ] Email notifications при находках
- [ ] Slack integration (опционально)
- [ ] Накопление истории аудитов

---

## 🎯 Success Metrics

**Измеряем эффективность:**
- Количество пойманных уязвимостей до production
- Время на security review (должно сокращаться)
- False positive rate (< 10%)
- Coverage (% покрытия кода проверками)

**Цели:**
- ✅ 0 hardcoded secrets в production
- ✅ 100% таблиц с RLS enabled
- ✅ 0 critical vulnerabilities в dependencies
- ✅ Автоматический security audit при каждом PR

---

## 🔐 Security Checklist для разных частей проекта

### Supabase / Database
- [ ] RLS enabled на всех таблицах
- [ ] RLS policies протестированы
- [ ] Foreign keys правильно настроены
- [ ] Indexes для performance (не security hole)
- [ ] Service key только на backend
- [ ] Anon key для frontend

### OpenAI Integration
- [ ] API key в environment variables
- [ ] Транслитерация для всех user inputs
- [ ] Rate limiting настроен
- [ ] Error messages не раскрывают sensitive info
- [ ] File uploads валидируются (тип, размер)

### Frontend (React/Next.js)
- [ ] User input санитизируется
- [ ] Нет dangerouslySetInnerHTML без DOMPurify
- [ ] localStorage минимален для sensitive data
- [ ] CORS правильно настроен
- [ ] CSP headers настроены

### API Routes
- [ ] Аутентификация на всех protected routes
- [ ] Authorization проверки
- [ ] Input validation
- [ ] Rate limiting
- [ ] CORS настроен

### Dependencies
- [ ] npm audit без critical issues
- [ ] Регулярные обновления
- [ ] Lock файлы в репозитории
- [ ] Проверка supply chain attacks

---

## 📚 Resources & Documentation

### Tools
- **TruffleHog** - secret scanning
- **CodeQL** - code analysis
- **npm audit** - dependency vulnerabilities
- **ESLint security plugin** - code patterns
- **OWASP ZAP** - penetration testing (будущее)

### Best Practices
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Supabase Security Best Practices](https://supabase.com/docs/guides/auth/row-level-security)
- [OpenAI Safety Best Practices](https://platform.openai.com/docs/guides/safety-best-practices)

---

## 🚦 Current Status

**Phase:** Planning
**Next Steps:**
1. Создать `/security` команду (Phase 1)
2. Протестировать на текущем коде
3. Собрать feedback
4. Итерация и улучшение

**Blocked by:** Нет
**Dependencies:** Husky (для git hooks), GitHub Actions (для CI/CD)

---

## 💡 Future Ideas

### Продвинутые возможности:
- **ML-based vulnerability detection** - обучить модель на нашем коде
- **Security knowledge base** - накопление специфичных для проекта правил
- **Auto-fix suggestions** - не только находить, но и предлагать fixes
- **Penetration testing integration** - автоматический pen-test
- **Security score tracking** - метрика безопасности проекта

### Интеграция с AI Partnership OS (Phase 3+):
- **Security Assistant** - специализированный AI для security review
- **Threat modeling** - автоматическое построение threat models
- **Compliance checking** - GDPR, SOC2, etc.

---

## 📝 Notes

**Почему не "постоянно работающий агент":**
Claude Code агенты работают по запросу, а не как background daemon. Это:
- ✅ Более эффективно (не тратит ресурсы постоянно)
- ✅ Более контролируемо (запускаешь когда нужно)
- ✅ Интегрируется в workflow (commit → hook → check)

**Git hooks + CI/CD = квази-постоянная защита:**
- Git hook проверяет ДО commit
- CI/CD проверяет ДО merge
- Scheduled runs проверяют периодически
- Manual `/security` для полного аудита

Это покрывает 99% сценариев, когда нужна security проверка.

---

*Документ создан: 2025-01-31*
*Последнее обновление: 2025-01-31*
*Статус: Ready for implementation*
