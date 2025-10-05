# Database Changelog

**Проект:** ChatOpenAI Integration Assistant  
**База данных:** Supabase PostgreSQL  
**Последнее обновление:** 2025-01-31 (Структура очищена и актуализирована)

---

## 📊 Текущее состояние схемы БД (СНАПШОТ: 2025-01-31)

### Основные таблицы

#### `personalities` - настраиваемые ассистенты OpenAI
```sql
personalities {
  id: UUID PRIMARY KEY
  user_id: UUID → auth.users (NOT NULL)
  name: TEXT (NOT NULL) -- название ассистента
  description: TEXT -- описание ассистента
  prompt: TEXT (NOT NULL) -- базовый системный промпт
  is_active: BOOLEAN DEFAULT true -- активная личность
  has_memory: BOOLEAN DEFAULT true -- память разговоров
  files: JSONB DEFAULT '[]' -- массив файлов PersonalityFile[]
  file_instruction: TEXT -- общая инструкция для всех файлов
  openai_assistant_id: TEXT -- ID ассистента в OpenAI
  openai_file_id: TEXT -- ID файла в OpenAI
  
  -- RAG поля (опционально для векторного поиска):
  file_name: TEXT -- имя загруженного файла
  file_content: TEXT -- содержимое файла для резерва
  uploaded_at: TIMESTAMP -- время загрузки файла
  chunk_size: INTEGER DEFAULT 800 -- размер чанков для RAG
  top_chunks: INTEGER DEFAULT 3 -- количество релевантных чанков
  embedding_model: TEXT DEFAULT 'text-embedding-3-small' -- модель эмбеддингов
  
  created_at: TIMESTAMP DEFAULT NOW()
  updated_at: TIMESTAMP DEFAULT NOW()
}

-- Индексы:
-- personalities_user_id_idx (на user_id для RLS)
-- personalities_active_idx (на is_active WHERE is_active = true)
-- personalities_assistant_id_idx (на openai_assistant_id)

-- RLS Policies:
-- Users can view/insert/update/delete their own personalities
-- Все операции фильтруются по auth.uid() = user_id
```

#### `chats` - чаты пользователей
```sql
chats {
  id: UUID PRIMARY KEY
  user_id: UUID → auth.users (NOT NULL) 
  title: TEXT DEFAULT 'New Chat'
  created_at: TIMESTAMP DEFAULT NOW()
  updated_at: TIMESTAMP DEFAULT NOW()
  openai_thread_id: TEXT -- ID thread в OpenAI
}
```

#### `messages` - сообщения в чатах
```sql
messages {
  id: UUID PRIMARY KEY
  chat_id: UUID → chats (NOT NULL)
  role: TEXT CHECK (role IN ('user', 'assistant'))
  content: TEXT (NOT NULL)
  token_usage: JSONB -- информация о токенах
  created_at: TIMESTAMP DEFAULT NOW()
}
```

#### `user_settings` - настройки пользователей
```sql
user_settings {
  id: UUID PRIMARY KEY
  user_id: UUID → auth.users (NOT NULL)
  openai_api_key: TEXT -- зашифрованный API ключ
  model: TEXT DEFAULT 'gpt-4'
  temperature: NUMERIC DEFAULT 0.7
  max_tokens: INTEGER DEFAULT 2048
  theme: TEXT DEFAULT 'light'
  created_at: TIMESTAMP DEFAULT NOW()
  updated_at: TIMESTAMP DEFAULT NOW()
}
```

### JSONB структуры

#### PersonalityFile (в personalities.files)
```typescript
{
  openai_file_id: string;     // ID файла в OpenAI
  file_name: string;          // имя файла
  file_size: number;          // размер в байтах
  file_type: string;          // тип файла (pdf, txt, docx...)
  status: 'uploading' | 'processing' | 'ready' | 'error';
  uploaded_at: string;        // ISO timestamp
  error_message?: string;     // сообщение об ошибке
}
```

### Расширения PostgreSQL
- **`uuid-ossp`** - генерация UUID
- **`vector`** (pgvector) - НЕ ИСПОЛЬЗУЕТСЯ (удалено)

---

## 📅 История миграций

### 🔄 Начальные миграции (ранняя разработка)

#### 2025-01-XX - Базовая структура
```sql
-- Создание основных таблиц: users, user_settings, chats, messages
-- RLS (Row Level Security) политики
-- Базовые индексы
```

