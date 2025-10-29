# Задача 1: Создать БИБЛИОТЕКУ (document_chunks)

**Приоритет:** 🔥 Высокий
**Длительность:** 2-3 часа
**Зависимости:** Нет (можно начинать сразу)
**Phase:** 2 (Unified Memory System)

---

## 🎯 Цель задачи

Создать таблицу `document_chunks` - глобальное хранилище знаний с гибридным доступом (публичные + приватные документы).

**Что это даёт:**
- 📚 AI может искать в общей библиотеке знаний
- 🔐 Пользователи контролируют доступ (публичный/приватный)
- 🔍 Векторный поиск по документам
- 🔗 Связь с MaaS проектами

---

## 📋 Чеклист выполнения

### Шаг 1: Применить миграцию (15 мин)

- [ ] Открыть Supabase Dashboard → SQL Editor
- [ ] Скопировать SQL из `supabase/migrations/20250229000001_create_document_chunks.sql`
- [ ] Выполнить миграцию
- [ ] Проверить что таблица создана

**Проверка:**
```sql
-- В Supabase SQL Editor
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name = 'document_chunks';
```

Должен вернуть: `document_chunks` ✅

---

### Шаг 2: Проверить структуру (10 мин)

- [ ] Проверить колонки таблицы
- [ ] Проверить индексы
- [ ] Проверить RLS policies

**Проверка колонок:**
```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'document_chunks'
ORDER BY ordinal_position;
```

**Ожидаемые колонки:**
- `id` (uuid)
- `user_id` (uuid, nullable)
- `is_public` (boolean)
- `project_id` (uuid, nullable)
- `content` (text)
- `embedding` (vector 1536)
- `file_name` (text, nullable)
- `file_type` (text, nullable)
- `file_size` (integer, nullable)
- `source_url` (text, nullable)
- `metadata` (jsonb)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

**Проверка индексов:**
```sql
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'document_chunks';
```

**Ожидаемые индексы:**
- `document_chunks_pkey` (PRIMARY KEY)
- `document_chunks_user_id_idx`
- `document_chunks_public_idx`
- `document_chunks_project_id_idx`
- `document_chunks_embedding_idx` (ivfflat)
- `document_chunks_metadata_idx` (GIN)
- `document_chunks_content_fts_idx` (GIN, full-text search)

**Проверка RLS:**
```sql
SELECT tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename = 'document_chunks';
```

**Ожидаемые policies:**
- `Users can view public and own chunks` (SELECT)
- `Users can insert own chunks` (INSERT)
- `Users can update own chunks` (UPDATE)
- `Users can delete own chunks` (DELETE)

---

### Шаг 3: Тестирование функциональности (30 мин)

#### Тест 1: Создание публичного чанка

```sql
-- Вставить тестовый публичный чанк
INSERT INTO document_chunks (
  user_id,
  is_public,
  content,
  embedding,
  file_name,
  file_type,
  metadata
) VALUES (
  auth.uid(),  -- текущий пользователь
  true,        -- публичный
  'This is a test document about React hooks. React hooks are functions that let you use state and other React features without writing a class.',
  array_fill(0.1::float, ARRAY[1536])::vector,  -- фейковый embedding
  'react-hooks-guide.txt',
  'text/plain',
  '{"tags": ["react", "javascript", "hooks"], "language": "en"}'::jsonb
);
```

**Проверка:**
```sql
SELECT id, is_public, file_name, content
FROM document_chunks
WHERE file_name = 'react-hooks-guide.txt';
```

Должен вернуть вставленный чанк ✅

#### Тест 2: Создание приватного чанка

```sql
INSERT INTO document_chunks (
  user_id,
  is_public,
  content,
  embedding,
  file_name,
  metadata
) VALUES (
  auth.uid(),
  false,  -- приватный
  'Secret company strategy document.',
  array_fill(0.2::float, ARRAY[1536])::vector,
  'private-strategy.txt',
  '{"confidential": true}'::jsonb
);
```

#### Тест 3: Векторный поиск

```sql
-- Тест функции search_document_chunks
SELECT * FROM search_document_chunks(
  query_embedding := array_fill(0.1::float, ARRAY[1536])::vector,
  match_count := 5,
  filter_user_id := auth.uid(),
  similarity_threshold := 0.0
);
```

