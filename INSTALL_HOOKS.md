# Git Hooks Installation

## 🎯 Зачем нужен pre-commit hook?

Pre-commit hook автоматически проверяет код **перед каждым git commit** на:
- Hardcoded secrets (API keys, passwords)
- .env файлы в коммите
- Опасные паттерны (eval, innerHTML)
- Большие файлы (>5MB)

**Время проверки:** < 5 секунд

---

## 🚀 Установка (один раз)

### Вариант 1: Автоматическая установка

```bash
# Копировать hook в .git/hooks/
cp scripts/security-check.sh .git/hooks/pre-commit

# Сделать executable
chmod +x .git/hooks/pre-commit
chmod +x scripts/security-check.sh

# Готово!
echo "✅ Pre-commit hook installed"
```

### Вариант 2: Вручную

1. Создать файл `.git/hooks/pre-commit`:
   ```bash
   #!/bin/bash
   bash scripts/security-check.sh
   ```

2. Сделать executable:
   ```bash
   chmod +x .git/hooks/pre-commit
   chmod +x scripts/security-check.sh
   ```

---

## 🔧 Использование

### Нормальный commit

```bash
git add .
git commit -m "Add feature"

# Hook запустится автоматически:
# 🔒 Security Check...
# [1/4] Secrets...
#    ✓ OK
# [2/4] .env files...
#    ✓ OK
# ...
# ✅ PASSED
```

### Если hook заблокировал commit

```bash
# Вариант 1: Исправить проблему
git reset HEAD problematic-file.js
# ... исправить ...
git add problematic-file.js
git commit -m "Fix"

# Вариант 2: Пропустить проверку (НЕ рекомендуется!)
git commit --no-verify -m "Skip security check"
```

---

## ✅ Проверка установки

```bash
# Проверить что hook существует
ls -la .git/hooks/pre-commit

# Проверить права
# Должно быть: -rwxr-xr-x (executable)

# Тест hook
bash scripts/security-check.sh
# Должно вывести: ✅ PASSED
```

---

## 🐛 Troubleshooting

### Hook не запускается

```bash
# Проверить executable rights
chmod +x .git/hooks/pre-commit
chmod +x scripts/security-check.sh

# Проверить что файл существует
cat .git/hooks/pre-commit
```

### Hook выдаёт ошибки

```bash
# Запустить вручную для отладки
bash -x scripts/security-check.sh

# Проверить Git Bash (Windows)
which bash
# Должно вывести путь к bash
```

### Windows: Hook не работает

```bash
# Убедиться что используется Git Bash (не CMD/PowerShell)
git config --global core.hooksPath .git/hooks

# Проверить line endings
dos2unix .git/hooks/pre-commit
dos2unix scripts/security-check.sh
```

---

## 🔄 Обновление hook

Если скрипт `scripts/security-check.sh` обновился:

```bash
# Hook автоматически использует новую версию
# (т.к. hook просто вызывает скрипт)

# Ничего делать не нужно!
```

---

## 🚫 Отключение hook

### Временно (для одного commit)

```bash
git commit --no-verify -m "message"
```

### Навсегда (не рекомендуется)

```bash
rm .git/hooks/pre-commit
```

---

## 📋 Что проверяет hook?

| Проверка | Severity | Блокирует commit? |
|----------|----------|-------------------|
| Hardcoded secrets | 🔴 CRITICAL | ✅ Да |
| .env файлы | 🔴 CRITICAL | ✅ Да |
| Опасные паттерны | 🟡 WARNING | ❌ Нет |
| Большие файлы | 🟡 WARNING | ❌ Нет |

---

## 💡 Best Practices

1. **Всегда устанавливай hook** после git clone
2. **Не используй --no-verify** без веской причины
3. **Если hook заблокировал** - значит есть реальная проблема
4. **Исправляй, а не обходи** security checks

---

## 🌐 Команда / Team

### Для новых разработчиков

Добавь в README.md:

```markdown
## Setup

1. Clone repo
2. Install dependencies: `npm install`
3. **Install git hooks:** `bash scripts/install-hooks.sh`  ← ВАЖНО!
4. Run: `npm run dev`
```

### Автоматизация установки

Создай `scripts/install-hooks.sh`:

```bash
#!/bin/bash
echo "📦 Installing git hooks..."
cp scripts/security-check.sh .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
chmod +x scripts/security-check.sh
echo "✅ Hooks installed!"
```

Добавь в `package.json`:

```json
{
  "scripts": {
    "postinstall": "bash scripts/install-hooks.sh"
  }
}
```

Теперь hook установится автоматически после `npm install`!

---

## 📚 См. также

- `scripts/security-check.sh` - сам скрипт проверки
- `scripts/README.md` - документация всех security скриптов
- `SECURITY_AUTOMATION_PLAN.md` - полный план security automation
- `.github/workflows/security.yml` - CI/CD security checks

---

**Вопросы?** Запусти `/security` для полного security audit.
