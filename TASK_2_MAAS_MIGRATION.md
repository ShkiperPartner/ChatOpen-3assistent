# Задача 2: Мигрировать ДНЕВНИК (MaaS tables)

**Приоритет:** 🔥 Высокий
**Длительность:** 3-4 часа
**Зависимости:** Задача 1 завершена (опционально, можно делать независимо)
**Phase:** 2 (Unified Memory System)

---

## 🎯 Цель задачи

Мигрировать 8 MaaS таблиц из отдельного Supabase проекта (Проект Б) в основной проект (Проект А), чтобы объединить все три типа памяти в одной БД.

**Что это даёт:**
- 📓 AI может искать факты из прошлых разговоров
- 🔗 Можно делать JOIN между таблицами
- 🚀 Memory Service API работает в единой БД
- ✅ Phase 2 infrastructure готова!

---

## 📋 Чеклист выполнения

### Подготовка: Инвентаризация (15 мин)

**Цель:** Понять что и сколько данных нужно мигрировать

- [ ] Подключиться к Supabase Проект Б
- [ ] Проверить наличие данных в таблицах
- [ ] Записать количество записей

**SQL для проверки (в Проекте Б):**

```sql
-- Проверить сколько данных в каждой таблице
SELECT
  'projects' as table_name,
  COUNT(*) as row_count
FROM projects
UNION ALL
SELECT 'facts', COUNT(*) FROM facts
UNION ALL
SELECT 'thread_summaries', COUNT(*) FROM thread_summaries
UNION ALL
SELECT 'decisions', COUNT(*) FROM decisions
UNION ALL
SELECT 'links', COUNT(*) FROM links
UNION ALL
SELECT 'sources', COUNT(*) FROM sources
UNION ALL
SELECT 'maas_metrics', COUNT(*) FROM maas_metrics
UNION ALL
SELECT 'snapshot_cache', COUNT(*) FROM snapshot_cache
ORDER BY table_name;
```

**Запиши результат:**
```
projects: ___ записей
facts: ___ записей
thread_summaries: ___ записей
decisions: ___ записей
links: ___ записей
sources: ___ записей
maas_metrics: ___ записей
snapshot_cache: ___ записей

ИТОГО: ___ записей
```

---

### Шаг 1: Применить миграцию структуры в Проект А (20 мин)

**Цель:** Создать все 8 MaaS таблиц в основной БД

- [ ] Открыть Supabase Dashboard → Проект А → SQL Editor
- [ ] Скопировать SQL из `supabase/migrations/20250229000002_migrate_maas_tables.sql`
- [ ] Выполнить миграцию
- [ ] Проверить что таблицы созданы

**Проверка:**
```sql
-- В Проекте А
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'projects', 'facts', 'thread_summaries', 'decisions',
    'links', 'sources', 'maas_metrics', 'snapshot_cache'
  )
ORDER BY table_name;
```

Должно вернуть все 8 таблиц ✅

---

### Шаг 2: Экспорт данных из Проекта Б (30 мин)

**Если данных НЕТ или МАЛО** → Пропусти этот шаг, переходи к Шагу 4 (создание тестовых данных)

**Если данных МНОГО** → Экспортируй:

#### Вариант А: Через Supabase Dashboard (простой)

1. Проект Б → Database → Tables
2. Для каждой таблицы: Export → CSV
3. Сохрани CSV файлы локально

#### Вариант Б: Через SQL (для больших данных)

```sql
-- В Проекте Б, для каждой таблицы
COPY (SELECT * FROM projects) TO STDOUT WITH CSV HEADER;
COPY (SELECT * FROM facts) TO STDOUT WITH CSV HEADER;
-- и так далее...
```

Сохрани результат в файлы:
- `export/projects.csv`
- `export/facts.csv`
- `export/thread_summaries.csv`
- `export/decisions.csv`
- `export/links.csv`
- `export/sources.csv`
- `export/maas_metrics.csv`
- `export/snapshot_cache.csv`

#### Вариант В: Через pg_dump (профессиональный)

Если у тебя есть прямой доступ к PostgreSQL:

```bash
# Экспорт только данных (без структуры)
pg_dump \
  --data-only \
  --table=projects \
  --table=facts \
  --table=thread_summaries \
  --table=decisions \
  --table=links \
  --table=sources \
  --table=maas_metrics \
  --table=snapshot_cache \
  -h db.yourproject.supabase.co \
  -U postgres \
  -d postgres \
  > maas_data_export.sql
```

