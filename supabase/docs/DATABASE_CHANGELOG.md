# Database Changelog

**Проект:** ChatOpenAI Integration Assistant
**База данных:** Supabase PostgreSQL
**Последнее обновление:** 2025-02-29

---

## 📊 Current Schema (14 Tables)

### Core Application (4 tables)
- `personalities` - AI assistants
- `chats` - user chats
- `messages` - chat messages
- `user_settings` - user preferences

### Memory System: Library 📚 (1 table)
- `document_chunks` - global knowledge base (public + private documents)

### Memory System: Desk 💼 (1 table)
- `personality_embeddings` - assistant-specific files

### Memory System: Diary 📓 (8 MaaS tables)
- `projects` - MaaS projects
- `facts` - conversation facts
- `thread_summaries` - thread summaries
- `decisions` - user decisions
- `links` - entity relationships
- `sources` - external sources
- `maas_metrics` - usage metrics
- `snapshot_cache` - snapshot cache

**Extensions:** uuid-ossp, pgvector (для векторного поиска)

---

## 🚀 Recent Changes (February 2025)

### 2025-02-29 - Unified Memory System Complete ✅

**Migration:** `20250229000002_migrate_maas_tables.sql`

**Created:**
- 8 MaaS tables migrated to unified database
- Foreign keys: все таблицы → `projects(id)`
- Indexes: GIN for JSONB, B-tree for filters
- Triggers: auto-update `updated_at`

**document_chunks integration:**
- Table already existed (integrated via TypeScript)
- pgvector extension (vector 1536)
- 6 indexes (ivfflat, GIN, FTS)
- 4 RLS policies
- SQL function: `search_document_chunks()`

**Result:** 14 tables in single database - all three memory types unified!

---

### 2025-01-31 - Files Migration ✅

**Migration:** `files-migration.sql`

**Changes:**
- Added `files` JSONB field to `personalities` (array of PersonalityFile[])
- GIN index for fast JSONB queries
- Constraint: max 20 files per personality
- Removed legacy RAG fields

---

## 📋 Database Commands

### Check schema
```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public';
```

### Check extensions
```sql
SELECT * FROM pg_extension;
```

### Vector search example
```sql
SELECT * FROM search_document_chunks(
  query_embedding := '[0.1, 0.2, ...]'::vector,
  match_threshold := 0.7,
  match_count := 5
);
```

---

<details>
<summary>📁 Archive (2024-2025) - Click to expand</summary>

## 📅 История миграций (Archive)

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

### 📁 Неактуальные миграции (файлы в репозитории)

#### `20250830143000_add_rag_support.sql`
**Статус:** ❌ НЕ ИСПОЛЬЗУЕТСЯ (устарела)
**Назначение:** Старая RAG архитектура - заменена на OpenAI Files

#### `20250830160000_add_assistants_support.sql`
**Статус:** ❌ НЕ ИСПОЛЬЗУЕТСЯ (устарела)
**Назначение:** Заменена на новую files JSONB архитектуру

### ⚠️ Известные проблемы и откаты

#### Проблема с шифрованием API ключей
- **Проблема:** Множественные попытки реализации правильного шифрования
- **Решение:** Итеративное улучшение до стабильной версии
- **Статус:** ✅ Решено в финальной версии

#### Конфликты миграций
- **Проблема:** Пересекающиеся изменения при экспериментах
- **Решение:** Откаты к стабильному состоянию
- **Статус:** ✅ Очищено

### 📊 Detailed Schema (Archive)

#### `personalities` - настраиваемые ассистенты OpenAI
```sql
personalities {
  id: UUID PRIMARY KEY
  user_id: UUID → auth.users (NOT NULL)
  name: TEXT (NOT NULL)
  description: TEXT
  prompt: TEXT (NOT NULL)
  is_active: BOOLEAN DEFAULT true
  has_memory: BOOLEAN DEFAULT true
  files: JSONB DEFAULT '[]'
  file_instruction: TEXT
  openai_assistant_id: TEXT
  openai_file_id: TEXT

  -- Legacy RAG fields (removed):
  -- file_name, file_content, uploaded_at
  -- chunk_size, top_chunks, embedding_model

  created_at: TIMESTAMP DEFAULT NOW()
  updated_at: TIMESTAMP DEFAULT NOW()
}

-- Индексы:
-- personalities_user_id_idx (на user_id для RLS)
-- personalities_active_idx (на is_active WHERE is_active = true)
-- personalities_assistant_id_idx (на openai_assistant_id)
```

#### `document_chunks` - БИБЛИОТЕКА 📚
```sql
document_chunks {
  id: UUID PRIMARY KEY
  user_id: UUID (nullable - для публичных документов)
  is_public: BOOLEAN
  project_id: UUID

  content: TEXT
  embedding: VECTOR(1536)

  file_name: TEXT
  file_type: TEXT
  metadata: JSONB

  created_at: TIMESTAMPTZ
  updated_at: TIMESTAMPTZ
}
```

