# 🧪 Testing Guide - Unified Memory System

**Дата:** 2025-02-29
**Phase 2:** Full Feature Complete
**Цель:** Протестировать систему трёх типов памяти локально

---

## 📋 Что было реализовано

### ✅ Task 1: UI для библиотеки (COMPLETED)
- **MemoryLibrary.tsx** - UI компонент с drag & drop
- **useStore** методы: `loadLibraryDocuments`, `uploadDocumentToLibrary`, `deleteLibraryDocument`
- **Кнопка "Library"** в ChatArea header
- **Public/Private** toggle для документов

### ✅ Task 2: Memory Service Integration (COMPLETED)
- **MemoryService** интегрирован в `sendMessage()`
- **Enriched context** из трёх источников: 📚 Library, 💼 Desk, 📓 Diary
- **Векторный поиск** через OpenAI embeddings
- **Автоматическое обогащение** всех сообщений

### ✅ Task 3: Facts Extraction (COMPLETED)
- **Автосохранение фактов** после каждого ответа AI
- **Facts таблица** сохраняет: question, answer, personality, metadata
- **Non-critical failure** - если extraction падает, чат продолжает работать

### ✅ Task 4: Default Project (COMPLETED)
- **Автосоздание** "Personal Workspace" при первом использовании
- **project_id** автоматически присваивается всем facts

---

## 🚀 Запуск локально

### 1. Проверь .env файл

```bash
# Должны быть установлены:
VITE_SUPABASE_URL=https://tslfszdhvmszbazutcdi.supabase.co
VITE_SUPABASE_ANON_KEY=your_key_here
```

### 2. Установи зависимости (если нужно)

```bash
npm install
```

### 3. Запусти dev сервер

```bash
npm run dev
```

### 4. Открой браузер

```
http://localhost:5173
```

---

## 📝 Testing Flow (Пошаговая инструкция)

### 🎯 Сценарий 1: Загрузка документа в библиотеку

1. **Войди в систему** (sign up/in)
2. **Установи OpenAI API key** (Settings)
3. **Нажми "Library"** в header (рядом с Personality)
4. **Загрузи тестовый файл** (например .txt или .md)
   - Выбери **Public** или **Private**
   - Нажми "Upload to Library"
5. **Проверь:**
   - ✅ Файл появился в списке документов
   - ✅ В консоли: "Processing..."
   - ✅ Document добавлен в `document_chunks` таблицу
   - ✅ Embedding векторизован

---

### 🎯 Сценарий 2: Тестирование enriched context

1. **Загрузи документ** с текстом:
   ```
   React best practices:
   - Use functional components
   - Always use hooks
   - Memoize expensive calculations
   ```

2. **Создай новый чат**

3. **Спроси:** "Какие best practices для React?"

4. **Проверь консоль:**
   ```
   🧠 Searching unified memory...
   ✅ Found 1 memory results
   📚 LIBRARY: React best practices...
   🚀 Context enriched with memory
   ```

5. **Проверь ответ AI:**
   - AI должен **упомянуть информацию из документа**
   - Например: "Based on your library, best practices include..."

---

### 🎯 Сценарий 3: Facts auto-save в Diary

1. **Спроси AI:** "Мой любимый цвет - синий"

2. **Проверь консоль:**
   ```
   📓 Fact saved to Diary
   ```

3. **Проверь Supabase:**
   ```sql
   SELECT * FROM facts WHERE user_id = 'your-user-id' ORDER BY created_at DESC LIMIT 1;
   ```

4. **Ожидаемый result:**
   ```json
   {
     "subject": "Мой любимый цвет - синий",
     "value": {
       "question": "Мой любимый цвет - синий",
       "answer": "[первые 500 символов ответа AI]",
       "personality": "Default",
       "timestamp": "2025-02-29T..."
     },
     "level": "fact",
     "source_type": "observed",
     "is_active": true
   }
   ```

---

### 🎯 Сценарий 4: End-to-End тест всех трёх типов памяти

#### Подготовка:

1. **📚 БИБЛИОТЕКА:** Загрузи документ `react-guide.md`:
   ```markdown
   # React Guide
   TypeScript is recommended for all React projects.
   Use `useState` for simple state management.
   ```

2. **💼 РАБОЧИЙ СТОЛ:** Создай Personality с файлом:
   - Name: "React Expert"
   - Prompt: "You are a React expert"
   - Upload file: `best-practices.txt`

3. **📓 ДНЕВНИК:** Создай факт (просто задай вопрос):
   - "Я работаю над проектом на Next.js"

#### Тест:

1. **Активируй** personality "React Expert"

2. **Спроси:** "Как мне начать новый проект?"

