# Project Architecture Overview

**Проект:** ChatOpenAI Integration Assistant  
**Версия:** 1.3  
**Дата обновления:** 2025-01-31  
**Статус:** Активная разработка

---

## 📊 Technology Stack

### Frontend
- **Framework:** React 18 + TypeScript + Vite
- **State Management:** Zustand (useStore)
- **UI/CSS:** Tailwind CSS + Lucide React icons
- **Routing:** React Router (если используется)

### Backend & Infrastructure  
- **Database:** Supabase (PostgreSQL)
- **Authentication:** Supabase Auth
- **File Storage:** OpenAI Files API (НЕ Supabase Storage)
- **AI Integration:** OpenAI Assistants API + Embeddings API

### Key Dependencies
```json
{
  "@supabase/supabase-js": "^2.56.0",
  "openai": "^5.16.0", 
  "zustand": "state management",
  "react": "^18.3.1",
  "lucide-react": "^0.344.0"
}
```

---

## 🗂️ Project Structure

```
src/
├── components/           # React компоненты
│   ├── Personalities.tsx # Управление ассистентами + файлы
│   ├── FileDropZone.tsx  # Drag & drop компонент
│   ├── ChatArea.tsx      # Интерфейс чата
│   └── Sidebar.tsx       # Навигация
├── lib/                  # Сервисы и утилиты
│   ├── supabase.ts       # Supabase client + типы
│   ├── openai.ts         # OpenAI API service
│   ├── fileProcessing.ts # Обработка файлов
│   └── ragService.ts     # RAG сервис (legacy)
├── store/
│   └── useStore.ts       # Zustand store
└── App.tsx

supabase/
├── docs/                 # Документация БД
│   └── DATABASE_CHANGELOG.md
├── scripts/              # Миграции и скрипты
└── migrations/           # SQL миграции
```

---

## 🏗️ Core Architecture Decisions

### 1. Файловая архитектура: OpenAI Files API

**Решение:** Файлы хранятся в OpenAI, НЕ в нашей БД  
**Обоснование:**
- ✅ Нативная интеграция с Assistants API
- ✅ Автоматическая векторизация и поиск  
- ✅ Меньше сложности в инфраструктуре
- ✅ Воспроизведение логики Custom GPT

**Альтернативы рассмотрены:**
- ❌ Supabase Storage + собственная RAG система
- ❌ Локальное хранение + векторизация

**Структура данных:**
```typescript
// В БД храним только метаданные:
files: PersonalityFile[] = [
  {
    openai_file_id: "file-abc123", // ID в OpenAI
    file_name: "document.pdf",
    file_size: 1024000,
    status: "ready" | "processing" | "error"
  }
]
```

### 2. State Management: Zustand

**Решение:** Zustand вместо Redux/Context API  
**Обоснование:**
- ✅ Простота использования
- ✅ TypeScript поддержка  
- ✅ Минимальный boilerplate
- ✅ Отличная производительность

### 3. Database: JSONB vs Relational

**Решение:** JSONB для файлов, реляционная структура для основных данных  
**Обоснование:**
- ✅ `personalities.files` как JSONB массив - гибкость
- ✅ PostgreSQL отлично поддерживает JSONB
- ✅ Меньше JOIN'ов при чтении данных
- ✅ Atomic updates файлового массива

---

## 🔧 Key Services & Components

### OpenAI Service (src/lib/openai.ts)
**Назначение:** Взаимодействие с OpenAI API  
**Ключевые методы:**
```typescript
- createAssistant() → создание ассистента с транслитерацией имени
- updateAssistant() → обновление промпта + file_instruction  
- uploadFileToOpenAI() → загрузка файла в OpenAI Files API ✅
- deleteFileFromOpenAI() → удаление файла из OpenAI ✅
- listFiles() → список всех файлов ассистента ✅
- runAssistant() → запуск чата с оптимизированным polling
- checkRun() → проверка статуса без дублирования
```

**Архитектурные особенности:**
- Транслитерация кириллицы → латиница для OpenAI
- Системный промпт = base_prompt + file_instruction  
- Polling с минимальными API-вызовами

### Zustand Store (src/store/useStore.ts)
**Назначение:** Центральное состояние приложения  
**Структура:**
```typescript
AppState {
  // Auth
  user: User | null
  
  // Chats
  chats: Chat[]
  messages: Message[] 
  currentChatId: string | null
  
  // Personalities  
  personalities: Personality[]
  activePersonality: Personality | null
  
  // Services
  openaiService: OpenAIService
}
```

**Ключевые методы:**
- `sendMessage()` → отправка сообщения с оптимизированным polling
- `updatePersonality()` → обновление + синхронизация с OpenAI
- `uploadPersonalityFile()` → координация загрузки файлов ✅
- `deletePersonalityFile()` → удаление файла с обновлением ассистента ✅

