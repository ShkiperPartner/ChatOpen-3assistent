# Project Architecture & Roadmap

**Проект:** ChatOpenAI Integration Assistant
**Цель:** AI Partnership Operating System
**Текущая Phase:** 2 (Unified Memory System - Infrastructure Ready!)
**Последнее обновление:** 2025-02-29

---

## 🎯 Meta-Goal (из VISION.md)

> Это не "еще один ChatGPT wrapper"
> Это ОПЕРАЦИОННАЯ СИСТЕМА для AI Partnership

**North Star:**
- Knowledge Accumulation (знания не теряются)
- Context Continuity (память между сессиями)
- Shared Intelligence (AI делятся знаниями)
- Autonomous Partnership (проактивный помощник)

---

## 📊 Текущий статус системы

### ✅ Phase 1: Foundation (100% ЗАВЕРШЕНА!)

**Что работает:**
- ✅ Базовый чат с OpenAI Assistants API
- ✅ Multi-personality system (разные AI помощники)
- ✅ Persistent chat history (Supabase)
- ✅ File attachments через OpenAI Files API
- ✅ Zustand state management
- ✅ RLS security policies

### 🎉 Phase 2: Unified Memory System - Infrastructure (ЗАВЕРШЕНА!)

**Что достигнуто (2025-02-29):**
- ✅ Unified Database (14 таблиц в одном проекте)
- ✅ 📚 БИБЛИОТЕКА (document_chunks) - интегрирована
- ✅ 💼 РАБОЧИЙ СТОЛ (personality_embeddings) - работает
- ✅ 📓 ДНЕВНИК (8 MaaS tables) - мигрированы
- ✅ TypeScript типы для всех таблиц памяти
- ✅ SQL миграции применены и задокументированы

**В процессе:**
- 🔄 Memory Service API (Sprint 3)
- 🔄 UI Components (Sprint 4)
- 🔄 AI Integration (Sprint 5)

**Основные компоненты:**
```
src/
├── components/
│   ├── Chat.tsx              # Основной UI чата
│   ├── Personalities.tsx     # Управление AI помощниками
│   └── Settings.tsx          # Настройки пользователя
├── store/
│   └── useStore.ts           # Zustand store (центральное состояние)
├── lib/
│   ├── openai.ts             # OpenAI API service
│   └── supabase.ts           # Supabase client + типы
└── api/
    └── (будущий Memory Service)
```

---

## 🧠 Ключевое открытие сессии: Три типа памяти

**Дата:** 2025-01-31
**Инсайт:** Система уже имеет ТРИ различных типа памяти!

### Концепция трёх типов памяти:

```
┌─────────────────────────────────────────────┐
│  Три типа памяти для AI-помощника           │
├─────────────────────────────────────────────┤
│                                             │
│  📚 БИБЛИОТЕКА (document_chunks)            │
│     Глобальная база знаний                  │
│     Публичные + приватные документы         │
│     Векторный поиск по всем файлам          │
│                                             │
│  💼 РАБОЧИЙ СТОЛ (personality_embeddings)   │
│     Файлы для конкретного помощника         │
│     Каждый personality видит только свои    │
│     Специализированная информация           │
│                                             │
│  📓 ДНЕВНИК (MaaS tables)                   │
│     Память о разговорах                     │
│     Facts, decisions, summaries             │
│     Контекст между сессиями                 │
│                                             │
└─────────────────────────────────────────────┘
```

### Аналогия (для понимания):

| Тип памяти | Аналогия | Пример |
|------------|----------|---------|
| 📚 БИБЛИОТЕКА | Офисная библиотека | "Руководство по React", "Material Design Guide" |
| 💼 РАБОЧИЙ СТОЛ | Личный стол сотрудника | Дизайнер видит файлы дизайна, программист - код |
| 📓 ДНЕВНИК | Блокнот о клиенте | "Пользователь любит тёмную тему", "Решили начать с iOS" |

---