**Статус:** ✅ Применено  
**Описание:** Фундаментальная структура для чатов и пользователей

#### 2025-01-XX - Добавление personalities
```sql
-- Таблица personalities для кастомных ассистентов
-- Связь с OpenAI assistant_id
-- Поля: name, prompt, has_memory, openai_assistant_id
```

**Статус:** ✅ Применено  
**Описание:** Система персонализированных ассистентов

### 🔄 Экспериментальные миграции (множественные итерации)

#### 2025-01-XX - Эксперименты с шифрованием
- Несколько попыток реализации шифрования API ключей
- Различные подходы к хранению зашифрованных данных
- **Статус:** 🔄 Множественные откаты и переделки

#### 2025-01-XX - Оптимизация индексов
- Эксперименты с индексами для производительности
- Различные стратегии индексации chat_id, user_id
- **Статус:** 🔄 Итеративные улучшения

### 📁 Активные миграции (2025-01-31)

#### `files-migration.sql` ✅ ПРИМЕНЕНА
```sql
-- Добавление JSONB поля files для множественных файлов
-- Замена старых одиночных полей на массив в JSONB
-- GIN индекс для быстрых запросов
-- Constraint на максимум 20 файлов
```

**Статус:** ✅ Применена успешно  
**Дата:** 2025-01-31  
**Скрипт:** `apply-files-migration.mjs`

#### `cleanup-legacy-fields.sql` ✅ ПРИМЕНЕНА
```sql
-- Удаление устаревших RAG полей:
-- DROP chunk_size, top_chunks, embedding_model, file_name
-- Очистка от старой архитектуры
```

**Статус:** ✅ Применена успешно  
**Дата:** 2025-01-31  
**Скрипт:** `cleanup-legacy-fields.mjs`

### 📁 Неактуальные миграции (файлы в репозитории)

#### `20250830143000_add_rag_support.sql`
```sql
-- Добавление поддержки RAG (Retrieval-Augmented Generation)
-- Таблица documents для хранения файлов
-- Таблица embeddings для векторного поиска
-- Включение pgvector расширения
-- Индексы для векторного поиска
```

**Статус:** ❌ НЕ ИСПОЛЬЗУЕТСЯ (устарела)  
**Назначение:** Старая RAG архитектура - заменена на OpenAI Files

#### `20250830160000_add_assistants_support.sql`
```sql
-- Расширение поддержки OpenAI Assistants
-- Добавление полей для file_instruction, uploaded_file_name
-- Метаданные для работы с файлами ассистентов
-- Обновление индексов и связей
```

**Статус:** ❌ НЕ ИСПОЛЬЗУЕТСЯ (устарела)  
**Назначение:** Заменена на новую files JSONB архитектуру

### 🛠️ Вспомогательные скрипты

#### `apply-rag-migration.mjs`
- Node.js скрипт для применения RAG миграции
- **Статус:** 📁 Готов к использованию

#### `apply-assistants-migration.mjs`
- Скрипт для применения миграции ассистентов
- **Статус:** 📁 Готов к использованию

#### `create-exec-function.sql`
- SQL функция для выполнения миграций
- **Статус:** 📁 Вспомогательный файл

---

## ⚠️ Известные проблемы и откаты

### Проблема с шифрованием API ключей
- **Проблема:** Множественные попытки реализации правильного шифрования
- **Решение:** Итеративное улучшение до стабильной версии
- **Статус:** ✅ Решено в финальной версии

### Конфликты миграций
- **Проблема:** Пересекающиеся изменения при экспериментах
- **Решение:** Откаты к стабильному состоянию
- **Статус:** ✅ Очищено

### Неопределенность с RAG таблицами
- **Проблема:** Миграции для RAG созданы но не протестированы
- **Текущий статус:** 🚧 Требует тестирования
- **План:** Проверить работоспособность в dev окружении

---

## 📋 План тестирования миграций

### Высокий приоритет
1. **Тестирование RAG миграции**
   ```bash
   node apply-rag-migration.mjs
   ```
   - Проверить создание таблиц `documents`, `embeddings`
   - Убедиться в работе pgvector расширения
   - Проверить индексы для векторного поиска

