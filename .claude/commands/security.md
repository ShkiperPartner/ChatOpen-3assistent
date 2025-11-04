---
description: Провести аудит безопасности кода
---

Проведи комплексный security audit проекта с использованием автоматических скриптов и генерацией детального отчета.

**ВАЖНО: Security - критический аспект. Проверяй тщательно!**

---

## 🚀 Быстрый старт

```bash
# 1. Запустить автоматические проверки
npm audit
node scripts/check-prompt-injection.js
node scripts/check-rls-policies.js  # требует SUPABASE credentials

# 2. Проанализировать результаты
# 3. Сгенерировать отчет security-audit-YYYY-MM-DD.md
```

---

## 📋 Автоматические проверки

### 1. Dependency Vulnerabilities
```bash
npm audit --audit-level=moderate
```
Проверяет известные уязвимости в зависимостях.

### 2. OpenAI Prompt Injection
```bash
node scripts/check-prompt-injection.js
```
Ищет:
- User input без транслитерации в OpenAI API
- Кириллицу в assistant names
- Template strings с user variables
- Конкатенацию с user input

### 3. Supabase RLS Policies
```bash
# Требует: SUPABASE_URL и SUPABASE_SERVICE_KEY
node scripts/check-rls-policies.js
```
Проверяет:
- RLS enabled на всех таблицах
- Наличие policies
- Корректность ограничений доступа

---

## 🔍 Ручные проверки

### OWASP Top 10

#### A01: Broken Access Control
**Проверить:**
- [ ] Все таблицы Supabase имеют RLS enabled
- [ ] RLS policies корректные (user видит только свои данные)
- [ ] Нет публичных таблиц без ограничений
- [ ] auth.uid() используется правильно

**Команды:**
```bash
node scripts/check-rls-policies.js
```

#### A02: Cryptographic Failures
**Проверить:**
- [ ] API keys в .env (не в коде)
- [ ] .env в .gitignore
- [ ] Нет secrets в git history
- [ ] Sensitive data не в localStorage без шифрования

**Команды:**
```bash
grep -r -i -E "(api[_-]?key|password|secret|token)\s*[:=]\s*['\"][^'\"]{10,}" src/
git ls-files | grep "\.env$"
```

#### A03: Injection
**Проверить:**
- [ ] OpenAI names транслитерируются
- [ ] User prompts санитизируются
- [ ] Нет raw SQL с string interpolation
- [ ] Supabase client используется для всех queries

**Команды:**
```bash
node scripts/check-prompt-injection.js
grep -r "query.*\${" src/
```

#### A04: Insecure Design
**Архитектурные решения:**
- [ ] Files в OpenAI (не Supabase Storage) ✅
- [ ] API keys на client-side - приемлемо для desktop
- [ ] Rate limiting настроен
- [ ] Error messages не раскрывают secrets

#### A05: Security Misconfiguration
**Проверить:**
- [ ] .env.example существует
- [ ] .env в .gitignore
- [ ] Environment variables documented
- [ ] Нет debug в production

```bash
cat .env.example
grep "\.env" .gitignore
```

#### A06: Vulnerable Components
**Проверить:**
```bash
npm audit
npm outdated
```
Анализируй severity и возможность обновления.

#### A07: Authentication Failures
**Supabase Auth:**
- [ ] Password policies
- [ ] Email verification (если нужно)
- [ ] Session timeout
- [ ] Secure session storage

#### A08: Data Integrity Failures
**Проверить:**
- [ ] File uploads валидируются (тип, размер)
- [ ] Database constraints настроены
- [ ] Foreign keys правильные
- [ ] JSON parsing защищен

#### A09: Logging & Monitoring
**Проверить:**
- [ ] Errors логируются безопасно
- [ ] Нет console.log с secrets
- [ ] Security events отслеживаются

#### A10: SSRF
**Проверить:**
- [ ] URL validation для fetch
- [ ] Whitelist для external APIs
- [ ] OpenAI calls через official SDK

---

## 🎯 Специфичные проверки проекта

### OpenAI Integration
```bash
node scripts/check-prompt-injection.js
```

**Вручную проверить:**
- [ ] transliterate() используется в createAssistant
- [ ] User prompts не модифицируют system instructions
- [ ] File validation перед upload
- [ ] Rate limiting для API

**Файлы:**
- `src/lib/openai.ts` - основной сервис
- `src/store/useStore.ts` - API calls

### Supabase Security
```bash
node scripts/check-rls-policies.js
```

**Критичные таблицы:**
- `personalities` → user_id filter
- `chats` → user ownership
- `messages` → через chat ownership
- `document_chunks` → public/private разделение
- `memory_*` → user-specific

### Frontend Security
```bash
# XSS risks
grep -r "dangerouslySetInnerHTML" src/
grep -r "innerHTML\s*=" src/
grep -r "eval(" src/
```

**Проверить:**
- [ ] User input санитизируется
- [ ] react-markdown используется правильно
- [ ] Нет eval()
- [ ] localStorage usage минимален

---

## 📊 Генерация отчета

Создай: `security-audit-YYYY-MM-DD.md`

### Структура отчета:

```markdown
# Security Audit Report

**Дата:** 2025-01-31
**Версия:** 0.0.0 (из package.json)

## Executive Summary
- Файлов проверено: N
- Критические: X 🔴
- Высокие: Y 🟠
- Средние: Z 🟡

**Статус:** ✅ PASS / ⚠️ WARNING / ❌ FAIL

## Critical Issues
[Детальное описание]

## High Severity
[Детальное описание]

## Medium/Low
[Краткий список]

## Security Strengths
[Что сделано правильно]

## Dependencies Analysis
npm audit результаты

## OWASP Coverage
[Таблица]

## Action Items
- [ ] Immediate
- [ ] Short-term
- [ ] Long-term

## Recommendations
[Конкретные рекомендации]
```

---

## 🚨 Действия после audit

### Если CRITICAL issues:
1. ⚠️ Сообщи пользователю
2. 💡 Предложи fixes
3. ⏸️ Не продолжай до исправления

### Если только warnings:
1. 📊 Покажи summary
2. 📋 Предложи план
3. ❓ Спроси что делать

### Если всё чисто:
1. ✅ Сгенерируй отчет
2. 🎉 Похвали проект
3. 📈 Предложи CI/CD integration

---

## 🔧 Полезные команды

```bash
# Быстрая проверка
npm audit && node scripts/check-prompt-injection.js

# Только critical
npm audit --audit-level=critical

# Исправить (осторожно!)
npm audit fix

# Детальный отчет
npm audit --json > audit-report.json
```

---

## ✅ Security Checklist

После audit:
- [ ] Secrets в environment variables
- [ ] .env в .gitignore
- [ ] RLS на всех таблицах
- [ ] User input санитизируется
- [ ] OpenAI names транслитерируются
- [ ] Dependencies без critical issues
- [ ] Errors не раскрывают secrets
- [ ] Rate limiting настроен
- [ ] File uploads валидируются

---

## 📝 Обновить документацию

После audit и fixes:
1. **CLAUDE.md** - новые security правила
2. **PROJECT_ARCHITECTURE.md** - security раздел
3. **SECURITY_AUTOMATION_PLAN.md** - статус
4. **README.md** - security improvements

**Commit:**
```bash
/commit  # Правильное сообщение
```

---

📚 **См. также:**
- `scripts/README.md` - документация скриптов
- `SECURITY_AUTOMATION_PLAN.md` - полный план
- `.github/workflows/security.yml` - CI/CD
