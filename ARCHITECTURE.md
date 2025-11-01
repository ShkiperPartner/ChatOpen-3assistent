# Project Architecture

**Project:** ChatOpenAI Integration Assistant - AI Partnership OS
**Version:** 0.3.0
**Last Updated:** 2025-02-29

---

> **🏗️ Authoritative Source:** This is the SINGLE SOURCE OF TRUTH for:
> - WHY we chose specific technologies (technology choices, design principles)
> - HOW the system is structured (modules, layers, components)
> - Modularity philosophy and patterns
> - Design principles and architecture patterns
>
> **⚠️ NOT for operational checklists:**
> ❌ Don't store detailed implementation tasks here (→ BACKLOG.md)
> ❌ Don't store sprint checklists here (→ BACKLOG.md)
> ❌ Don't store "Phase 1: do X, Y, Z" task lists here (→ BACKLOG.md)
>
> **This file = Reference (WHY & HOW)**
> **BACKLOG.md = Action Plan (WHAT to do now)**
>
> Other files (CLAUDE.md, PROJECT_INTAKE.md) link here, don't duplicate.

## 📊 Technology Stack

### Frontend
```
- Framework: React 18.3.1
- Language: TypeScript (strict mode)
- Build Tool: Vite 5.4.8
- State Management: Zustand 5.x
- UI/CSS: Tailwind CSS
- Icons: Lucide React
- Routing: React Router (client-side)
- Markdown: ReactMarkdown + remark-gfm
- Syntax Highlighting: react-syntax-highlighter
```

### Backend & Infrastructure
```
- Database: Supabase (PostgreSQL + pgvector)
- Authentication: Supabase Auth
- API Type: REST (OpenAI) + Supabase SDK
- Vector Storage: pgvector extension (1536 dimensions)
- File Storage: OpenAI Files API (not Supabase Storage)
- Hosting: Vercel (recommended)
```

### AI & ML
```
- LLM: OpenAI GPT-4 (via Assistants API)
- Embeddings: text-embedding-3-small (1536 dimensions)
- Vector Search: pgvector (ivfflat index, cosine similarity)
- RAG: OpenAI Files API + Vector Stores
```

### Key Dependencies
```json
{
  "react": "^18.3.1 - UI library",
  "@supabase/supabase-js": "^2.x.x - Database client + Auth",
  "zustand": "^5.x.x - Lightweight state management",
  "openai": "^4.x.x - OpenAI API client (Assistants API)",
  "tailwindcss": "^3.x.x - Utility-first CSS",
  "lucide-react": "^latest - Icon library",
  "react-markdown": "^9.x.x - Markdown rendering",
  "react-syntax-highlighter": "^15.x.x - Code highlighting"
}
```

---

## 🗂️ Project Structure