2. **Тестирование assistants миграции**
   ```bash
   node apply-assistants-migration.mjs
   ```
   - Проверить добавление полей в `personalities`
   - Убедиться в работе новых индексов

### Средний приоритет
3. **Проверка целостности данных**
   - Убедиться что существующие данные не повреждены
   - Проверить работу RLS политик
   - Валидация связей между таблицами

4. **Performance тестирование**
   - Проверить скорость векторного поиска
   - Оптимизировать индексы при необходимости

---

## 🎯 Будущие изменения БД

### Планируемые улучшения
- **Партиционирование** таблицы messages по дате
- **Архивирование** старых чатов
- **Индексы** для полнотекстового поиска
- **Материализованные представления** для аналитики

### RAG расширения
- **Метаданные документов** (тип файла, размер, дата создания)
- **Версионирование** embeddings при обновлении документов
- **Тэги и категории** для документов
- **Права доступа** к документам между пользователями

---

## 🔧 Полезные команды

### Проверка текущей схемы
```sql
-- Просмотр всех таблиц
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public';

-- Проверка расширений
SELECT * FROM pg_extension;

-- Проверка индексов
SELECT tablename, indexname, indexdef FROM pg_indexes 
WHERE schemaname = 'public';
```

### Мониторинг миграций
```bash
# Применение RAG миграции
node apply-rag-migration.mjs

# Применение assistants миграции  
node apply-assistants-migration.mjs

# Проверка логов миграции в Supabase Dashboard
```

---

## 🚀 MaaS (Memory as a Service) Таблицы

**Дата добавления:** 2025-02-05
**Статус:** ✅ РЕАЛИЗОВАНО И ПРОТЕСТИРОВАНО
**Проект:** Отдельный микросервис в `maas/`

### Обзор

Создано **9 таблиц** для системы Memory as a Service - интеллектуальной памяти для AI ассистентов.

**Состав:**
- ✋ **2 таблицы** созданы вручную (`projects`, `chats`)
- 🤖 **7 таблиц** из SQL миграции (`facts`, `thread_summaries`, `decisions`, `links`, `sources`, `maas_metrics`, `snapshot_cache`)

### Таблицы созданные вручную

#### 0. `projects` - Проекты MaaS ✋ ВРУЧНУЮ
```sql
projects {
  id: UUID PRIMARY KEY
  user_id: TEXT NOT NULL
  name: TEXT NOT NULL
  mission: TEXT
  goals: TEXT[]
  is_default: BOOLEAN DEFAULT false
  status: TEXT DEFAULT 'active'
  created_at: TIMESTAMPTZ DEFAULT NOW()
  updated_at: TIMESTAMPTZ DEFAULT NOW()
}
```

**Назначение:** Центральная таблица для организации MaaS памяти по проектам.
**Статус:** ✋ Создана вручную в Supabase Dashboard
**Связи:** Все остальные MaaS таблицы ссылаются на `projects.id`

#### 0.5 `chats` - Чаты ✋ ВРУЧНУЮ
```sql
chats {
  id: UUID PRIMARY KEY
  -- структура определяется основным приложением
}
```

**Назначение:** Хранение чатов (структура из основного приложения)
**Статус:** ✋ Создана вручную

### Таблицы из миграции MaaS

#### 1. `facts` - Факты и контекстная информация
```sql
facts {
  id: UUID PRIMARY KEY
  project_id: UUID → projects(id) ON DELETE CASCADE
  session_id: TEXT
  user_id: TEXT

  subject: TEXT NOT NULL                -- Тема факта
  value: JSONB NOT NULL                 -- Значение (гибкая структура)
  level: TEXT DEFAULT 'fact'            -- fact | insight | pattern | hypothesis
  source_type: TEXT DEFAULT 'inferred'  -- user_stated | inferred | observed | derived

  confidence: NUMERIC(3,2) DEFAULT 1.0  -- 0.0 - 1.0
  importance: INTEGER DEFAULT 5          -- 1 - 10

  tags: TEXT[] DEFAULT '{}'
  metadata: JSONB DEFAULT '{}'
  is_active: BOOLEAN DEFAULT true

  created_at: TIMESTAMPTZ DEFAULT NOW()
  updated_at: TIMESTAMPTZ DEFAULT NOW()
}

-- Индексы: project_id, session_id, user_id, subject, level, source_type, tags (GIN), value (GIN)
```