### FileDropZone Component (src/components/FileDropZone.tsx) ✨ NEW
**Назначение:** Переиспользуемый drag & drop компонент  
**Особенности:**
- Полная drag & drop функциональность
- Визуальные индикаторы состояния (hover, active, error)
- Компактный режим для разных UI контекстов
- Встроенная валидация файлов
- TypeScript типизация props

### Database Layer (src/lib/supabase.ts)
**Назначение:** Типизированный доступ к Supabase  
**Особенности:**
- Строгие TypeScript типы для всех таблиц
- PersonalityFile интерфейс для JSONB структуры
- RLS (Row Level Security) политики

---

## 📡 Data Flow & Integration Patterns

### 1. Создание/обновление Personality
```
UI Form → useStore.updatePersonality() → 
├── Update Supabase DB
├── openaiService.updateAssistant() (системный промпт)  
└── UI State Update
```

### 2. Chat Message Flow
```
User Input → useStore.sendMessage() →
├── Add to local messages[]
├── Save to Supabase  
├── openaiService.addMessage() → OpenAI Thread
├── openaiService.runAssistant() → Start run
├── Optimized polling checkRun()  
├── Get response from Thread
└── Update UI + Save to DB
```

### 3. File Upload Flow (планируется)
```
File Selection → uploadPersonalityFile() →
├── openaiService.uploadFileToOpenAI() → file_id
├── Update personality.files[] в БД
├── openaiService.updateAssistant() → обновить промпт  
└── UI refresh
```

---

## 🎯 Development Standards