```
ChatOpenAIIntegration-3assistent/
├── src/                          # Source code
│   ├── components/               # React components
│   │   ├── Auth.tsx             # Authentication UI
│   │   ├── ChatArea.tsx         # Main chat interface
│   │   ├── Sidebar.tsx          # Chat list sidebar
│   │   ├── Personalities.tsx    # AI assistants management
│   │   ├── Settings.tsx         # User settings
│   │   ├── FileDropZone.tsx     # File upload component
│   │   ├── MemoryLibrary.tsx    # 📚 Memory Library UI (NEW)
│   │   ├── Profile.tsx          # User profile
│   │   └── ProfileScreen.tsx    # Profile modal
│   │
│   ├── store/                    # State management
│   │   └── useStore.ts          # Zustand store (centralized state)
│   │
│   ├── lib/                      # Libraries and utilities
│   │   ├── supabase.ts          # Supabase client + TypeScript types
│   │   ├── openai.ts            # OpenAI service (Assistants API)
│   │   ├── assistantService.ts  # Assistant management
│   │   ├── vectorStoreService.ts # Vector stores management
│   │   ├── integrationService.ts # Files + Assistants integration
│   │   ├── encryption.ts        # API key encryption
│   │   └── fileProcessing.ts    # File validation
│   │
│   ├── api/                      # API services
│   │   └── memory-service.ts    # 🧠 Memory Service API (NEW)
│   │
│   ├── App.tsx                   # Root component
│   └── main.tsx                  # Entry point
│
├── supabase/                     # Supabase configuration
│   ├── migrations/               # SQL migrations
│   │   ├── 20250229000001_create_document_chunks.sql
│   │   ├── 20250229000002_migrate_maas_tables.sql
│   │   └── 20250229000003_add_document_chunks_columns.sql
│   └── docs/
│       └── DATABASE_CHANGELOG.md
│
├── scripts/                      # Utility scripts
│   └── test-memory-service.mjs  # Memory Service testing
│
├── Init/                         # Framework documentation
│   ├── BACKLOG.md               # (template)
│   ├── ARCHITECTURE.md          # (template)
│   └── ...
│
├── BACKLOG.md                    # 📋 Current project backlog
├── ARCHITECTURE.md               # 🏗️ This file
├── PROJECT_ARCHITECTURE.md       # Working roadmap (legacy)
├── VISION.md                     # 🎯 Meta-goal and strategy
├── CLAUDE.md                     # 🤖 Working instructions
├── TESTING_GUIDE.md              # 🧪 E2E testing guide
├── DATABASE_CHANGELOG.md         # 📊 Database changes history
│
├── package.json                  # Dependencies
├── tsconfig.json                 # TypeScript configuration
├── tailwind.config.js            # Tailwind configuration
└── vite.config.ts                # Vite build configuration
```

---

## 🏗️ Core Architecture Decisions

### 1. Zustand for State Management (не Redux)

**Decision:** Использовать Zustand вместо Redux или Context API
**Reasoning:**
- ✅ Меньше boilerplate кода (нет actions, reducers, providers)
- ✅ Selective subscriptions - компоненты ре-рендерятся только при изменении нужного state
- ✅ Простая интеграция с async операциями
- ✅ TypeScript support из коробки
- ✅ Малый размер bundle (~1KB)

**Alternatives considered:**
- ❌ Redux - слишком много boilerplate для проекта такого размера
- ❌ Context API - проблемы с производительностью при частых обновлениях
- ❌ Jotai/Recoil - избыточная сложность для текущих нужд

**Implementation:**
```typescript
// src/store/useStore.ts
export const useStore = create<AppState>((set, get) => ({
  // State
  user: null,
  chats: [],
  messages: [],
  personalities: [],
  libraryDocuments: [],

  // Actions
  sendMessage: async (content) => { /* ... */ },
  loadLibraryDocuments: async () => { /* ... */ },
  // ...
}));

// Usage with selective subscription
const sendMessage = useStore(state => state.sendMessage); // ре-рендер только если sendMessage меняется
```

---

### 2. OpenAI Files API вместо собственного RAG

**Decision:** Использовать OpenAI Files API + Vector Stores для файлов personalities
**Reasoning:**
- ✅ Нет необходимости управлять векторизацией вручную
- ✅ OpenAI автоматически chunking + embeddings
- ✅ Встроенный vector search оптимизирован OpenAI
- ✅ Меньше кода и сложности на нашей стороне
- ✅ Масштабируемость из коробки

**Alternatives considered:**
- ❌ Собственная векторизация - больше работы, сложнее поддерживать
- ❌ Pinecone/Weaviate - дополнительный сервис, стоимость
- ✅ OpenAI Files API - простота + качество

**Data structure:**
```typescript
// Metadata в БД
interface PersonalityFile {
  openai_file_id: string;  // ID файла в OpenAI
  file_name: string;
  file_size: number;
  status: 'ready' | 'processing' | 'error';
  uploaded_at: string;
}

// В personalities таблице
files: PersonalityFile[] // JSONB массив
```

---

### 3. Unified Memory System - Три типа памяти

