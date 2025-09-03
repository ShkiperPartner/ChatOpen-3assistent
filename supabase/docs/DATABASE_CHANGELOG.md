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
  prompt: TEXT (NOT NULL) -- базовый системный промпт
  is_active: BOOLEAN DEFAULT false -- активная личность
  has_memory: BOOLEAN DEFAULT true -- память разговоров
  created_at: TIMESTAMP DEFAULT NOW()
  updated_at: TIMESTAMP DEFAULT NOW()
  openai_assistant_id: TEXT -- ID ассистента в OpenAI
  files: JSONB DEFAULT '[]' -- массив файлов PersonalityFile[]
  file_instruction: TEXT -- общая инструкция для всех файлов
}

-- Индексы:
-- personalities_files_gin_idx (GIN на files)
-- personalities_assistant_id_idx (на openai_assistant_id)

-- Constraints:
-- personalities_files_limit: jsonb_array_length(files) <= 20
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

## 📊 Финальный статус структуры БД

**Дата:** 2025-01-31  
**Статус:** ✅ СТАБИЛЬНАЯ И ОЧИЩЕННАЯ

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
*Последнее обновление: 2025-01-31 - Структура очищена и готова к файловому функционалу*