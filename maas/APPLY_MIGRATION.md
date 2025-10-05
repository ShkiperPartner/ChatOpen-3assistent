# Инструкция по применению MaaS миграции

## ✅ Что было сделано

Созданы 7 таблиц для MaaS (Memory as a Service):
1. **facts** - факты и контекстная информация
2. **thread_summaries** - саммари разговоров
3. **decisions** - решения из разговоров
4. **links** - связи между сущностями
5. **sources** - внешние источники информации
6. **maas_metrics** - метрики использования
7. **snapshot_cache** - кеш снапшотов памяти

## 📋 Как применить миграцию

### Вариант 1: Через Supabase SQL Editor (Рекомендуется)

1. Откройте ваш проект в Supabase
2. Перейдите в **SQL Editor** (левое меню)
3. Нажмите **New Query**
4. Откройте файл `maas/migrations/20250205000000_add_maas_tables.sql`
5. Скопируйте весь SQL код из файла
6. Вставьте в SQL Editor
7. Нажмите **Run** (или Ctrl/Cmd + Enter)

### Вариант 2: Через psql (для продвинутых)

```bash
# Получите connection string из Supabase Settings > Database
psql "postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres" \
  -f maas/migrations/20250205000000_add_maas_tables.sql
```

## 🔍 Проверка успешности

После выполнения миграции проверьте:

```sql
-- Посмотрите все созданные таблицы
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'facts', 'thread_summaries', 'decisions',
    'links', 'sources', 'maas_metrics', 'snapshot_cache'
  )
ORDER BY table_name;
```

Должны увидеть все 7 таблиц.

## 🎯 Следующие шаги

После успешного применения миграции:

### Шаг 4.1: Просмотр всех таблиц
```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

### Шаг 4.2: Изучение связей
```sql
SELECT
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM
    information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name IN (
    'facts', 'thread_summaries', 'decisions',
    'links', 'sources', 'maas_metrics', 'snapshot_cache'
  )
ORDER BY tc.table_name;
```

### Шаг 4.3: Тестирование - Добавление факта

```sql
-- Получите ID вашего проекта
SELECT id, name FROM projects WHERE user_id = 'student-test-user';

-- Добавьте факт (замените YOUR_PROJECT_ID на реальный ID из результата выше)
INSERT INTO facts (project_id, session_id, subject, value, level, source_type)
VALUES (
  'YOUR_PROJECT_ID_HERE',  -- <-- ЗАМЕНИТЕ НА РЕАЛЬНЫЙ ID
  'learning-session-1',
  'MaaS Components',
  '{"components": ["projects", "facts", "decisions", "links"], "purpose": "AI memory management"}'::jsonb,
  'fact',
  'user_stated'
);

-- Проверьте что факт создался
SELECT id, subject, value, level, source_type, created_at
FROM facts
WHERE session_id = 'learning-session-1';
```

### Шаг 4.4: Тестирование - Добавление саммари

```sql
-- Добавьте thread summary
INSERT INTO thread_summaries (project_id, session_id, summary_text, message_count)
VALUES (
  'YOUR_PROJECT_ID_HERE',  -- <-- ЗАМЕНИТЕ НА РЕАЛЬНЫЙ ID
  'learning-session-1',
  'Студент изучает архитектуру MaaS и создал 7 таблиц для хранения памяти AI ассистента',
  5
);

-- Проверьте саммари
SELECT id, summary_text, message_count, created_at
FROM thread_summaries
WHERE session_id = 'learning-session-1';
```

### Шаг 4.5: Тестирование - Создание связей

```sql
-- Получите ID факта и саммари
SELECT 'fact' as type, id FROM facts WHERE session_id = 'learning-session-1'
UNION ALL
SELECT 'summary' as type, id FROM thread_summaries WHERE session_id = 'learning-session-1';

-- Создайте связь между фактом и саммари
-- ЗАМЕНИТЕ fact_id и summary_id на реальные ID из результата выше
INSERT INTO links (project_id, source_type, source_id, target_type, target_id, link_type, strength)
VALUES (
  'YOUR_PROJECT_ID_HERE',
  'fact',
  'FACT_ID_HERE',
  'summary',
  'SUMMARY_ID_HERE',
  'related_to',
  0.9
);

-- Проверьте связи
SELECT
  l.source_type,
  l.target_type,
  l.link_type,
  l.strength,
  l.created_at
FROM links l
WHERE l.project_id = 'YOUR_PROJECT_ID_HERE';
```

## 📊 Просмотр структуры таблиц

### Таблица facts
```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'facts'
ORDER BY ordinal_position;
```

### Все индексы
```sql
SELECT
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN (
    'facts', 'thread_summaries', 'decisions',
    'links', 'sources', 'maas_metrics', 'snapshot_cache'
  )
ORDER BY tablename, indexname;
```

## 🎓 Что изучить дальше

1. **JSONB операции** - как работать с полями `value`, `metadata`, `snapshot_data`
2. **GIN индексы** - почему они используются для JSONB и массивов
3. **Тип CHECK constraints** - как они обеспечивают целостность данных
4. **Foreign Keys CASCADE** - как работает каскадное удаление
5. **Row Level Security (RLS)** - политики доступа к данным

## ⚠️ Troubleshooting

### Ошибка: "relation "projects" does not exist"
Убедитесь что вы создали таблицу `projects` из Шага 2.1 задания

### Ошибка: "permission denied"
Проверьте что функция `exec_sql` создана и у вас есть права

### Ошибка: "syntax error"
Убедитесь что скопировали весь файл полностью, включая все строки

## 🚀 Готово!

После успешного применения миграции у вас есть полноценная БД для MaaS!

Следующие шаги:
- Интеграция с n8n для автоматизации
- Создание API endpoints
- Подключение к Claude Code

Удачи в изучении! 🎉