## ✅ Unified Database - РЕАЛИЗОВАНО!

**Обнаружено:** 2025-01-31
**Решено:** 2025-02-29

### ~~Было (Проблема):~~

```
Supabase Проект А: "ChatApp"
├── personalities ✅
├── personality_embeddings ✅
├── chats ✅
├── messages ✅
└── document_chunks ❌ (НЕ СОЗДАНА)

Supabase Проект Б: "MaaS"
├── projects ✅
├── facts ✅
... (8 таблиц отдельно)
```

**Проблемы были:**
- ❌ Нельзя делать JOIN между проектами
- ❌ Нет foreign keys между базами
- ❌ Сложная архитектура

### Стало (Решение):

```
✅ Supabase Проект А (tslfszdhvmszbazutcdi.supabase.co)
├── ЧАТ-ПРИЛОЖЕНИЕ (4)
│   ├── chats ✅
│   ├── messages ✅
│   ├── personalities ✅
│   └── user_settings ✅
│
├── ПАМЯТЬ: РАБОЧИЙ СТОЛ 💼 (1)
│   └── personality_embeddings ✅
│
├── ПАМЯТЬ: БИБЛИОТЕКА 📚 (1)
│   └── document_chunks ✅
│
└── ПАМЯТЬ: ДНЕВНИК 📓 (8 MaaS)
    ├── projects ✅
    ├── facts ✅
    ├── thread_summaries ✅
    ├── decisions ✅
    ├── links ✅
    ├── sources ✅
    ├── maas_metrics ✅
    └── snapshot_cache ✅

ИТОГО: 14 таблиц в ЕДИНОЙ БД! 🎉
```

**Преимущества:**
- ✅ JOIN между всеми таблицами
- ✅ Foreign keys работают
- ✅ Простая архитектура
- ✅ Type-safe TypeScript интеграция

---

## 🚀 Unified Memory System (Phase 2)

### ✅ Цель достигнута: Все три типа памяти в одной БД!

**Архитектура реализована (2025-02-29):**

```
┌──────────────────────────────────────────────┐
│  Supabase Проект А: tslfszdhvmszbazutcdi     │
│  (Единая база данных - 14 таблиц)           │
├──────────────────────────────────────────────┤
│                                              │
│  📱 ЧАТ-ПРИЛОЖЕНИЕ                           │
│  ├── chats ✅                                │
│  ├── messages ✅                             │
│  ├── personalities ✅                        │
│  └── user_settings ✅                        │
│                                              │
│  💼 РАБОЧИЙ СТОЛ                             │
│  └── personality_embeddings ✅               │
│                                              │
│  📚 БИБЛИОТЕКА                               │
│  └── document_chunks ✅ ИНТЕГРИРОВАНА        │
│                                              │
│  📓 ДНЕВНИК (MaaS)                           │
│  ├── projects ✅ МИГРИРОВАНО                 │
│  ├── facts ✅                                │
│  ├── thread_summaries ✅                     │
│  ├── decisions ✅                            │
│  ├── links ✅                                │
│  ├── sources ✅                              │
│  ├── maas_metrics ✅                         │
│  └── snapshot_cache ✅                       │
│                                              │
└──────────────────────────────────────────────┘

**Infrastructure Status:** ✅ ГОТОВО (Sprint 1-2 завершены)
**Next Steps:** Memory Service API → UI → AI Integration
```

---

## 📋 Roadmap: Phase 2 (Unified Memory System)

### ✅ Sprint 1: Миграция MaaS - ЗАВЕРШЁН! (2025-02-29)

**Задачи:**
- ✅ ~~Экспорт данных из Проекта Б~~ (не требуется, начали с чистого листа)
- ✅ Применить миграцию MaaS tables в Проект А
- ✅ Проверка целостности данных (все 8 таблиц созданы)
- ✅ Обновить TypeScript типы (8 interfaces добавлены)

**Миграционный файл:** `supabase/migrations/20250229000002_migrate_maas_tables.sql`