---

### Шаг 3: Импорт данных в Проект А (30 мин)

**Только если экспортировал данные на Шаге 2!**

#### Вариант А: Через Supabase Dashboard

1. Проект А → Database → Tables
2. Для каждой таблицы: Import → Upload CSV
3. Проверить что данные импортировались

#### Вариант Б: Через SQL INSERT

```sql
-- Пример для projects
INSERT INTO projects (id, user_id, name, mission, goals, is_default, status, created_at, updated_at)
VALUES
  ('uuid-1', 'user-1', 'Project Name', 'Mission', ARRAY['goal1'], false, 'active', NOW(), NOW()),
  -- ... остальные записи
ON CONFLICT (id) DO NOTHING;  -- избежать дубликатов
```

#### Вариант В: Через pg_restore

```bash
psql \
  -h db.yourproject.supabase.co \
  -U postgres \
  -d postgres \
  < maas_data_export.sql
```

**Проверка импорта:**
```sql
-- Проверить количество записей в Проекте А
SELECT
  'projects' as table_name,
  COUNT(*) as row_count
FROM projects
UNION ALL
SELECT 'facts', COUNT(*) FROM facts
-- ... и т.д.
```

Сравни с количеством из Подготовки. Должно совпадать ✅

---

### Шаг 4: Создать тестовые данные (если экспорта не было) (20 мин)

**Если данных в Проекте Б не было или было мало** → Создай тестовые данные для проверки системы

```sql
-- 1. Создать тестовый проект
INSERT INTO projects (id, user_id, name, mission, goals, is_default, status)
VALUES
  (gen_random_uuid(), 'test-user-1', 'AI Partnership OS', 'Build intelligent memory system', ARRAY['Phase 1', 'Phase 2'], true, 'active')
RETURNING id;  -- Сохрани этот ID!

-- 2. Создать тестовый факт (используй project_id из п.1)
INSERT INTO facts (project_id, subject, value, level, source_type, confidence, importance, tags)
VALUES
  ('<project-id-from-step-1>', 'User Preference', '{"theme": "dark", "language": "ru"}', 'fact', 'user_stated', 1.0, 8, ARRAY['ui', 'preferences']);

-- 3. Создать тестовое решение
INSERT INTO decisions (project_id, decision_text, decision_type, status, priority)
VALUES
  ('<project-id>', 'Migrate MaaS to main project', 'action', 'in_progress', 'high');

-- 4. Создать summary
INSERT INTO thread_summaries (project_id, thread_id, summary_text, message_count, keywords)
VALUES
  ('<project-id>', 'test-thread-1', 'Discussion about unified memory system architecture', 10, ARRAY['memory', 'architecture', 'migration']);
```

---

### Шаг 5: Проверка целостности данных (30 мин)

- [ ] Проверить foreign keys работают
- [ ] Проверить triggers работают
- [ ] Протестировать основные запросы

#### Тест 1: Foreign Keys

```sql
-- Проверить что facts связаны с projects
SELECT
  p.name as project_name,
  COUNT(f.id) as facts_count
FROM projects p
LEFT JOIN facts f ON f.project_id = p.id
GROUP BY p.id, p.name;
```

Должно показать проекты и количество фактов ✅

#### Тест 2: Triggers (updated_at)

```sql
-- Обновить проект
UPDATE projects
SET name = 'Updated Name'
WHERE name = 'AI Partnership OS';

-- Проверить что updated_at обновился
SELECT name, created_at, updated_at
FROM projects
WHERE name = 'Updated Name';
```

`updated_at` должен быть свежее чем `created_at` ✅

#### Тест 3: Links между сущностями

```sql
-- Создать link между fact и decision
INSERT INTO links (project_id, source_type, source_id, target_type, target_id, link_type)
SELECT
  f.project_id,
  'fact',
  f.id,
  'decision',
  d.id,
  'supports'
FROM facts f
CROSS JOIN decisions d
LIMIT 1;

-- Проверить что link создался
SELECT * FROM links;
```

#### Тест 4: JSONB queries

```sql
-- Поиск по metadata в facts
SELECT subject, value
FROM facts
WHERE value @> '{"theme": "dark"}';
```

