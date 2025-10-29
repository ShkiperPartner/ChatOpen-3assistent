# Project Architecture & Roadmap

**Проект:** ChatOpenAI Integration Assistant
**Цель:** AI Partnership Operating System
**Текущая Phase:** 1 → 2 (Transition)
**Последнее обновление:** 2025-01-31

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

### ✅ Phase 1: Foundation (95% завершено)

**Что работает:**
- ✅ Базовый чат с OpenAI Assistants API
- ✅ Multi-personality system (разные AI помощники)
- ✅ Persistent chat history (Supabase)
- ✅ File attachments через OpenAI Files API
- ✅ Zustand state management
- ✅ RLS security policies

**В процессе:**
- 🔄 File upload UI для personalities
- 🔄 Стабилизация базовой функциональности

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

## 🚨 Критическая проблема: Разделённые БД

**Обнаружено:** 2025-01-31

### Текущее состояние:

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
├── thread_summaries ✅
├── decisions ✅
├── links ✅
├── sources ✅
├── maas_metrics ✅
└── snapshot_cache ✅
```

**Проблема:**
- ❌ Нельзя делать JOIN между проектами
- ❌ Нет foreign keys между базами
- ❌ Сложная архитектура с HTTP запросами

**Решение:**
✅ **Мигрировать MaaS в Проект А** → Единая БД!

---

## 🚀 Unified Memory System (Phase 2)

### Цель: Объединить все три типа памяти в одну БД

**Архитектура после миграции:**

```
┌──────────────────────────────────────────────┐
│  Supabase Проект А: "ChatApp"                │
│  (Единая база данных)                        │
├──────────────────────────────────────────────┤
│                                              │
│  📱 ЧАТ-ПРИЛОЖЕНИЕ                           │
│  ├── chats                                   │
│  ├── messages                                │
│  ├── personalities                           │
│  └── user_settings                           │
│                                              │
│  💼 РАБОЧИЙ СТОЛ                             │
│  └── personality_embeddings ✅               │
│                                              │
│  📚 БИБЛИОТЕКА                               │
│  └── document_chunks 🔨 СОЗДАТЬ              │
│                                              │
│  📓 ДНЕВНИК (MaaS)                           │
│  ├── projects 🔄 МИГРИРОВАТЬ                 │
│  ├── facts 🔄                                │
│  ├── thread_summaries 🔄                     │
│  ├── decisions 🔄                            │
│  ├── links 🔄                                │
│  ├── sources 🔄                              │
│  ├── maas_metrics 🔄                         │
│  └── snapshot_cache 🔄                       │
│                                              │
└──────────────────────────────────────────────┘
```

---

## 📋 Roadmap: Phase 1 → Phase 2

### 🟢 Sprint 1: Миграция MaaS (1 неделя)

**Задачи:**
- [ ] Экспорт данных из Проекта Б (если есть)
- [ ] Применить миграцию MaaS tables в Проект А
- [ ] Проверка целостности данных
- [ ] Обновить TypeScript типы

**Миграционный файл:** `supabase/migrations/20250229000000_unified_memory_system.sql`

**Deliverable:** 📓 ДНЕВНИК в единой БД

---

### 🟡 Sprint 2: Создать document_chunks (1 неделя)

**Задачи:**
- [ ] Создать таблицу document_chunks
- [ ] Реализовать гибридный доступ (публичные + приватные)
- [ ] SQL функция `search_document_chunks()`
- [ ] Векторные индексы (ivfflat)
- [ ] RLS политики

**Структура document_chunks:**
```sql
document_chunks {
  id: UUID
  user_id: UUID          -- NULL = публичный
  is_public: BOOLEAN     -- true = все видят
  project_id: UUID       -- связь с MaaS projects

  content: TEXT
  embedding: VECTOR(1536)

  file_name: TEXT
  file_type: TEXT
  metadata: JSONB
}
```

**Deliverable:** 📚 БИБЛИОТЕКА готова

---

### 🔵 Sprint 3: Memory Service API (1-2 недели)

**Задачи:**
- [ ] Создать `src/api/memory-service.ts`
- [ ] Реализовать `searchMemory()` с тремя источниками
- [ ] Векторизация query через OpenAI embeddings
- [ ] Ранжирование результатов по relevance
- [ ] Unit тесты

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

## 📚 Связанные документы

- `VISION.md` - Meta-goal и стратегия (ЧИТАТЬ ПЕРВЫМ!)
- `CLAUDE.md` - Рабочие инструкции для разработки
- `DATABASE_CHANGELOG.md` - История изменений БД
- `README.md` - Общая информация о проекте

---

*Последнее обновление: 2025-01-31*
*Следующий review: после завершения Phase 2*
*Maintainer: Development Team*
