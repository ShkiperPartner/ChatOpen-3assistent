-- ============================================================================
-- Шаг 4: Изучение созданной структуры MaaS
-- ============================================================================

-- ============================================================================
-- 4.1 Просмотр всех таблиц
-- ============================================================================

SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- Проверка только MaaS таблиц
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'facts', 'thread_summaries', 'decisions',
    'links', 'sources', 'maas_metrics', 'snapshot_cache'
  )
ORDER BY table_name;

-- ============================================================================
-- 4.2 Изучение связей между таблицами (Foreign Keys)
-- ============================================================================

SELECT
    tc.table_name AS таблица,
    kcu.column_name AS колонка,
    ccu.table_name AS ссылается_на_таблицу,
    ccu.column_name AS ссылается_на_колонку
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

-- ============================================================================
-- 4.3 Просмотр структуры каждой таблицы
-- ============================================================================

-- Структура facts
SELECT
  column_name AS колонка,
  data_type AS тип_данных,
  is_nullable AS может_быть_null,
  column_default AS значение_по_умолчанию
FROM information_schema.columns
WHERE table_name = 'facts'
ORDER BY ordinal_position;

-- Структура thread_summaries
SELECT
  column_name AS колонка,
  data_type AS тип_данных,
  is_nullable AS может_быть_null
FROM information_schema.columns
WHERE table_name = 'thread_summaries'
ORDER BY ordinal_position;

-- Структура decisions
SELECT
  column_name AS колонка,
  data_type AS тип_данных,
  is_nullable AS может_быть_null
FROM information_schema.columns
WHERE table_name = 'decisions'
ORDER BY ordinal_position;

-- Структура links
SELECT
  column_name AS колонка,
  data_type AS тип_данных,
  is_nullable AS может_быть_null
FROM information_schema.columns
WHERE table_name = 'links'
ORDER BY ordinal_position;

-- ============================================================================
-- 4.4 Просмотр индексов
-- ============================================================================

SELECT
  tablename AS таблица,
  indexname AS индекс,
  indexdef AS определение
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN (
    'facts', 'thread_summaries', 'decisions',
    'links', 'sources', 'maas_metrics', 'snapshot_cache'
  )
ORDER BY tablename, indexname;

-- ============================================================================
-- 4.5 Просмотр CHECK constraints
-- ============================================================================

SELECT
  tc.table_name AS таблица,
  tc.constraint_name AS имя_ограничения,
  cc.check_clause AS условие
FROM information_schema.table_constraints tc
JOIN information_schema.check_constraints cc
  ON tc.constraint_name = cc.constraint_name
WHERE tc.table_schema = 'public'
  AND tc.table_name IN (
    'facts', 'thread_summaries', 'decisions',
    'links', 'sources', 'maas_metrics', 'snapshot_cache'
  )
ORDER BY tc.table_name, tc.constraint_name;

-- ============================================================================
-- 4.6 Тестирование связей - ПРИМЕР
-- ============================================================================

-- Шаг 1: Получите ID вашего проекта
SELECT id, name, user_id
FROM projects
WHERE user_id = 'student-test-user';

-- Шаг 2: Добавьте факт (ЗАМЕНИТЕ 'YOUR_PROJECT_ID_HERE' на реальный ID)
INSERT INTO facts (project_id, session_id, subject, value, level, source_type)
VALUES (
  'YOUR_PROJECT_ID_HERE',  -- <-- ЗАМЕНИТЕ НА РЕАЛЬНЫЙ ID
  'learning-session-1',
  'MaaS Components',
  '{"components": ["projects", "facts", "decisions", "links"], "purpose": "AI memory management"}'::jsonb,
  'fact',
  'user_stated'
);

-- Шаг 3: Проверьте что факт создался
SELECT
  id,
  project_id,
  session_id,
  subject,
  value,
  level,
  source_type,
  created_at
FROM facts
WHERE session_id = 'learning-session-1';

-- Шаг 4: Добавьте саммари треда
INSERT INTO thread_summaries (project_id, session_id, summary_text, message_count)
VALUES (
  'YOUR_PROJECT_ID_HERE',  -- <-- ЗАМЕНИТЕ НА РЕАЛЬНЫЙ ID
  'learning-session-1',
  'Студент изучает архитектуру MaaS и создал 7 таблиц для хранения памяти AI ассистента',
  5
);

-- Шаг 5: Проверьте саммари
SELECT
  id,
  project_id,
  session_id,
  summary_text,
  message_count,
  created_at
FROM thread_summaries
WHERE session_id = 'learning-session-1';