3. **Проверь консоль:**
   ```
   🧠 Searching unified memory...
   ✅ Found 3 memory results
   📚 LIBRARY: TypeScript is recommended...
   💼 DESK: [content from best-practices.txt]
   📓 DIARY: Я работаю над проектом на Next.js
   🚀 Context enriched with memory
   ```

4. **Ожидаемый ответ AI:**
   - Упоминает **TypeScript** (из библиотеки)
   - Использует **best practices** из файла personality
   - Учитывает что ты работаешь на **Next.js** (из дневника)

---

## 🔍 Debugging & Troubleshooting

### Проблема: Memory Service не находит документы

**Проверь:**
1. OpenAI API key установлен?
2. Документ действительно загружен в `document_chunks`?
3. Embedding создан? (проверь колонку `embedding`)

**SQL для проверки:**
```sql
SELECT id, file_name, content, LENGTH(embedding::text) as embedding_size
FROM document_chunks
WHERE user_id = 'your-user-id' OR is_public = true;
```

---

### Проблема: Facts не сохраняются

**Проверь:**
1. Default project создан?
   ```sql
   SELECT * FROM projects WHERE user_id = 'your-user-id' AND is_default = true;
   ```

2. Ошибки в консоли?
   - Ищи: "Facts extraction failed"

3. Права доступа RLS:
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'facts';
   ```

---

### Проблема: Enriched context не работает

**Проверь консоль:**
- Есть ли `🧠 Searching unified memory...`?
- Если нет → Memory Service не инициализирован
- Если да, но "No relevant memory found" → проверь similarity_threshold (0.6)

**Попробуй:**
```typescript
// В sendMessage() измени threshold:
similarity_threshold: 0.4  // Менее строгий поиск
```

---

## 📊 Проверка базы данных

### Проверь все таблицы памяти:

```sql
-- 📚 БИБЛИОТЕКА
SELECT COUNT(*) as library_docs FROM document_chunks;

-- 💼 РАБОЧИЙ СТОЛ
SELECT p.name, COUNT(pe.*) as embeddings_count
FROM personalities p
LEFT JOIN personality_embeddings pe ON pe.personality_id = p.id
GROUP BY p.id, p.name;

-- 📓 ДНЕВНИК
SELECT p.name as project, COUNT(f.*) as facts_count
FROM projects p
LEFT JOIN facts f ON f.project_id = p.id
GROUP BY p.id, p.name;
```

### Проверь Memory Service queries:

```sql
-- Последние memory searches (через logs, если есть)
SELECT * FROM facts
WHERE metadata->>'chat_id' IS NOT NULL
ORDER BY created_at DESC
LIMIT 10;
```

---

## ✅ Success Criteria

**Система работает правильно если:**

1. ✅ **Library UI открывается** и можно загрузить файл
2. ✅ **Документ векторизован** (embedding != null в БД)
3. ✅ **Memory Service находит** релевантные документы
4. ✅ **AI ответ обогащён** контекстом из памяти
5. ✅ **Facts автосохраняются** после каждого ответа
6. ✅ **Default project создаётся** автоматически
7. ✅ **Нет критичных ошибок** в консоли

---

## 🎯 Next Steps (после тестирования)

### Если всё работает:
- ✅ Закрыть Sprint 3 (Memory Service API)
- ✅ Обновить PROJECT_ARCHITECTURE.md
- ✅ Обновить DATABASE_CHANGELOG.md
- ✅ Коммит: "Sprint 3 complete: Full Feature E2E working"

### Если есть проблемы:
- 🔧 Запустить debugging по инструкции выше
- 🐛 Создать issue в GitHub
- 📝 Задокументировать workaround

---

## 💡 Tips для тестирования

1. **Используй Browser DevTools:**
   - Network tab → проверяй OpenAI API calls
   - Console → следи за логами Memory Service

2. **Используй Supabase Dashboard:**
   - Table Editor → смотри данные в реальном времени
   - SQL Editor → запускай проверочные запросы

3. **Тестируй edge cases:**
   - Пустой запрос
   - Очень длинный документ (>1MB)
   - Документ без текста (только изображения)
   - Отсутствие OpenAI API key

4. **Performance testing:**
   - Загрузи 10+ документов
   - Проверь скорость поиска
   - Мониторь token usage

---

## 📞 Если нужна помощь

**Обратись к:**
- `VISION.md` - понять meta-goal
- `PROJECT_ARCHITECTURE.md` - текущий статус
- `DATABASE_CHANGELOG.md` - структура БД
- `CLAUDE.md` - рабочие процедуры

**Создай issue с:**
- Шаги для воспроизведения
- Скриншот консоли
- SQL query results
- Ожидаемое vs фактическое поведение

---

**Happy Testing! 🚀**

*Последнее обновление: 2025-02-29*
*Sprint 3: Memory Service API - Full Feature*