Должен вернуть релевантные чанки ✅

#### Тест 4: RLS проверка доступа

```sql
-- Убедись что ты видишь:
-- 1. Свои публичные чанки
-- 2. Свои приватные чанки
-- 3. Чужие публичные чанки
-- НО НЕ видишь чужие приватные чанки

SELECT
  id,
  user_id = auth.uid() as is_mine,
  is_public,
  file_name
FROM document_chunks
ORDER BY created_at DESC;
```

---

### Шаг 4: Обновить TypeScript типы (30 мин)

- [ ] Открыть `src/lib/supabase.ts`
- [ ] Добавить `DocumentChunk` interface
- [ ] Добавить в `Database` type

**Файл:** `src/lib/supabase.ts`

Добавить:

```typescript
// === DOCUMENT CHUNKS (БИБЛИОТЕКА) ===
export interface DocumentChunk {
  id: string;
  user_id: string | null;  // null = публичный
  is_public: boolean;
  project_id: string | null;

  content: string;
  embedding: number[];  // 1536 dimensions

  file_name: string | null;
  file_type: string | null;
  file_size: number | null;
  source_url: string | null;

  metadata: Record<string, any>;

  created_at: string;
  updated_at: string;
}

// Обновить Database interface
export interface Database {
  public: {
    Tables: {
      // ... существующие таблицы
      document_chunks: {
        Row: DocumentChunk;
        Insert: Omit<DocumentChunk, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<DocumentChunk, 'id' | 'created_at'>>;
      };
    };
  };
}
```

---

### Шаг 5: Документация (15 мин)

- [ ] Обновить `DATABASE_CHANGELOG.md`
- [ ] Пометить Sprint 2 как завершённый в `PROJECT_ARCHITECTURE.md`

**Добавить в DATABASE_CHANGELOG.md:**

```markdown
### 2025-02-XX: document_chunks создана ✅

**Статус:** ✅ ПРИМЕНЕНА
**Миграция:** `20250229000001_create_document_chunks.sql`

**Что создано:**
- Таблица document_chunks (БИБЛИОТЕКА)
- 7 индексов (включая векторный ivfflat)
- 4 RLS политики
- SQL функция search_document_chunks()
- Trigger для updated_at

**Тестирование:**
- ✅ Публичные чанки создаются
- ✅ Приватные чанки создаются
- ✅ Векторный поиск работает
- ✅ RLS корректно фильтрует доступ

**TypeScript:**
- ✅ DocumentChunk interface
- ✅ Database type обновлён
```

---

## 🚨 Возможные проблемы и решения

### Проблема 1: pgvector extension не установлен

**Симптом:**
```
ERROR: type "vector" does not exist
```

**Решение:**
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

---

### Проблема 2: ivfflat индекс создаётся медленно

**Симптом:** Запрос висит на создании индекса

**Решение:** Это нормально для пустой таблицы. Подожди 10-30 секунд.

---

### Проблема 3: RLS блокирует вставку

**Симптом:**
```
ERROR: new row violates row-level security policy
```

**Решение:** Убедись что `user_id` в INSERT = `auth.uid()`

---

## ✅ Критерии завершения задачи

**Задача считается завершённой когда:**

- ✅ Таблица `document_chunks` создана в Supabase
- ✅ Все 7 индексов созданы
- ✅ 4 RLS политики работают
- ✅ SQL функция `search_document_chunks()` работает
- ✅ Тесты пройдены (вставка, поиск, RLS)
- ✅ TypeScript типы обновлены
- ✅ Документация обновлена

**После завершения:**
- 📚 БИБЛИОТЕКА готова к использованию!
- ✅ Можно переходить к Задаче 2 (миграция MaaS)

---

## 📁 Файлы задачи

**Миграция:** `supabase/migrations/20250229000001_create_document_chunks.sql`
**Типы:** `src/lib/supabase.ts`
**Документация:** `DATABASE_CHANGELOG.md`

---

## 🎯 Следующий шаг после задачи

После успешного завершения переходи к **TASK_2_MAAS_MIGRATION.md**

---

*Создано: 2025-01-31*
*Sprint: 2 (document_chunks)*
*Phase: 2 (Unified Memory System)*