### Code Organization
- **1 компонент = 1 файл**
- **Сервисы в lib/** для переиспользования
- **TypeScript строгий** - no any (кроме исключений)
- **Именование:** camelCase для переменных, PascalCase для компонентов

### Database Patterns
- **UUID** для всех Primary Keys
- **JSONB** для сложных структур данных
- **RLS** для безопасности на уровне строк
- **Миграции** через scripts с логированием

### Error Handling
- **Try/catch** в async функциях
- **User-friendly** сообщения об ошибках
- **Консольное логирование** для отладки
- **Fallback состояния** в UI

### Performance Optimizations
- **Оптимизированный polling** OpenAI API
- **Zustand selective subscriptions**
- **GIN индексы** для JSONB queries
- **Минимальные re-renders** в React

---

## 🚀 Claude 4.5 Architecture Recommendations

### 1. Type Safety Improvements

**Текущая оценка:**
- ✅ Хорошо: Database interface в supabase.ts
- ⚠️ Улучшить: JSONB типизация может быть строже
- ⚠️ Улучшить: Union types для статусов файлов

**Рекомендации:**
```typescript
// Строгая типизация для JSONB:
type FileStatus = 'ready' | 'processing' | 'error' | 'deleted';

interface PersonalityFile {
  openai_file_id: string;
  file_name: string;
  file_size: number;
  uploaded_at: string; // ISO timestamp
  status: FileStatus;
  error_message?: string; // опционально при status='error'
}

// Type guards для безопасности:
function isValidPersonalityFile(obj: unknown): obj is PersonalityFile {
  return (
    typeof obj === 'object' && obj !== null &&
    'openai_file_id' in obj && typeof obj.openai_file_id === 'string' &&
    'file_name' in obj && typeof obj.file_name === 'string' &&
    'status' in obj && ['ready', 'processing', 'error', 'deleted'].includes(obj.status)
  );
}
```

### 2. React Performance Patterns

**Анализ компонентов:**
```typescript
// ❌ Избегать (лишние re-renders):
const ChatArea = () => {
  const store = useStore(); // ре-рендер при ЛЮБОМ изменении
  return <div>{store.messages.map(...)}</div>;
};

// ✅ Оптимально (selective subscription):
const ChatArea = () => {
  const messages = useStore(state => state.messages);
  const sendMessage = useStore(state => state.sendMessage);
  return <div>{messages.map(...)}</div>;
};

// ✅ Еще лучше (с memo для стабильных селекторов):
const selectMessages = (state: AppState) => state.messages;
const ChatArea = () => {
  const messages = useStore(selectMessages);
  // ...
};
```

**Рекомендации для компонентов:**
- `Personalities.tsx` - проверить subscriptions к personalities
- `ChatArea.tsx` - проверить subscriptions к messages
- `FileDropZone.tsx` - мемоизировать callback'и

### 3. Database Query Optimization

**Текущие запросы:**
```typescript
// Можно оптимизировать:
const { data } = await supabase
  .from('personalities')
  .select('*'); // ← выбираем всё

// Лучше (выбираем только нужные поля):
const { data } = await supabase
  .from('personalities')
  .select('id, name, base_prompt, files');
```

**Рекомендации:**
- Использовать `.select()` с конкретными полями
- Добавить индексы для частых WHERE условий
- Рассмотреть материализованные views для аналитики

### 4. OpenAI API Best Practices

**Текущая реализация:**
- ✅ Хорошо: транслитерация имен
- ✅ Хорошо: оптимизированный polling
- ⚠️ Улучшить: error retry logic

**Рекомендации:**
```typescript
// Добавить exponential backoff для retry:
async function runAssistantWithRetry(
  threadId: string,
  assistantId: string,
  maxRetries = 3
): Promise<Run> {
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      return await this.runAssistant(threadId, assistantId);
    } catch (error) {
      attempt++;
      if (attempt >= maxRetries) throw error;

      const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}
```

### 5. File Upload Architecture

**Текущая реализация (v1.3):**
- ✅ Файлы в OpenAI Files API
- ✅ Метаданные в JSONB
- ⚠️ Улучшить: chunked upload для больших файлов

**Рекомендации:**
```typescript
// Для файлов > 10MB использовать chunked upload:
async uploadLargeFile(file: File, onProgress?: (percent: number) => void) {
  if (file.size > 10 * 1024 * 1024) {
    return this.uploadFileChunked(file, onProgress);
  }
  return this.uploadFileToOpenAI(file);
}
```

### 6. Security & RLS Patterns

**Проверить:**
- RLS политики для всех CRUD операций
- API key хранение (localStorage vs sessionStorage)
- Sanitization пользовательского ввода

**Рекомендации:**
```sql
-- RLS Policy pattern для personalities:
CREATE POLICY "Users can only access their own personalities"
ON personalities FOR ALL
USING (auth.uid() = user_id);

-- Для файлов проверять constraint:
ALTER TABLE personalities
ADD CONSTRAINT check_files_array_length
CHECK (jsonb_array_length(files) <= 20);
```

### 7. Error Boundaries & Resilience

**Добавить:**
```typescript
// React Error Boundary для компонентов:
class ErrorBoundary extends React.Component {
  componentDidCatch(error, errorInfo) {
    // Log to analytics
    console.error('Component error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <FallbackUI />;
    }
    return this.props.children;
  }
}
```

### 8. Testing Strategy

**Приоритеты тестирования:**
1. **Unit tests** - OpenAI service методы
2. **Integration tests** - File upload flow
3. **E2E tests** - Критические user flows

**Инструменты:**
- Vitest для unit тестов
- React Testing Library для компонентов
- Playwright для E2E (опционально)

---

## 📋 Current Implementation Status

### ✅ Готово (v1.2)
- [x] Базовый чат с ассистентами
- [x] Управление personalities  
- [x] OpenAI integration + polling optimization
- [x] Транслитерация имен для OpenAI
- [x] JSONB структура для файлов
- [x] Database cleanup от legacy полей

### ✅ Готово (v1.3)
- [x] File upload к ассистентам  
- [x] UI для управления файлами
- [x] Drag & drop интерфейс

### 🚧 В разработке
- [ ] Integration testing для file upload
- [ ] Error handling improvements

### 📋 Планируется  
- [ ] Function calling для ассистентов
- [ ] Advanced file types support
- [ ] Export/import чатов
- [ ] Аналитика использования

---

## 🔄 Evolution & Migration Strategy

### Подход к изменениям
1. **Документировать решение** в этом файле
2. **Database changes** → DATABASE_CHANGELOG.md
3. **Backward compatibility** когда возможно
4. **Feature flags** для экспериментальной функциональности

### Migration Pattern
```
Planning → Implementation → Testing → Documentation → Deployment
    ↓           ↓              ↓           ↓            ↓
  This file  Code+Tests    Manual QA   Update docs   Git push
```

---

## 🎯 Priority Optimizations Roadmap

### Quick Wins (можно сделать быстро)
1. ✅ **Selective subscriptions в компонентах** (1-2 часа)
2. ✅ **Type guards для JSONB** (1 час)
3. ✅ **Database query optimization** (.select() с полями) (1 час)

### Medium Priority (следующие спринты)
1. 🎯 **Error retry logic** с exponential backoff (2-3 часа)
2. 🎯 **Error Boundaries** для компонентов (2-3 часа)
3. 🎯 **Unit tests** для OpenAI service (4-5 часов)

### Long Term (планирование)
1. 📋 **Chunked upload** для больших файлов
2. 📋 **E2E testing** с Playwright
3. 📋 **Performance monitoring** и analytics

---

*Документ поддерживается в актуальном состоянии для эффективной разработки*
*Последнее обновление: 2025-01-31 (добавлены Claude 4.5 рекомендации)*