#### 2. `thread_summaries` - Саммари разговоров
```sql
thread_summaries {
  id: UUID PRIMARY KEY
  project_id: UUID → projects(id)
  session_id: TEXT
  thread_id: TEXT

  summary_text: TEXT NOT NULL
  summary_type: TEXT DEFAULT 'auto'  -- auto | manual | periodic

  message_count: INTEGER DEFAULT 0
  token_count: INTEGER DEFAULT 0

  first_message_at: TIMESTAMPTZ
  last_message_at: TIMESTAMPTZ

  keywords: TEXT[] DEFAULT '{}'
  topics: JSONB DEFAULT '[]'
  metadata: JSONB DEFAULT '{}'

  created_at: TIMESTAMPTZ
  updated_at: TIMESTAMPTZ
}

-- Индексы: project_id, session_id, thread_id, keywords (GIN), topics (GIN)
```

#### 3. `decisions` - Решения из разговоров
```sql
decisions {
  id: UUID PRIMARY KEY
  project_id: UUID → projects(id)
  session_id: TEXT

  decision_text: TEXT NOT NULL
  decision_type: TEXT NOT NULL  -- action | preference | plan | goal | constraint | other

  status: TEXT DEFAULT 'pending'  -- pending | in_progress | completed | cancelled | deferred
  outcome: TEXT
  priority: TEXT DEFAULT 'medium'  -- low | medium | high | urgent

  due_date: TIMESTAMPTZ
  completed_at: TIMESTAMPTZ

  tags: TEXT[]
  metadata: JSONB

  created_at: TIMESTAMPTZ
  updated_at: TIMESTAMPTZ
}

-- Индексы: project_id, session_id, decision_type, status, priority, tags (GIN)
```

#### 4. `links` - Связи между сущностями
```sql
links {
  id: UUID PRIMARY KEY
  project_id: UUID → projects(id)

  source_type: TEXT NOT NULL  -- fact | decision | summary | message | source | chat | other
  source_id: UUID NOT NULL

  target_type: TEXT NOT NULL  -- fact | decision | summary | message | source | chat | other
  target_id: UUID NOT NULL

  link_type: TEXT NOT NULL  -- related_to | derived_from | supports | contradicts | references | depends_on | other

  strength: NUMERIC(3,2) DEFAULT 1.0  -- 0.0 - 1.0
  metadata: JSONB

  created_at: TIMESTAMPTZ
}

-- Индексы: project_id, (source_type, source_id), (target_type, target_id), link_type
```

#### 5. `sources` - Внешние источники
```sql
sources {
  id: UUID PRIMARY KEY
  project_id: UUID → projects(id)

  source_type: TEXT NOT NULL  -- web | document | api | database | manual | other

  source_url: TEXT
  source_title: TEXT
  source_content: TEXT
  source_excerpt: TEXT

  author: TEXT
  published_at: TIMESTAMPTZ
  accessed_at: TIMESTAMPTZ DEFAULT NOW()

  credibility_score: NUMERIC(3,2) DEFAULT 0.5  -- 0.0 - 1.0

  tags: TEXT[]
  metadata: JSONB

  created_at: TIMESTAMPTZ
  updated_at: TIMESTAMPTZ
}

-- Индексы: project_id, source_type, source_url, tags (GIN), metadata (GIN)
```

#### 6. `maas_metrics` - Метрики использования
```sql
maas_metrics {
  id: UUID PRIMARY KEY
  project_id: UUID → projects(id)

  metric_type: TEXT NOT NULL  -- fact_created | fact_updated | decision_made | summary_generated | ...

  metric_value: NUMERIC
  metric_unit: TEXT

  entity_type: TEXT
  entity_id: UUID

  metadata: JSONB

  recorded_at: TIMESTAMPTZ DEFAULT NOW()
}

-- Индексы: project_id, metric_type, recorded_at, (entity_type, entity_id)
```

#### 7. `snapshot_cache` - Кеш снапшотов
```sql
snapshot_cache {
  id: UUID PRIMARY KEY
  project_id: UUID → projects(id)
  session_id: TEXT

  snapshot_type: TEXT NOT NULL  -- full | incremental | summary | context | other

  snapshot_data: JSONB NOT NULL

  version: INTEGER DEFAULT 1
  size_bytes: INTEGER

  expires_at: TIMESTAMPTZ
  last_accessed_at: TIMESTAMPTZ DEFAULT NOW()
  access_count: INTEGER DEFAULT 0

  metadata: JSONB

  created_at: TIMESTAMPTZ
}

-- Индексы: project_id, session_id, snapshot_type, expires_at, snapshot_data (GIN)
```