**Decision:** Разделить память AI на три независимых типа с единым API
**Reasoning:**
- ✅ Разные типы памяти решают разные задачи:
  - 📚 БИБЛИОТЕКА - "как делать вещи" (общие знания)
  - 💼 РАБОЧИЙ СТОЛ - "инструменты для работы" (файлы assistant)
  - 📓 ДНЕВНИК - "что пользователь хочет" (факты из разговоров)
- ✅ Модульность - каждый тип может развиваться независимо
- ✅ Гибкость - можно включать/выключать источники
- ✅ Масштабируемость - легко добавить новые типы памяти

**Alternatives considered:**
- ❌ Один тип памяти для всего - менее гибко, сложнее управлять
- ❌ Каждый assistant имеет отдельную память - дублирование, нет sharing
- ✅ Три типа + Unified API - баланс между гибкостью и простотой

**Architecture:**
```
┌─────────────────────────────────────────────┐
│  Unified Memory System                      │
├─────────────────────────────────────────────┤
│                                             │
│  📚 БИБЛИОТЕКА (document_chunks)            │
│     → user_id = NULL → публичные            │
│     → user_id = X → приватные               │
│     → Векторный поиск (pgvector)            │
│                                             │
│  💼 РАБОЧИЙ СТОЛ (personality_embeddings)   │
│     → personality_id фильтр                 │
│     → Файлы через OpenAI Files API          │
│                                             │
│  📓 ДНЕВНИК (MaaS: 8 tables)                │
│     → facts, decisions, summaries           │
│     → project_id фильтр                     │
│     → Full-text + structured search         │
│                                             │
└─────────────────────────────────────────────┘
       ↓
   Memory Service API (src/api/memory-service.ts)
       ↓
   Unified Context → AI Response
```

---

### 4. Non-Critical Failure Pattern для Memory Service

**Decision:** Memory Service ошибки не должны блокировать чат
**Reasoning:**
- ✅ Лучше работать без памяти, чем не работать вообще
- ✅ Graceful degradation - улучшает UX
- ✅ Память - это enhancement, не core functionality
- ✅ Console warnings вместо errors - легче отлаживать

**Alternatives considered:**
- ❌ Блокировать чат при ошибках памяти - плохой UX
- ❌ Игнорировать ошибки полностью - сложно отлаживать
- ✅ Try/catch + console.warn - выбрали этот подход

**Implementation:**
```typescript
// src/store/useStore.ts:sendMessage()
try {
  const memoryResults = await memoryService.searchMemory({...});
  if (memoryResults.results.length > 0) {
    enrichedContent = addMemoryContext(content, memoryResults);
  }
} catch (memoryError) {
  console.warn('Memory search failed (non-critical):', memoryError);
  // Continue with original content
}
```

---

### 5. Simple Facts Extraction для MVP

**Decision:** Auto-save question + answer вместо AI-powered extraction
**Reasoning:**
- ✅ Быстрее реализовать (Sprint 3 goal)
- ✅ Достаточно для тестирования системы
- ✅ Простая структура - легко отлаживать
- ✅ AI-powered extraction можно добавить позже (Sprint 5)

**Alternatives considered:**
- ❌ AI-powered extraction сейчас - слишком долго для MVP
- ❌ Не сохранять facts вообще - потеряем тестовые данные
- ✅ Simple auto-save → AI-powered позже - баланс

**Data structure:**
```typescript
// Fact в БД
{
  subject: "First 100 chars of user question",
  value: {
    question: "Full user question",
    answer: "First 500 chars of AI answer",
    personality: "Personality name",
    timestamp: "ISO timestamp"
  },
  level: "fact",
  source_type: "observed",
  confidence: 1.0,
  importance: 5
}
```

---

## 🔧 Key Services & Components

### Memory Service API
**Purpose:** Unified search API для трёх типов памяти
**Location:** `src/api/memory-service.ts`