Должен найти факты с theme=dark ✅

---

### Шаг 6: Обновить TypeScript типы (45 мин)

- [ ] Открыть `src/lib/supabase.ts`
- [ ] Добавить все MaaS interfaces
- [ ] Обновить `Database` type

**Файл:** `src/lib/supabase.ts`

Добавить:

```typescript
// === MAAS TABLES (ДНЕВНИК) ===

export interface Project {
  id: string;
  user_id: string;
  name: string;
  mission: string | null;
  goals: string[] | null;
  is_default: boolean;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface Fact {
  id: string;
  project_id: string;
  session_id: string | null;
  user_id: string | null;
  subject: string;
  value: Record<string, any>;
  level: 'fact' | 'insight' | 'pattern' | 'hypothesis';
  source_type: 'user_stated' | 'inferred' | 'observed' | 'derived';
  confidence: number;
  importance: number;
  tags: string[];
  metadata: Record<string, any>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ThreadSummary {
  id: string;
  project_id: string;
  session_id: string | null;
  thread_id: string | null;
  summary_text: string;
  summary_type: 'auto' | 'manual' | 'periodic';
  message_count: number;
  token_count: number;
  first_message_at: string | null;
  last_message_at: string | null;
  keywords: string[];
  topics: any[];
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface Decision {
  id: string;
  project_id: string;
  session_id: string | null;
  decision_text: string;
  decision_type: 'action' | 'preference' | 'plan' | 'goal' | 'constraint' | 'other';
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'deferred';
  outcome: string | null;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  due_date: string | null;
  completed_at: string | null;
  tags: string[];
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface Link {
  id: string;
  project_id: string;
  source_type: 'fact' | 'decision' | 'summary' | 'message' | 'source' | 'chat' | 'other';
  source_id: string;
  target_type: 'fact' | 'decision' | 'summary' | 'message' | 'source' | 'chat' | 'other';
  target_id: string;
  link_type: 'related_to' | 'derived_from' | 'supports' | 'contradicts' | 'references' | 'depends_on' | 'other';
  strength: number;
  metadata: Record<string, any>;
  created_at: string;
}

export interface Source {
  id: string;
  project_id: string;
  source_type: 'web' | 'document' | 'api' | 'database' | 'manual' | 'other';
  source_url: string | null;
  source_title: string | null;
  source_content: string | null;
  source_excerpt: string | null;
  author: string | null;
  published_at: string | null;
  accessed_at: string;
  credibility_score: number;
  tags: string[];
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface MaasMetric {
  id: string;
  project_id: string;
  metric_type: string;
  metric_value: number | null;
  metric_unit: string | null;
  entity_type: string | null;
  entity_id: string | null;
  metadata: Record<string, any>;
  recorded_at: string;
}

export interface SnapshotCache {
  id: string;
  project_id: string;
  session_id: string | null;
  snapshot_type: 'full' | 'incremental' | 'summary' | 'context' | 'other';
  snapshot_data: Record<string, any>;
  version: number;
  size_bytes: number | null;
  expires_at: string | null;
  last_accessed_at: string;
  access_count: number;
  metadata: Record<string, any>;
  created_at: string;
}

// Обновить Database interface
export interface Database {
  public: {
    Tables: {
      // ... существующие таблицы
      document_chunks: { ... };

      // MaaS tables
      projects: {
        Row: Project;
        Insert: Omit<Project, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Project, 'id' | 'created_at'>>;
      };
      facts: {
        Row: Fact;
        Insert: Omit<Fact, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Fact, 'id' | 'created_at'>>;
      };
      thread_summaries: {
        Row: ThreadSummary;
        Insert: Omit<ThreadSummary, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<ThreadSummary, 'id' | 'created_at'>>;
      };
      decisions: {
        Row: Decision;
        Insert: Omit<Decision, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Decision, 'id' | 'created_at'>>;
      };
      links: {
        Row: Link;
        Insert: Omit<Link, 'id' | 'created_at'>;
        Update: Partial<Omit<Link, 'id' | 'created_at'>>;
      };
      sources: {
        Row: Source;
        Insert: Omit<Source, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Source, 'id' | 'created_at'>>;
      };
      maas_metrics: {
        Row: MaasMetric;
        Insert: Omit<MaasMetric, 'id' | 'recorded_at'>;
        Update: never;  // metrics are immutable
      };
      snapshot_cache: {
        Row: SnapshotCache;
        Insert: Omit<SnapshotCache, 'id' | 'created_at'>;
        Update: Partial<Omit<SnapshotCache, 'id' | 'created_at'>>;
      };
    };
  };
}
```

