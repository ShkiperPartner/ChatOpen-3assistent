# MaaS (Memory as a Service) - База данных

Полная структура базы данных для MaaS микросервиса.

## 📁 Структура

```
maas/
├── migrations/
│   └── 20250205000000_add_maas_tables.sql   # SQL миграция с 7 таблицами
├── scripts/
│   ├── apply-maas-migration.mjs             # Автоматический скрипт (не работает с большими файлами)
│   ├── apply-migration-simple.mjs           # Упрощенный скрипт
│   └── check-exec-function.mjs              # Проверка функции exec_sql
├── APPLY_MIGRATION.md                        # 📋 Инструкция по применению миграции
├── STEP_4_QUERIES.sql                        # 🔍 SQL запросы для изучения (Шаг 4)
└── README.md                                 # Этот файл
```

## 🗃️ Таблицы

### 1. **facts** - Факты и контекстная информация
Хранит факты о пользователе, извлеченные из разговоров.

**Ключевые поля:**
- `project_id` → связь с projects
- `subject` - тема факта
- `value` (JSONB) - значение факта
- `level` - уровень: fact, insight, pattern, hypothesis
- `source_type` - откуда получен: user_stated, inferred, observed, derived

### 2. **thread_summaries** - Саммари разговоров
Сохраняет краткие выжимки из тредов разговоров.

**Ключевые поля:**
- `summary_text` - текст саммари
- `message_count` - количество сообщений
- `keywords[]` - ключевые слова
- `topics` (JSONB) - темы разговора

### 3. **decisions** - Решения из разговоров
Отслеживает решения, принятые в ходе разговора.

**Ключевые поля:**
- `decision_text` - текст решения
- `decision_type` - тип: action, preference, plan, goal, constraint
- `status` - статус: pending, in_progress, completed, cancelled, deferred
- `priority` - приоритет: low, medium, high, urgent

### 4. **links** - Связи между сущностями
Граф связей между различными сущностями (факты, решения, саммари).

**Ключевые поля:**
- `source_type`, `source_id` - исходная сущность
- `target_type`, `target_id` - целевая сущность
- `link_type` - тип связи: related_to, derived_from, supports, contradicts
- `strength` - сила связи (0.0 - 1.0)

### 5. **sources** - Внешние источники
Хранит ссылки на внешние источники информации.

**Ключевые поля:**
- `source_type` - тип: web, document, api, database, manual
- `source_url` - URL источника
- `credibility_score` - оценка достоверности (0.0 - 1.0)

### 6. **maas_metrics** - Метрики использования
Отслеживает использование MaaS системы.

**Ключевые поля:**
- `metric_type` - тип метрики
- `metric_value` - значение
- `recorded_at` - время записи

### 7. **snapshot_cache** - Кеш снапшотов
Кешированные снапшоты состояния памяти.

**Ключевые поля:**
- `snapshot_type` - тип: full, incremental, summary, context
- `snapshot_data` (JSONB) - данные снапшота
- `expires_at` - время истечения
- `access_count` - количество обращений

## 🚀 Быстрый старт

### Шаг 1: Применить миграцию

См. подробную инструкцию в **[APPLY_MIGRATION.md](./APPLY_MIGRATION.md)**

Краткая версия:
1. Откройте Supabase SQL Editor
2. Скопируйте содержимое `migrations/20250205000000_add_maas_tables.sql`
3. Вставьте и запустите

### Шаг 2: Проверить создание таблиц

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'facts', 'thread_summaries', 'decisions',
    'links', 'sources', 'maas_metrics', 'snapshot_cache'
  );
```

### Шаг 3: Изучить структуру

Используйте запросы из **[STEP_4_QUERIES.sql](./STEP_4_QUERIES.sql)**

## 🔗 Связи между таблицами

Все таблицы связаны с `projects` через `project_id`:

```
projects (созданная вручную)
├── facts (project_id → projects.id)
├── thread_summaries (project_id → projects.id)
├── decisions (project_id → projects.id)
├── links (project_id → projects.id)
├── sources (project_id → projects.id)
├── maas_metrics (project_id → projects.id)
└── snapshot_cache (project_id → projects.id)
```

## 📊 Особенности реализации

### JSONB поля
- `facts.value` - гибкое хранение любых данных
- `snapshot_cache.snapshot_data` - полный контекст
- `metadata` - в большинстве таблиц для расширяемости

### GIN индексы
Используются для быстрого поиска в JSONB и массивах:
```sql
CREATE INDEX idx_facts_value ON facts USING GIN(value);
CREATE INDEX idx_facts_tags ON facts USING GIN(tags);
```

### CHECK Constraints
Обеспечивают целостность данных:
```sql
CHECK (level IN ('fact', 'insight', 'pattern', 'hypothesis'))
CHECK (confidence >= 0 AND confidence <= 1)
```

### Timestamps
Все таблицы имеют:
- `created_at` - время создания
- `updated_at` - время обновления (где применимо)

### Row Level Security (RLS)
Все таблицы защищены RLS политиками для безопасности.

## 🎓 Использование

### Добавление факта

```sql
INSERT INTO facts (project_id, session_id, subject, value, level, source_type)
VALUES (
  'your-project-id',
  'session-123',
  'User Preference',
  '{"theme": "dark", "language": "ru"}'::jsonb,
  'fact',
  'user_stated'
);
```

### Создание связи

```sql
INSERT INTO links (project_id, source_type, source_id, target_type, target_id, link_type)
VALUES (
  'your-project-id',
  'fact',
  'fact-id-here',
  'decision',
  'decision-id-here',
  'supports'
);
```

### Поиск по JSONB

```sql
-- Найти факты с определенным ключом
SELECT * FROM facts
WHERE value ? 'theme';

-- Найти факты с конкретным значением
SELECT * FROM facts
WHERE value @> '{"theme": "dark"}'::jsonb;
```

## 📚 Документация

- **[APPLY_MIGRATION.md](./APPLY_MIGRATION.md)** - Как применить миграцию
- **[STEP_4_QUERIES.sql](./STEP_4_QUERIES.sql)** - SQL запросы для изучения структуры
- **[migrations/20250205000000_add_maas_tables.sql](./migrations/20250205000000_add_maas_tables.sql)** - Полный SQL код миграции

## ⚙️ Техническая информация

**PostgreSQL версия:** 15+ (Supabase)
**Расширения:** uuid-ossp
**Общее количество таблиц:** 7
**Общее количество индексов:** ~35
**RLS:** Enabled на всех таблицах

## 🔄 Следующие шаги

1. ✅ Применить миграцию
2. ✅ Изучить структуру (Шаг 4)
3. 🔲 Интегрировать с n8n workflow
4. 🔲 Создать API endpoints
5. 🔲 Подключить к Claude Code

## 🤝 Вклад

Этот проект создан как учебное задание для изучения MaaS архитектуры.

---

**Дата создания:** 2025-02-05
**Автор:** Claude Code + Student
**Статус:** ✅ Ready for use