**Key methods:**
```typescript
- searchMemory(query, user_id, personality_id, project_id)
  → Unified search по всем трём источникам

- searchLibrary(query_embedding, user_id, project_id)
  → Векторный поиск в document_chunks (📚)

- searchDesk(query_embedding, personality_id)
  → Векторный поиск в personality_embeddings (💼)

- searchDiary(query, project_id, user_id)
  → Структурированный поиск в MaaS tables (📓)
```

**Architectural features:**
- Параллельные запросы к трём источникам
- OpenAI embeddings для векторизации query
- Cosine similarity для ранжирования
- Aggregation результатов в единый context
- Non-critical failure handling

**Example usage:**
```typescript
import { MemoryService } from './api/memory-service';

const memoryService = new MemoryService(apiKey);
const results = await memoryService.searchMemory({
  query: 'How to use Supabase?',
  user_id: 'user-123',
  personality_id: 'pers-456',
  limit: 5,
  similarity_threshold: 0.6
});

// Results structure:
{
  query: "How to use Supabase?",
  results: [
    { source: 'library', content: '...', relevance: 0.85, metadata: {...} },
    { source: 'desk', content: '...', relevance: 0.78, metadata: {...} },
    { source: 'diary', content: '...', relevance: 0.72, metadata: {...} }
  ],
  sources_searched: ['library', 'desk', 'diary'],
  total_results: 3
}
```

---

### OpenAI Service
**Purpose:** Wrapper для OpenAI Assistants API
**Location:** `src/lib/openai.ts`

**Key methods:**
```typescript
- createChatCompletion() → Chat Completions API
- createEmbedding() → text-embedding-3-small
- createAssistant() → Create assistant with tools
- updateAssistant() → Update assistant configuration
- uploadFile() → Upload file to OpenAI
```

**Features:**
- Транслитерация имён (кириллица → латиница)
- Streaming responses support
- Token usage tracking
- Error handling with retries

---

### Zustand Store
**Purpose:** Centralized state management
**Location:** `src/store/useStore.ts`

**State sections:**
```typescript
- Auth: user, isLoading
- Chats: chats, currentChatId, messages
- Settings: settings (API key, model, theme, etc.)
- Personalities: personalities, activePersonality
- Memory: libraryDocuments
- UI: isGenerating, sidebarOpen, showSettings, etc.
- Services: openaiService, memoryService, etc.
```

**Key actions:**
```typescript
- sendMessage() → Send message + Memory enrichment + Facts extraction
- uploadDocumentToLibrary() → Upload to Library (📚)
- loadLibraryDocuments() → Load user's documents
- uploadPersonalityFile() → Upload to Desk (💼)
- createPersonality() → Create new AI assistant
```

**Performance optimizations:**
- Selective subscriptions (avoid unnecessary re-renders)
- Async actions with loading states
- Optimistic updates where possible

---

## 📡 Data Flow & Integration Patterns

### 1. Memory Service API Flow - Unified Memory Search

```
User Query ("How to use Supabase?")
    ↓
sendMessage() в useStore
    ↓
Memory Service API
    ├── 1. Векторизация query через OpenAI embeddings
    ├── 2. Parallel Search (3 источника одновременно)
    │   ├── 📚 БИБЛИОТЕКА (document_chunks)
    │   │   └── SQL: search_document_chunks(embedding, user_id)
    │   │       → Top 5 chunks by cosine similarity
    │   │
    │   ├── 💼 РАБОЧИЙ СТОЛ (personality_embeddings)
    │   │   └── OpenAI Files API vector search
    │   │       → Top 3 embeddings for personality
    │   │
    │   └── 📓 ДНЕВНИК (MaaS tables)
    │       ├── facts → WHERE subject ILIKE %query%
    │       ├── thread_summaries → WHERE summary_text ILIKE %query%
    │       └── decisions → WHERE decision_text ILIKE %query%
    │           → Top 5 entries by relevance
    │
    └── 3. Aggregation + Ranking
        → Unified results sorted by relevance
    ↓
Enriched Context
    ↓
OpenAI API (Chat Completions or Assistants API)
    ↓
AI Response
    ↓
Facts Extraction (auto-save to Diary)
    ↓
Response displayed in UI
```