---

### Шаг 7: Документация (15 мин)

- [ ] Обновить `DATABASE_CHANGELOG.md`
- [ ] Пометить Sprint 1 как завершённый в `PROJECT_ARCHITECTURE.md`

**Добавить в DATABASE_CHANGELOG.md:**

```markdown
### 2025-02-XX: MaaS tables мигрированы ✅

**Статус:** ✅ ПРИМЕНЕНА
**Миграция:** `20250229000002_migrate_maas_tables.sql`

**Что мигрировано:**
- 8 таблиц из Проекта Б в Проект А
- XX записей перенесено
- Все foreign keys восстановлены
- Triggers работают

**Таблицы:**
- projects (дневник проектов)
- facts (факты из разговоров)
- thread_summaries (саммари тредов)
- decisions (решения пользователя)
- links (связи между сущностями)
- sources (внешние источники)
- maas_metrics (метрики)
- snapshot_cache (кеш)

**Тестирование:**
- ✅ Foreign keys работают
- ✅ Triggers обновляют updated_at
- ✅ JSONB queries работают
- ✅ Links между сущностями создаются

**TypeScript:**
- ✅ 8 MaaS interfaces добавлены
- ✅ Database type обновлён
```

---

## 🚨 Возможные проблемы и решения

### Проблема 1: Конфликт primary keys при импорте

**Симптом:**
```
ERROR: duplicate key value violates unique constraint "projects_pkey"
```

**Решение:** Используй `ON CONFLICT (id) DO NOTHING` или `DO UPDATE`

---

### Проблема 2: Foreign key constraint fails

**Симптом:**
```
ERROR: insert or update on table "facts" violates foreign key constraint "facts_project_id_fkey"
```

**Решение:** Сначала импортируй `projects`, потом таблицы которые на него ссылаются

**Правильный порядок импорта:**
1. `projects` (родительская)
2. `facts`, `thread_summaries`, `decisions` (дочерние)
3. `links`, `sources` (связи)
4. `maas_metrics`, `snapshot_cache` (кеш)

---

### Проблема 3: Очень большой объём данных

**Симптом:** Импорт занимает >10 минут

**Решение:** Импортируй батчами по 1000 записей:

```sql
-- Отключить triggers временно
ALTER TABLE facts DISABLE TRIGGER ALL;

-- Импорт батчами
INSERT INTO facts (...) VALUES (...); -- первая 1000
INSERT INTO facts (...) VALUES (...); -- вторая 1000

-- Включить triggers обратно
ALTER TABLE facts ENABLE TRIGGER ALL;
```

---

## ✅ Критерии завершения задачи

**Задача считается завершённой когда:**

- ✅ 8 MaaS таблиц созданы в Проекте А
- ✅ Данные мигрированы (или созданы тестовые)
- ✅ Foreign keys работают
- ✅ Triggers работают
- ✅ TypeScript типы обновлены (8 interfaces)
- ✅ Документация обновлена

**После завершения:**
- 📓 ДНЕВНИК перенесён в единую БД!
- ✅ Теперь есть все три типа памяти в одном месте:
  - 📚 БИБЛИОТЕКА (document_chunks)
  - 💼 РАБОЧИЙ СТОЛ (personality_embeddings)
  - 📓 ДНЕВНИК (MaaS tables)
- 🚀 Готово к созданию Memory Service API!

---

## 📁 Файлы задачи

**Миграция:** `supabase/migrations/20250229000002_migrate_maas_tables.sql`
**Типы:** `src/lib/supabase.ts`
**Документация:** `DATABASE_CHANGELOG.md`, `PROJECT_ARCHITECTURE.md`

---

## 🎯 Следующий шаг после задачи

После успешного завершения **Phase 2 infrastructure готова!**

Следующие задачи:
- **Sprint 3:** Memory Service API (объединение трёх источников)
- **Sprint 4:** UI Components
- **Sprint 5:** Интеграция в чат

---

*Создано: 2025-01-31*
*Sprint: 1 (MaaS migration)*
*Phase: 2 (Unified Memory System)*