**Deliverable:** ✅ 📓 ДНЕВНИК в единой БД

**Результат:**
- 8 MaaS таблиц успешно созданы
- Foreign keys работают
- TypeScript типы: Project, Fact, ThreadSummary, Decision, Link, Source, MaasMetric, SnapshotCache

---

### ✅ Sprint 2: document_chunks - ЗАВЕРШЁН! (2025-02-29)

**Задачи:**
- ✅ ~~Создать таблицу~~ (уже существовала!)
- ✅ Интегрировать в TypeScript (DocumentChunk interface)
- ✅ Проверить структуру (векторный поиск работает)
- ✅ Документировать (DATABASE_CHANGELOG.md обновлен)

**Миграционный файл:** `supabase/migrations/20250229000001_create_document_chunks.sql` (уже применена ранее)

**Deliverable:** ✅ 📚 БИБЛИОТЕКА готова

**Результат:**
- document_chunks уже работала в проекте
- Добавлена TypeScript интеграция
- SQL функция `search_document_chunks()` доступна
- Векторные индексы (ivfflat) активны

---

### 🔵 Sprint 3: Memory Service API - В ПРОЦЕССЕ! (2025-02-29)

**Задачи:**
- ✅ Создать `src/api/memory-service.ts`
- ✅ Реализовать `searchMemory()` с тремя источниками
- ✅ Векторизация query через OpenAI embeddings
- ✅ Ранжирование результатов по relevance
- ✅ Тестовый скрипт (scripts/test-memory-service.mjs)
- 🔄 Unit тесты (в процессе)
- 🔄 Проверка в реальных условиях

**Архитектура Memory Service:**

```
Memory Service API
├── searchMemory(query, user_id, personality_id, project_id)
    ├── searchLibrary()     📚 document_chunks
    ├── searchDesk()        💼 personality_embeddings
    └── searchDiary()       📓 MaaS facts

    → Объединение результатов
    → Ранжирование по relevance
    → Возврат unified context
```

**Deliverable:** 🔄 API объединяет три источника

---

### 🟣 Sprint 4: UI Components (1-2 недели)

**Задачи:**
- [ ] `MemoryLibrary.tsx` - управление библиотекой
- [ ] `MemoryDiary.tsx` - просмотр facts/decisions
- [ ] `MemoryExplorer.tsx` - общий UI для памяти
- [ ] Визуализация источников в чате ([📚], [💼], [📓])

**UI компоненты:**
```
src/components/
├── memory/
│   ├── MemoryLibrary.tsx      📚 Библиотека
│   ├── MemoryDiary.tsx        📓 Дневник
│   ├── MemoryExplorer.tsx     🔍 Обзор памяти
│   └── MemorySourceBadge.tsx  🏷️ Badges источников
```

**Deliverable:** 🎨 UI для трёх типов памяти

---

### 🎯 Sprint 5: Интеграция в чат (1 неделя)

**Задачи:**
- [ ] Обновить `useStore.sendMessage()` с Memory Service
- [ ] Enriched context для AI (библиотека + стол + дневник)
- [ ] Автоматическая экстракция facts из ответов
- [ ] Настройки memory (включить/выключить источники)

**Интеграция:**
```typescript
// src/store/useStore.ts
sendMessage: async (content: string) => {
  // 1. Получить unified context
  const memoryContext = await searchMemory({
    query: content,
    user_id: userId,
    personality_id: activePersonality.id,
    project_id: currentProjectId,
  });

  // 2. Обогатить сообщение контекстом
  const enrichedMessage = `
    ${content}

    [Context from memory:]
    📚 ${libraryContext}
    💼 ${deskContext}
    📓 ${diaryContext}
  `;

  // 3. Отправить в OpenAI
  await openaiService.sendMessage(enrichedMessage);

  // 4. Автоэкстракция facts (Phase 2+)
  await extractFacts(response);
}
```

**Deliverable:** ✅ **Phase 2 COMPLETE!**