### Вспомогательные функции

#### `cleanup_expired_snapshots()`
Удаляет истекшие снапшоты из кеша.

#### `update_updated_at_column()`
Триггер-функция для автоматического обновления поля `updated_at`.

### Миграция

**Файл:** `maas/migrations/20250205000001_add_maas_tables_no_rls.sql`
**Применена:** 2025-02-05
**Метод:** Автоматический скрипт `maas/scripts/apply-step-by-step.mjs`

**Особенности:**
- RLS отключен для учебного проекта (для продакшена включить!)
- Все таблицы связаны с `projects` через `project_id`
- Используются GIN индексы для JSONB и массивов
- CHECK constraints для валидации данных
- Триггеры для `updated_at`

### Тестовые данные

**Создано:** 2025-02-05
**Скрипт:** `maas/scripts/create-test-data.mjs`

**Статистика из реальной БД (проверено):**
- ✅ 3 проекта (projects)
- ✅ 2 факта (MaaS Components, User Learning Goal)
- ✅ 1 thread summary (learning-session-1)
- ✅ 1 решение (использовать Supabase)
- ✅ 2 связи (fact→summary, decision→fact)
- ✅ 1 источник (Claude Code Documentation)
- ✅ 2 метрики (fact_created, summary_generated)
- ✅ 1 снапшот контекста

**Основной тестовый проект ID:** d16fd186-b648-42e2-bcb8-c61d32ded6d2

### Документация MaaS

**Расположение:** `maas/`

- `README.md` - Обзор структуры
- `APPLY_MIGRATION.md` - Инструкция по применению
- `STEP_4_QUERIES.sql` - SQL запросы для изучения

### Следующие шаги MaaS

- [ ] Интеграция с n8n workflow
- [ ] API endpoints для работы с памятью
- [ ] Векторный поиск по фактам
- [ ] Автоматическое извлечение фактов из разговоров
- [ ] Dashboard для визуализации связей

---

## 📊 Финальный статус структуры БД

**Дата:** 2025-02-05
**Статус:** ✅ РАСШИРЕНА - ДОБАВЛЕНЫ 9 MAAS ТАБЛИЦ

### Полный состав таблиц в БД

**Основное приложение (4 таблицы):**
- `users` - пользователи
- `personalities` - AI ассистенты
- `chats` - чаты (также используется в MaaS)
- `messages` - сообщения

**MaaS микросервис (9 таблиц):**
- ✋ `projects` - проекты (создана вручную)
- ✋ `chats` - чаты (создана вручную, общая с основным приложением)
- 🤖 `facts` - факты
- 🤖 `thread_summaries` - саммари тредов
- 🤖 `decisions` - решения
- 🤖 `links` - связи между сущностями
- 🤖 `sources` - внешние источники
- 🤖 `maas_metrics` - метрики
- 🤖 `snapshot_cache` - кеш снапшотов

**ИТОГО:** 12 таблиц (3 основные + 1 общая + 8 MaaS)

### ✅ Применено
- [x] Добавлено JSONB поле `files` для множественных файлов
- [x] Удалены все legacy RAG поля 
- [x] Создан GIN индекс для JSONB queries
- [x] Добавлен constraint на максимум 20 файлов
- [x] Обновлены TypeScript типы

### 🎯 Готово к реализации
- **OpenAI Files API** - загрузка/удаление файлов
- **UI компоненты** - работа с files массивом
- **Store методы** - синхронизация с OpenAI и БД

### 🚫 Удалено навсегда
- ❌ `chunk_size`, `top_chunks`, `embedding_model` (RAG поля)
- ❌ `file_name` (одиночный файл)
- ❌ Старые миграции RAG архитектуры

---

*Ведется разработчиком проекта для отслеживания всех изменений схемы БД*
*Последнее обновление: 2025-02-05 - Добавлены 9 MaaS таблиц (2 вручную + 7 миграция), создан учебный проект с тестовыми данными. Проверено через full-check.mjs - все 12 таблиц в БД.*