-- Шаг 6: Получите ID факта и саммари для создания связи
SELECT
  'fact' as type,
  id,
  subject as описание
FROM facts
WHERE session_id = 'learning-session-1'
UNION ALL
SELECT
  'summary' as type,
  id,
  LEFT(summary_text, 50) as описание
FROM thread_summaries
WHERE session_id = 'learning-session-1';

-- Шаг 7: Создайте связь между фактом и саммари
-- ЗАМЕНИТЕ YOUR_PROJECT_ID_HERE, FACT_ID_HERE, SUMMARY_ID_HERE на реальные ID
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

-- Шаг 8: Проверьте созданные связи
SELECT
  l.id,
  l.source_type,
  l.target_type,
  l.link_type,
  l.strength,
  l.created_at
FROM links l
WHERE l.project_id = 'YOUR_PROJECT_ID_HERE';

-- ============================================================================
-- 4.7 Расширенные запросы - Изучение связей через JOIN
-- ============================================================================

-- Посмотреть факты с информацией о проекте
SELECT
  f.id,
  f.subject,
  f.value,
  f.level,
  p.name as project_name,
  p.mission as project_mission
FROM facts f
JOIN projects p ON f.project_id = p.id
WHERE f.session_id = 'learning-session-1';

-- Посмотреть все связи с деталями source и target
SELECT
  l.link_type,
  l.strength,
  l.source_type,
  CASE
    WHEN l.source_type = 'fact' THEN (SELECT subject FROM facts WHERE id = l.source_id)
    WHEN l.source_type = 'summary' THEN (SELECT LEFT(summary_text, 30) FROM thread_summaries WHERE id = l.source_id)
    ELSE 'Unknown'
  END as source_description,
  l.target_type,
  CASE
    WHEN l.target_type = 'fact' THEN (SELECT subject FROM facts WHERE id = l.target_id)
    WHEN l.target_type = 'summary' THEN (SELECT LEFT(summary_text, 30) FROM thread_summaries WHERE id = l.target_id)
    ELSE 'Unknown'
  END as target_description
FROM links l
WHERE l.project_id = 'YOUR_PROJECT_ID_HERE';

-- ============================================================================
-- 4.8 Статистика по проекту
-- ============================================================================

-- Количество записей в каждой таблице для вашего проекта
SELECT
  'facts' as таблица,
  COUNT(*) as количество
FROM facts
WHERE project_id = 'YOUR_PROJECT_ID_HERE'
UNION ALL
SELECT
  'thread_summaries' as таблица,
  COUNT(*) as количество
FROM thread_summaries
WHERE project_id = 'YOUR_PROJECT_ID_HERE'
UNION ALL
SELECT
  'decisions' as таблица,
  COUNT(*) as количество
FROM decisions
WHERE project_id = 'YOUR_PROJECT_ID_HERE'
UNION ALL
SELECT
  'links' as таблица,
  COUNT(*) as количество
FROM links
WHERE project_id = 'YOUR_PROJECT_ID_HERE'
UNION ALL
SELECT
  'sources' as таблица,
  COUNT(*) as количество
FROM sources
WHERE project_id = 'YOUR_PROJECT_ID_HERE'
UNION ALL
SELECT
  'maas_metrics' as таблица,
  COUNT(*) as количество
FROM maas_metrics
WHERE project_id = 'YOUR_PROJECT_ID_HERE'
UNION ALL
SELECT
  'snapshot_cache' as таблица,
  COUNT(*) as количество
FROM snapshot_cache
WHERE project_id = 'YOUR_PROJECT_ID_HERE';

-- ============================================================================
-- 4.9 Работа с JSONB полями
-- ============================================================================

-- Извлечение данных из JSONB поля value в facts
SELECT
  subject,
  value->>'components' as components,  -- Извлечь как текст
  value->'components' as components_json,  -- Извлечь как JSON
  value->>'purpose' as purpose
FROM facts
WHERE session_id = 'learning-session-1';

-- Поиск по JSONB полю
SELECT
  subject,
  value
FROM facts
WHERE value @> '{"purpose": "AI memory management"}'::jsonb;

-- ============================================================================
-- 4.10 Очистка тестовых данных (опционально)
-- ============================================================================

-- ОСТОРОЖНО: Это удалит все тестовые данные!
-- Раскомментируйте только если уверены

-- DELETE FROM links WHERE project_id = 'YOUR_PROJECT_ID_HERE';
-- DELETE FROM facts WHERE session_id = 'learning-session-1';
-- DELETE FROM thread_summaries WHERE session_id = 'learning-session-1';