---

## 🎯 Phase 2 Completion Criteria

**Phase 2 считается завершённой когда:**

- ✅ Все три типа памяти в одной БД
- ✅ Memory Service API работает
- ✅ AI видит unified context при ответе
- ✅ UI для управления памятью
- ✅ Автоэкстракция facts из разговоров
- ✅ Пользователь может:
  - Загружать документы в библиотеку (публичные/приватные)
  - Прикреплять файлы к personalities (рабочий стол)
  - Просматривать facts/decisions из разговоров (дневник)
  - AI автоматически использует все три источника

**Метрика успеха:**
AI помощник отвечает с учётом:
- Документов из библиотеки
- Файлов personality
- Фактов из прошлых разговоров

→ **Context Continuity между сессиями!**

---

## 🏗️ Технические детали

### Database Schema (после унификации)

**Основные таблицы (13 шт):**

```sql
-- ЧАТ-ПРИЛОЖЕНИЕ (4)
chats                      -- разговоры
messages                   -- сообщения
personalities              -- AI помощники
user_settings              -- настройки пользователя

-- ПАМЯТЬ: РАБОЧИЙ СТОЛ (1)
personality_embeddings     -- файлы для personalities

-- ПАМЯТЬ: БИБЛИОТЕКА (1)
document_chunks            -- глобальная база знаний

-- ПАМЯТЬ: ДНЕВНИК (8)
projects                   -- MaaS проекты
facts                      -- факты из разговоров
thread_summaries           -- саммари тредов
decisions                  -- решения пользователя
links                      -- связи между сущностями
sources                    -- внешние источники
maas_metrics               -- метрики использования
snapshot_cache             -- кеш снапшотов
```

### Векторный поиск

**Три SQL функции:**
```sql
-- 📚 Поиск в библиотеке
search_document_chunks(
  query_embedding VECTOR(1536),
  user_id UUID,
  project_id UUID
) → релевантные чанки

-- 💼 Поиск на рабочем столе
search_personality_embeddings(
  query_embedding VECTOR(1536),
  personality_id UUID
) → релевантные чанки для personality

-- 📓 Поиск в дневнике
-- (через стандартные Supabase queries по facts)
```

### API Endpoints (планируемые)

```
GET  /api/memory/context
POST /api/memory/search
POST /api/memory/library/upload
POST /api/memory/facts/extract
GET  /api/memory/diary/{project_id}
```

---

## 🔮 Phase 3-4 (будущее)

### Phase 3: Cross-Assistant Memory

**Цель:** Shared intelligence между AI помощниками

- Shared memory pool
- Knowledge transfer между assistants
- Context handoff (передача контекста)
- AI ↔ AI collaborative discussions

### Phase 4: Autonomous Collaboration

**Цель:** Проактивный AI партнер

- Proactive insights (AI сам предлагает идеи)
- Progress tracking & reminders
- Conflict detection (противоречия в планах)
- Trend analysis (что работает, что нет)
- Autonomous task breakdown

---

## 📊 Метрики проекта

### Текущие метрики:

- **Phase 1 Progress:** 95%
- **Code Coverage:** N/A (нужны тесты)
- **Database Tables:** 5 (чат) + 1 (рабочий стол) = 6
- **После миграции:** 6 + 8 (дневник) + 1 (библиотека) = 15 таблиц

### North Star Metrics (из VISION.md):

- ✅ Knowledge Accumulation: 60% (есть persistence, нет унификации)
- 🔄 Context Continuity: 40% (базовая история, нет памяти между типами)
- ❌ Shared Intelligence: 0% (нет кросс-assistant memory)
- ❌ Autonomous Partnership: 0% (нет проактивности)

**После Phase 2:**
- ✅ Knowledge Accumulation: 90%
- ✅ Context Continuity: 85%
- 🔄 Shared Intelligence: 30%
- 🔄 Autonomous Partnership: 20%

---

## 🔧 Tech Stack