**Detailed steps:**

1. **User sends message** в ChatArea
2. **sendMessage()** в useStore получает message
3. **Memory Service search** (non-critical):
   - Query векторизуется: `text-embedding-3-small`
   - 3 параллельных поиска запускаются
   - Библиотека: pgvector search в document_chunks
   - Рабочий стол: OpenAI Files API (if personality has files)
   - Дневник: Full-text search в facts/summaries/decisions
4. **Context enrichment**:
   - Если results.length > 0 → добавить memory context
   - Формат: `[Memory Context] 📚 ... 💼 ... 📓 ... [User Question] ...`
5. **AI Response**:
   - OpenAI получает enriched message
   - AI отвечает с учётом контекста из памяти
6. **Facts auto-save**:
   - После ответа AI → extract simple fact
   - Save to `facts` table с структурой {question, answer, personality}
   - Связать с default project (auto-create if needed)
7. **UI update** с ответом

---

### 2. File Upload Flow - Две системы

#### 📚 БИБЛИОТЕКА (document_chunks)
```
User drops file in MemoryLibrary
    ↓
validateFile() → Check size, type
    ↓
file.text() → Read content
    ↓
OpenAI embeddings API → Векторизация
    ↓
Supabase INSERT into document_chunks
    {
      user_id: user.id (или NULL для public),
      is_public: boolean,
      content: file_content,
      embedding: vector(1536),
      file_name: string,
      file_type: string,
      metadata: {...}
    }
    ↓
Document ready for search! 📚
```

#### 💼 РАБОЧИЙ СТОЛ (personalities)
```
User uploads file to Personality
    ↓
validateFile() → Check size, type
    ↓
IntegrationService.addFilesToPersonality()
    ├── 1. Upload file to OpenAI Files API
    ├── 2. Create/Update Vector Store
    ├── 3. Update Assistant with file_search tool
    └── 4. Update personality.files[] in DB
    ↓
File ready for Assistant! 💼
```

---

### 3. Chat Message Flow

```
User types message
    ↓
sendMessage(content)
    ↓
1. Save user message to DB
    ↓
2. Memory Service enrichment (try/catch)
    ├── Success → enrichedContent
    └── Fail → original content (non-critical)
    ↓
3. Choose API:
    ├── Has files? → Assistants API
    └── No files → Chat Completions API
    ↓
4. OpenAI API call
    ↓
5. Save AI response to DB
    ↓
6. Facts extraction (try/catch)
    ├── Get/Create default project
    ├── Extract fact: {question, answer, ...}
    └── Save to facts table
    ↓
7. Update UI with response
```

---

## 🎯 Development Standards

