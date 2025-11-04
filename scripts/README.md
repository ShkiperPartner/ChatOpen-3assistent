# Security Scripts

Коллекция скриптов для автоматической проверки безопасности проекта.

## 📁 Файлы

### `check-rls-policies.js`
Проверяет что все таблицы Supabase имеют Row Level Security (RLS) enabled и настроенные policies.

**Использование:**
```bash
# С credentials
SUPABASE_URL=xxx SUPABASE_SERVICE_KEY=xxx node scripts/check-rls-policies.js

# Без credentials (graceful skip в CI)
node scripts/check-rls-policies.js
```

**Что проверяет:**
- ✅ RLS enabled на всех таблицах
- ✅ Наличие хотя бы одной policy на таблицу
- ✅ Список policies с типами (SELECT/INSERT/UPDATE/DELETE)

**Выход:**
- `0` - все проверки пройдены
- `1` - найдены проблемы с RLS

---

### `check-prompt-injection.js`
Сканирует код на потенциальные уязвимости prompt injection для OpenAI API.

**Использование:**
```bash
node scripts/check-prompt-injection.js
```

**Что проверяет:**
- 🔴 HIGH: User input напрямую в OpenAI API без транслитерации
- 🔴 HIGH: Кириллица в именах ассистентов
- 🟡 MEDIUM: Template strings с user variables в prompts
- 🟡 MEDIUM: String concatenation с user input
- ✅ Наличие безопасных практик (transliterate, sanitize, validate)

**Выход:**
- `0` - безопасно или только warnings
- `1` - найдены HIGH severity проблемы

---

## 🚀 GitHub Actions

Скрипты автоматически запускаются в CI/CD pipeline:
- `.github/workflows/security.yml` - основной security workflow

**Триггеры:**
- Pull requests в main/develop
- Push в main
- Еженедельно (понедельник 9:00 UTC)
- Вручную через `workflow_dispatch`

---

## 🔧 Локальное тестирование

```bash
# Установить зависимости
npm install

# Запустить все проверки
npm run lint
npm audit
node scripts/check-prompt-injection.js
node scripts/check-rls-policies.js  # требует SUPABASE credentials

# Исправить автоматически
npm audit fix
```

---

## 📊 Интеграция в workflow

### Pre-commit hook (будущее)
```bash
# .husky/pre-commit
node scripts/check-prompt-injection.js
```

### Manual security audit
```bash
# Будущая slash команда
/security
```

---

## 🛠️ Расширение скриптов

### Добавить новую проверку

1. Создать файл `check-something.js`
2. Добавить в `.github/workflows/security.yml`:
   ```yaml
   - name: Check something
     run: node scripts/check-something.js
   ```
3. Обновить этот README

### Шаблон скрипта:
```javascript
#!/usr/bin/env node

// 1. Импорты
import fs from 'fs';

// 2. Константы
const SEVERITY = { HIGH: 'HIGH', MEDIUM: 'MEDIUM', LOW: 'LOW' };

// 3. Логика проверки
function check() {
  // ваша проверка

  if (hasIssues) {
    console.error('❌ Found issues');
    process.exit(1);
  }

  console.log('✅ Check passed');
  process.exit(0);
}

// 4. Запуск
check();
```

---

## 📚 Документация

См. также:
- [SECURITY_AUTOMATION_PLAN.md](../SECURITY_AUTOMATION_PLAN.md) - полный план security automation
- [.github/workflows/security.yml](../.github/workflows/security.yml) - CI/CD конфигурация
- [PROJECT_ARCHITECTURE.md](../PROJECT_ARCHITECTURE.md) - архитектура проекта

---

## 🐛 Troubleshooting

### `check-rls-policies.js` fails with "permission denied"
- Убедитесь что используете SUPABASE_SERVICE_KEY (не anon key)
- Проверьте что ключ имеет права на pg_tables/pg_policies

### `check-prompt-injection.js` shows false positives
- Это нормально для первой версии
- Паттерны можно уточнить в будущих итерациях
- MEDIUM warnings можно игнорировать если уверены в безопасности

### GitHub Actions workflow fails
- Проверьте что secrets настроены: SUPABASE_URL, SUPABASE_SERVICE_KEY
- Убедитесь что все скрипты executable: `chmod +x scripts/*.js`
- Проверьте логи workflow в GitHub Actions tab

---

**Last updated:** 2025-01-31
**Version:** 1.0.0