**Frontend:**
- React + TypeScript
- Zustand (state management)
- Tailwind CSS

**Backend:**
- Supabase (PostgreSQL + Auth + Storage)
- OpenAI Assistants API
- pgvector (векторный поиск)

**AI/ML:**
- OpenAI GPT-4
- text-embedding-3-small (1536 dimensions)

**DevOps:**
- Git + GitHub
- Supabase CLI
- Node.js scripts для миграций

---

## 📝 Важные заметки

### Архитектурные решения:

1. **Файлы в OpenAI, метаданные в БД**
   - Реальные файлы → OpenAI Files API
   - Метаданные → personalities.files (JSONB)
   - Векторы → personality_embeddings / document_chunks

2. **Гибридный доступ к библиотеке**
   - `user_id = NULL && is_public = true` → публичные
   - `user_id = X && is_public = false` → приватные
   - `user_id = X && is_public = true` → созданы user, но все видят

3. **MaaS как микросервис**
   - Отдельные таблицы, но в той же БД
   - Связь через project_id
   - Можно расширять независимо

### Известные ограничения:

- OpenAI API rate limits
- pgvector списки=100 (для <1M vectors)
- Supabase free tier ограничения
- RLS overhead на больших датасетах

### Технический долг:

- [ ] Нет unit тестов
- [ ] Нет error boundaries в React
- [ ] Bundle size не оптимизирован
- [ ] Нет code splitting

---

## 🎓 Lessons Learned (сессия 2025-01-31)

### Ключевые инсайты:

1. **Ritual-First подход работает**
   - Начали с VISION.md → поняли big picture
   - Все решения aligned с meta-goal

2. **Концепция трёх типов памяти**
   - Простая аналогия помогла понять архитектуру
   - Библиотека/Стол/Дневник → интуитивно понятно

3. **Разделённые БД → проблема**
   - Обнаружили критичную проблему рано
   - Решение: миграция в единую БД

4. **Unified Memory System = Phase 2**
   - MaaS уже существует (infrastructure готова!)
   - Нужна только интеграция → быстрый ROI

### Что не делать:

- ❌ Не создавать feature без понимания meta-goal
- ❌ Не разделять связанные данные по разным БД
- ❌ Не игнорировать VISION.md при принятии решений

---

## 📦 Созданные файлы (Sprint 3 - Memory Service API)

**Дата:** 2025-02-29

### API & Services

**`src/api/memory-service.ts`** - Memory Service API (✅ СОЗДАН)
- MemoryService class с unified search
- searchMemory() - главный метод
- searchLibrary() - поиск в document_chunks
- searchDesk() - поиск в personality_embeddings
- searchDiary() - поиск в MaaS tables
- OpenAI embeddings integration
- ~600 строк кода, полностью типизирован

### Testing & Scripts

**`scripts/test-memory-service.mjs`** - Тестовый скрипт (✅ СОЗДАН)
- Проверка database connection
- Проверка существования таблиц
- Тест SQL функции search_document_chunks()
- E2E тест Memory Service

**Запуск:**
```bash
node scripts/test-memory-service.mjs
```

### Documentation

**`SPRINT_3_MEMORY_SERVICE.md`** - План Sprint 3 (✅ СОЗДАН)
- Детальный roadmap
- Testing Session план
- Критерии завершения

---

## 📚 Связанные документы

- `VISION.md` - Meta-goal и стратегия (ЧИТАТЬ ПЕРВЫМ!)
- `CLAUDE.md` - Рабочие инструкции для разработки
- `DATABASE_CHANGELOG.md` - История изменений БД
- `SPRINT_3_MEMORY_SERVICE.md` - Sprint 3 roadmap
- `README.md` - Общая информация о проекте

---

*Последнее обновление: 2025-02-29*
*Текущий Sprint: 3 (Memory Service API - В ПРОЦЕССЕ)*
*Следующий review: после Testing Session*
*Maintainer: Development Team*