### Code Organization
- **1 component = 1 file** (React components)
- **Services in lib/** for reusability
- **TypeScript strict mode** - no `any` except justified exceptions
- **Naming:**
  - camelCase для переменных и функций
  - PascalCase для компонентов и types
  - UPPER_SNAKE_CASE для констант

### Database Patterns
- **Primary Keys:** UUID (gen_random_uuid())
- **Timestamps:** TIMESTAMPTZ with default NOW()
- **JSONB:** для flexible data (files[], metadata, value)
- **Indexes:**
  - B-tree для foreign keys
  - GIN для JSONB fields
  - ivfflat для vector columns (pgvector)
- **Migrations:** All schema changes via SQL migrations
- **Security:** RLS policies на всех таблицах

### Error Handling
- **Try/catch** in async functions
- **User-friendly** error messages (русский для UI)
- **Console logging** for debugging:
  - `console.log()` для info
  - `console.warn()` для non-critical errors
  - `console.error()` для critical errors
- **Fallback states** in UI (loading, error, empty states)
- **Non-critical failures** для Memory Service и Facts

### Performance Optimizations
- **Zustand selective subscriptions** - избегаем лишних ре-рендеров
- **Parallel requests** - Memory Service делает 3 запроса параллельно
- **Lazy loading** - компоненты загружаются по требованию
- **Debouncing** - для search inputs (будущее улучшение)
- **Caching** - OpenAI embeddings можно кешировать (будущее)

---

## 🧩 Module Architecture

> **Философия:** Модульная архитектура - основа эффективной разработки с ИИ-агентами

### Зачем нужна модульность?

**Критические преимущества для работы с ИИ:**

1. **Экономия токенов и денег**
   - ИИ загружает только нужный модуль (100-200 строк)
   - Вместо всего проекта (1000+ строк)
   - **Пример:** Sprint 3 - читали только Memory Service модуль (~600 строк) вместо всего проекта (~3000 строк) = **экономия 80% токенов!**

2. **Простота разработки и тестирования**
   - Каждый модуль = отдельная задача
   - Легко проверить работу модуля изолированно
   - ИИ лучше понимает узкие задачи

3. **Параллельная работа**
   - Можно разрабатывать разные модули одновременно
   - Ускоряет итерацию

4. **Управляемость проекта**
   - Легко найти и исправить ошибки
   - Понятная структура для команды
   - Простое добавление новых функций

---

### Модули проекта

#### Module 1: Memory Service API 🧠
**Purpose:** Unified search API для трёх типов памяти AI помощника
**Location:** `src/api/memory-service.ts`
**Status:** ✅ Implemented (2025-02-29)

**Components:**
- `MemoryService` class - основной API
- `searchLibrary()` - поиск в 📚 document_chunks
- `searchDesk()` - поиск в 💼 personality_embeddings
- `searchDiary()` - поиск в 📓 MaaS tables
- `searchMemory()` - unified поиск по всем трём источникам

**Dependencies:**
- Supabase client (`src/lib/supabase.ts`)
- OpenAI embeddings API (text-embedding-3-small)
- TypeScript interfaces: DocumentChunk, Fact, ThreadSummary, Decision, etc.

**Integration with other modules:**
- Database: прямой доступ к 10 таблицам памяти
- AI Chat: предоставляет context для ответов (useStore.sendMessage)
- UI Components: данные для MemoryLibrary компонента

**Input/Output:**
```typescript
// Input
interface MemoryQuery {
  query: string;
  user_id: string;
  personality_id?: string;
  project_id?: string;
  limit?: number;
  similarity_threshold?: number;
}

// Output
interface UnifiedMemoryResult {
  query: string;
  results: MemoryResult[]; // sorted by relevance
  sources_searched: MemorySource[];
  total_results: number;
}
```

**Testing:**
- Test script: `scripts/test-memory-service.mjs`
- E2E guide: `TESTING_GUIDE.md`

---

#### Module 2: Memory Library UI 📚
**Purpose:** UI для загрузки и управления документами в библиотеке
**Location:** `src/components/MemoryLibrary.tsx`
**Status:** ✅ Implemented (2025-02-29)

**Components:**
- Modal with library documents list
- FileDropZone integration (drag & drop)
- Public/Private toggle
- Delete functionality

**Dependencies:**
- FileDropZone component
- useStore (uploadDocumentToLibrary, loadLibraryDocuments, deleteLibraryDocument)
- Lucide icons

**Integration:**
- ChatArea: Library button opens modal
- useStore: методы для CRUD операций
- OpenAI: векторизация документов

**Features:**
- Drag & drop file upload
- Public/private document toggle
- Document list with metadata (size, date, type)
- Delete documents
- Error handling with user-friendly messages

---

#### Module 3: Authentication 🔐
**Purpose:** User registration, login, password reset
**Location:** `src/components/Auth.tsx`
**Status:** ✅ Implemented (v1.0)

**Dependencies:**
- Supabase Auth

**Features:**
- Email/password auth
- Magic link (optional)
- Session management

---

#### Module 4: Chat System 💬
**Purpose:** Main chat interface with AI
**Location:** `src/components/ChatArea.tsx`, `src/store/useStore.ts`
**Status:** ✅ Implemented + Enhanced (Memory integration)

**Components:**
- ChatArea - main UI
- Message list with markdown rendering
- Input with send button
- Memory Service integration (enriched context)
- Facts auto-extraction

**Dependencies:**
- OpenAI Service
- Memory Service
- Personalities
- Supabase (messages storage)

---

#### Module 5: Personalities Management 🎭
**Purpose:** Create and manage custom AI assistants
**Location:** `src/components/Personalities.tsx`
**Status:** ✅ Implemented (v1.2 + file upload v1.3)

**Features:**
- Create/Edit/Delete personalities
- Custom prompts
- File upload to assistant (💼 Desk)
- OpenAI Assistants API integration

---

#### Module 6: Database Layer 🗄️
**Purpose:** Supabase client and TypeScript types
**Location:** `src/lib/supabase.ts`
**Status:** ✅ Implemented + Extended (memory types)

**Features:**
- Supabase client initialization
- TypeScript types for all 14 tables
- Type-safe database operations

---

## 🗄️ Database Schema

### Tables Overview (14 tables total)

#### Chat Application (4 tables)
```
chats
├── id: uuid (PK)
├── user_id: uuid (FK → auth.users)
├── title: text
└── created_at: timestamptz

messages
├── id: uuid (PK)
├── chat_id: uuid (FK → chats)
├── role: text ('user' | 'assistant')
├── content: text
└── created_at: timestamptz

personalities
├── id: uuid (PK)
├── user_id: uuid (FK → auth.users)
├── name: text
├── prompt: text
├── files: jsonb (PersonalityFile[])
├── openai_assistant_id: text
└── is_active: boolean

user_settings
├── user_id: uuid (PK, FK → auth.users)
├── openai_api_key: text (encrypted)
├── model: text
├── theme: text
└── max_tokens: integer
```

#### Memory: Library 📚 (1 table)
```
document_chunks
├── id: uuid (PK)
├── user_id: uuid (nullable - для public docs)
├── is_public: boolean
├── project_id: uuid (FK → projects)
├── content: text
├── embedding: vector(1536) ← pgvector
├── file_name: text
├── file_type: text
├── file_size: bigint
├── source_url: text
├── metadata: jsonb
└── created_at, updated_at: timestamptz
```

#### Memory: Desk 💼 (1 table)
```
personality_embeddings
├── id: uuid (PK)
├── personality_id: uuid (FK → personalities)
├── chunk_text: text
├── embedding: vector(1536) ← pgvector
├── file_name: text
├── chunk_index: integer
└── created_at: timestamptz
```

#### Memory: Diary 📓 (8 MaaS tables)
```
projects
├── id: uuid (PK)
├── user_id: text
├── name: text
├── mission: text
├── goals: text[]
├── is_default: boolean
└── status: text

facts
├── id: uuid (PK)
├── project_id: uuid (FK → projects)
├── session_id: text (chat_id)
├── user_id: text
├── subject: text
├── value: jsonb ← {question, answer, personality, timestamp}
├── level: text ('fact' | 'insight' | 'pattern')
├── source_type: text ('observed' | 'user_stated')
├── confidence: numeric
├── importance: integer
├── tags: text[]
├── metadata: jsonb
└── is_active: boolean

thread_summaries
├── id: uuid (PK)
├── project_id: uuid (FK → projects)
├── summary_text: text
├── message_count: integer
└── keywords: text[]

decisions
├── id: uuid (PK)
├── project_id: uuid (FK → projects)
├── decision_text: text
├── status: text
└── priority: text

links
├── id: uuid (PK)
├── project_id: uuid (FK → projects)
├── source_type, source_id: text, uuid
├── target_type, target_id: text, uuid
└── link_type: text

sources
├── id: uuid (PK)
├── project_id: uuid (FK → projects)
├── source_type: text
├── source_url: text
└── credibility_score: numeric

maas_metrics
├── id: uuid (PK)
├── project_id: uuid (FK → projects)
├── metric_type: text
├── metric_value: numeric
└── recorded_at: timestamptz

snapshot_cache
├── id: uuid (PK)
├── project_id: uuid (FK → projects)
├── snapshot_type: text
├── snapshot_data: jsonb
└── expires_at: timestamptz
```

### Indexes

**Vector indexes (ivfflat):**
- `document_chunks.embedding` - lists=100
- `personality_embeddings.embedding` - lists=50

**GIN indexes (JSONB):**
- `personalities.files`
- `facts.value`
- `facts.tags`

**B-tree indexes:**
- All foreign keys
- `user_id` columns (для RLS)
- `is_active`, `is_public` (filtered queries)

### Security (RLS Policies)

**All tables have RLS enabled:**
- Users can only access their own data
- Public documents in `document_chunks` (is_public = true) visible to all
- MaaS tables linked to user via `projects.user_id`

---

## 🔐 Security Architecture

### Authentication
- **Method:** Email/Password + Magic Link (Supabase Auth)
- **Provider:** Supabase Auth
- **Flow:**
  1. User registers/logs in
  2. Supabase creates JWT token
  3. Token stored in localStorage
  4. RLS policies enforce user isolation

### Authorization
- **Model:** Row Level Security (RLS)
- **Implementation:**
  - All tables have RLS policies
  - Users can only CRUD their own data
  - Public documents exception (document_chunks.is_public = true)

### Data Protection
- **At Rest:**
  - OpenAI API keys encrypted in DB (AES-256)
  - Vector embeddings stored in plaintext (not sensitive)
- **In Transit:** HTTPS/TLS (Supabase + Vercel)
- **API Keys:**
  - Encrypted before storage
  - Decrypted only in memory
  - Never sent to client
- **Sensitive Data:**
  - User messages stored in DB (not encrypted - design choice)
  - File content stored in OpenAI (not our DB)

### Security Headers
- CORS configured for Supabase + OpenAI origins
- CSP headers (Content Security Policy) - handled by Vercel
- No sensitive data in localStorage except encrypted API key

---

## 🔄 Evolution & Migration Strategy

### Approach to Changes
1. **Document decision** in this file (ARCHITECTURE.md)
2. **Database changes** → Create SQL migration script
3. **Backward compatibility** when possible
4. **Non-breaking changes** preferred over breaking
5. **Feature flags** for experimental functionality (future)

### Migration Pattern
```
Planning → Implementation → Testing → Documentation → Deployment
    ↓           ↓              ↓           ↓            ↓
ARCHITECTURE  Code+Tests    Manual QA   Update docs   Git push
```

### Version History
- **0.3.0** - 2025-02-29 - Memory System Full Feature (Library UI + Integration + Facts)
- **0.2.0** - 2025-02-29 - Memory Service API + Database unification
- **0.1.0** - 2025-01-31 - Initial MVP (Chat + Personalities + Files)

---

## 📚 Related Documentation

- **BACKLOG.md** - Current implementation status and roadmap (SINGLE SOURCE OF TRUTH for tasks)
- **VISION.md** - Meta-goal and AI Partnership OS strategy
- **TESTING_GUIDE.md** - E2E testing instructions
- **PROJECT_ARCHITECTURE.md** - Working roadmap (legacy, будет заменён BACKLOG.md)
- **CLAUDE.md** - AI assistant working instructions
- **DATABASE_CHANGELOG.md** - Database changes history

---

## 🎨 Design Patterns Used

- **Repository Pattern** - Supabase client в `lib/supabase.ts`
- **Service Layer** - OpenAI, Memory, Assistant services в `lib/`
- **State Management** - Zustand store в `store/useStore.ts`
- **Dependency Injection** - Services injected в store
- **Observer Pattern** - Zustand subscriptions
- **Non-Critical Failure** - Memory Service и Facts extraction (custom pattern)

---

*This document maintained in current state for effective development*
*Last updated: 2025-02-29*