#### MaaS Tables - ДНЕВНИК 📓

##### `projects`
```sql
projects {
  id: UUID PRIMARY KEY
  user_id: TEXT NOT NULL
  name: TEXT NOT NULL
  mission: TEXT
  goals: TEXT[]
  is_default: BOOLEAN DEFAULT false
  status: TEXT DEFAULT 'active'
  created_at: TIMESTAMPTZ
  updated_at: TIMESTAMPTZ
}
```

##### `facts`
```sql
facts {
  id: UUID PRIMARY KEY
  project_id: UUID → projects(id)
  session_id: TEXT
  user_id: TEXT

  subject: TEXT NOT NULL
  value: JSONB NOT NULL
  level: TEXT DEFAULT 'fact'
  source_type: TEXT DEFAULT 'inferred'

  confidence: NUMERIC(3,2) DEFAULT 1.0
  importance: INTEGER DEFAULT 5

  tags: TEXT[]
  metadata: JSONB
  is_active: BOOLEAN DEFAULT true

  created_at: TIMESTAMPTZ
  updated_at: TIMESTAMPTZ
}
```

##### `thread_summaries`
```sql
thread_summaries {
  id: UUID PRIMARY KEY
  project_id: UUID → projects(id)
  session_id: TEXT
  thread_id: TEXT

  summary_text: TEXT NOT NULL
  summary_type: TEXT DEFAULT 'auto'

  message_count: INTEGER DEFAULT 0
  token_count: INTEGER DEFAULT 0

  first_message_at: TIMESTAMPTZ
  last_message_at: TIMESTAMPTZ

  keywords: TEXT[]
  topics: JSONB
  metadata: JSONB

  created_at: TIMESTAMPTZ
  updated_at: TIMESTAMPTZ
}
```

##### `decisions`
```sql
decisions {
  id: UUID PRIMARY KEY
  project_id: UUID → projects(id)
  session_id: TEXT

  decision_text: TEXT NOT NULL
  decision_type: TEXT NOT NULL

  status: TEXT DEFAULT 'pending'
  outcome: TEXT
  priority: TEXT DEFAULT 'medium'

  due_date: TIMESTAMPTZ
  completed_at: TIMESTAMPTZ

  tags: TEXT[]
  metadata: JSONB

  created_at: TIMESTAMPTZ
  updated_at: TIMESTAMPTZ
}
```

##### `links`
```sql
links {
  id: UUID PRIMARY KEY
  project_id: UUID → projects(id)

  source_type: TEXT NOT NULL
  source_id: UUID NOT NULL

  target_type: TEXT NOT NULL
  target_id: UUID NOT NULL

  link_type: TEXT NOT NULL

  strength: NUMERIC(3,2) DEFAULT 1.0
  metadata: JSONB

  created_at: TIMESTAMPTZ
}
```

##### `sources`
```sql
sources {
  id: UUID PRIMARY KEY
  project_id: UUID → projects(id)

  source_type: TEXT NOT NULL
  source_url: TEXT
  source_title: TEXT
  source_content: TEXT
  source_excerpt: TEXT

  author: TEXT
  published_at: TIMESTAMPTZ
  accessed_at: TIMESTAMPTZ DEFAULT NOW()

  credibility_score: NUMERIC(3,2) DEFAULT 0.5

  tags: TEXT[]
  metadata: JSONB

  created_at: TIMESTAMPTZ
  updated_at: TIMESTAMPTZ
}
```

##### `maas_metrics`
```sql
maas_metrics {
  id: UUID PRIMARY KEY
  project_id: UUID → projects(id)

  metric_type: TEXT NOT NULL
  metric_value: NUMERIC
  metric_unit: TEXT

  entity_type: TEXT
  entity_id: UUID

  metadata: JSONB
  recorded_at: TIMESTAMPTZ DEFAULT NOW()
}
```

##### `snapshot_cache`
```sql
snapshot_cache {
  id: UUID PRIMARY KEY
  project_id: UUID → projects(id)
  session_id: TEXT

  snapshot_type: TEXT NOT NULL
  snapshot_data: JSONB NOT NULL

  version: INTEGER DEFAULT 1
  size_bytes: INTEGER

  expires_at: TIMESTAMPTZ
  last_accessed_at: TIMESTAMPTZ DEFAULT NOW()
  access_count: INTEGER DEFAULT 0

  metadata: JSONB
  created_at: TIMESTAMPTZ
}
```

### JSONB структуры

#### PersonalityFile (в personalities.files)
```typescript
{
  openai_file_id: string;
  file_name: string;
  file_size: number;
  file_type: string;
  status: 'uploading' | 'processing' | 'ready' | 'error';
  uploaded_at: string;
  error_message?: string;
}
```

</details>

---

*Ведется разработчиком проекта для отслеживания изменений схемы БД*
*Последнее обновление: 2025-02-29*
