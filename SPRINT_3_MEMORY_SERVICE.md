# Sprint 3: Memory Service API

**Phase:** 2 (Unified Memory System)
**Длительность:** 1-2 недели
**Статус:** 🔄 В ПРОЦЕССЕ
**Дата начала:** 2025-02-29

---

## 🎯 Цель Sprint 3

Создать **Memory Service API** - единый интерфейс для поиска по всем трём типам памяти:
- 📚 БИБЛИОТЕКА (document_chunks)
- 💼 РАБОЧИЙ СТОЛ (personality_embeddings)
- 📓 ДНЕВНИК (MaaS facts/summaries/decisions)

**Результат:** AI помощник может искать информацию во всех источниках одновременно и получать unified context.

---

## 📋 Задачи Sprint 3

### 1. Создать структуру Memory Service (1 день)

**Файл:** `src/api/memory-service.ts`

**Интерфейсы:**
```typescript
// Результат поиска из одного источника
interface MemoryResult {
  source: 'library' | 'desk' | 'diary';  // Тип источника
  content: string;                        // Текст
  relevance: number;                      // 0.0 - 1.0
  metadata: {
    file_name?: string;
    created_at?: string;
    [key: string]: any;
  };
}

// Запрос на поиск
interface MemoryQuery {
  query: string;              // Текст запроса
  user_id: string;            // ID пользователя
  personality_id?: string;    // Фильтр по personality (опционально)
  project_id?: string;        // Фильтр по проекту (опционально)
  sources?: ('library' | 'desk' | 'diary')[];  // Какие источники искать
  limit?: number;             // Макс результатов (default: 10)
}

// Unified результат
interface UnifiedMemoryResult {
  query: string;
  results: MemoryResult[];    // Все результаты, отсортированные по relevance
  sources_searched: string[]; // Какие источники использовались
  total_results: number;
}
```

**Чеклист:**
- [ ] Создать файл `src/api/memory-service.ts`
- [ ] Определить интерфейсы TypeScript
- [ ] Создать базовый класс MemoryService

---

### 2. Реализовать searchLibrary() (2 дня)

**Функция:** Поиск в 📚 БИБЛИОТЕКЕ (document_chunks)

```typescript
async searchLibrary(
  query_embedding: number[],
  user_id: string,
  project_id?: string,
  limit: number = 5
): Promise<MemoryResult[]>
```

**Что делает:**
1. Использует SQL функцию `search_document_chunks()`
2. Фильтрует по доступу (публичные + свои приватные)
3. Возвращает топ-N релевантных чанков

**SQL запрос:**
```sql
SELECT * FROM search_document_chunks(
  query_embedding := $1::vector,
  match_count := $2,
  filter_user_id := $3,
  filter_project_id := $4,
  similarity_threshold := 0.5
);
```

**Чеклист:**
- [ ] Реализовать searchLibrary()
- [ ] Протестировать с mock embeddings
- [ ] Обработка ошибок
- [ ] Логирование результатов

---

### 3. Реализовать searchDesk() (2 дня)

**Функция:** Поиск в 💼 РАБОЧЕМ СТОЛЕ (personality_embeddings)

```typescript
async searchDesk(
  query_embedding: number[],
  personality_id: string,
  limit: number = 5
): Promise<MemoryResult[]>
```

**Что делает:**
1. Находит embeddings для конкретного personality
2. Векторный поиск по cosine similarity
3. Возвращает релевантные фрагменты файлов

**SQL запрос:**
```sql
SELECT
  content,
  file_name,
  1 - (embedding <=> $1::vector) as similarity,
  metadata
FROM personality_embeddings
WHERE personality_id = $2
  AND (1 - (embedding <=> $1::vector)) >= 0.5
ORDER BY embedding <=> $1::vector
LIMIT $3;
```

**Чеклист:**
- [ ] Реализовать searchDesk()
- [ ] Проверить что personality_embeddings таблица существует
- [ ] Если нет - создать миграцию
- [ ] Протестировать с реальными personality файлами

---

### 4. Реализовать searchDiary() (2 дня)

**Функция:** Поиск в 📓 ДНЕВНИКЕ (MaaS facts/summaries)

```typescript
async searchDiary(
  query_text: string,
  user_id: string,
  project_id?: string,
  limit: number = 5
): Promise<MemoryResult[]>
```

**Что делает:**
1. Full-text search по facts.subject + facts.value
2. Поиск в thread_summaries.summary_text
3. Поиск в decisions.decision_text
4. Объединение результатов

**SQL запрос (пример для facts):**
```sql
SELECT
  subject,
  value::text as content,
  importance / 10.0 as relevance,
  tags,
  metadata,
  created_at
FROM facts
WHERE
  project_id = $1
  AND is_active = true
  AND (
    subject ILIKE '%' || $2 || '%'
    OR value::text ILIKE '%' || $2 || '%'
  )
ORDER BY importance DESC, created_at DESC
LIMIT $3;
```

**Чеклист:**
- [ ] Реализовать searchDiary()
- [ ] Поиск в facts
- [ ] Поиск в thread_summaries
- [ ] Поиск в decisions
- [ ] Объединение и ранжирование результатов

---

### 5. Векторизация queries через OpenAI (1 день)

**Функция:** Генерация embeddings для текстовых запросов

```typescript
async getQueryEmbedding(query: string): Promise<number[]>
```

**Что делает:**
1. Вызывает OpenAI Embeddings API
2. Модель: `text-embedding-3-small` (1536 dimensions)
3. Кеширует результаты (опционально)

**Код:**
```typescript
import OpenAI from 'openai';

async getQueryEmbedding(query: string): Promise<number[]> {
  const openai = new OpenAI({ apiKey: this.apiKey });

  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: query,
  });

  return response.data[0].embedding;
}
```

**Чеклист:**
- [ ] Реализовать getQueryEmbedding()
- [ ] Протестировать с разными запросами
- [ ] Обработка ошибок API
- [ ] (Опционально) Кеширование embeddings

---

### 6. Unified searchMemory() (2 дня)

**Главная функция:** Объединяет все три источника

```typescript
async searchMemory(query: MemoryQuery): Promise<UnifiedMemoryResult>
```

**Алгоритм:**
```
1. Векторизация query → embedding
2. Параллельный поиск:
   - searchLibrary(embedding)   📚
   - searchDesk(embedding)      💼
   - searchDiary(query.text)    📓
3. Объединение результатов
4. Ранжирование по relevance
5. Топ-N результатов
```

**Код (псевдокод):**
```typescript
async searchMemory(query: MemoryQuery): Promise<UnifiedMemoryResult> {
  // 1. Векторизация
  const embedding = await this.getQueryEmbedding(query.query);

  // 2. Параллельный поиск
  const [libraryResults, deskResults, diaryResults] = await Promise.all([
    this.searchLibrary(embedding, query.user_id, query.project_id),
    query.personality_id
      ? this.searchDesk(embedding, query.personality_id)
      : [],
    this.searchDiary(query.query, query.user_id, query.project_id),
  ]);

  // 3. Объединение
  const allResults = [
    ...libraryResults,
    ...deskResults,
    ...diaryResults,
  ];

  // 4. Ранжирование
  allResults.sort((a, b) => b.relevance - a.relevance);

  // 5. Топ-N
  return {
    query: query.query,
    results: allResults.slice(0, query.limit || 10),
    sources_searched: ['library', 'desk', 'diary'],
    total_results: allResults.length,
  };
}
```

**Чеклист:**
- [ ] Реализовать searchMemory()
- [ ] Параллельный поиск (Promise.all)
- [ ] Ранжирование результатов
- [ ] Фильтрация по sources
- [ ] Тестирование unified поиска

---

### 7. Тестирование Memory Service (2 дня)

**Создать:** `src/api/__tests__/memory-service.test.ts`

**Тест-кейсы:**
```typescript
describe('Memory Service API', () => {
  test('searchLibrary returns relevant documents', async () => {
    // ...
  });

  test('searchDesk returns personality files', async () => {
    // ...
  });

  test('searchDiary returns facts and summaries', async () => {
    // ...
  });

  test('searchMemory combines all sources', async () => {
    // Запрос: "React hooks"
    // Ожидается: результаты из библиотеки + файлов + фактов
  });

  test('results ranked by relevance', async () => {
    // Проверяем сортировку
  });
});
```

**Чеклист:**
- [ ] Unit тесты для каждого метода
- [ ] Mock данные для тестирования
- [ ] Integration тест searchMemory()
- [ ] Edge cases (пустые результаты, ошибки API)

---

### 8. Документация API (1 день)

**Создать:** `src/api/MEMORY_SERVICE_API.md`

**Содержание:**
```markdown
# Memory Service API Documentation

## Overview
Единый интерфейс для поиска по трём типам памяти.

## Methods

### searchMemory()
Главный метод для unified поиска.

**Parameters:**
- query: string - текст запроса
- user_id: string - ID пользователя
- personality_id?: string - фильтр по personality
- project_id?: string - фильтр по проекту

**Returns:**
UnifiedMemoryResult

**Example:**
```typescript
const results = await memoryService.searchMemory({
  query: 'How to use React hooks?',
  user_id: 'user-123',
  personality_id: 'pers-456',
  limit: 5,
});

console.log(results.results);
// [
//   { source: 'library', content: 'React hooks guide...', relevance: 0.92 },
//   { source: 'desk', content: 'Custom hooks examples...', relevance: 0.87 },
//   { source: 'diary', content: 'User prefers hooks over classes', relevance: 0.75 },
// ]
```

## Architecture
[Диаграмма работы Memory Service]
```

**Чеклист:**
- [ ] Написать API документацию
- [ ] Примеры использования
- [ ] Диаграмма архитектуры
- [ ] Типы TypeScript задокументированы

---

## 📊 Критерии завершения Sprint 3

**Sprint 3 считается завершённым когда:**

- ✅ Memory Service API реализован (`src/api/memory-service.ts`)
- ✅ Все три источника работают:
  - searchLibrary() ✅
  - searchDesk() ✅
  - searchDiary() ✅
- ✅ Unified searchMemory() объединяет результаты
- ✅ OpenAI embeddings интегрированы
- ✅ Тесты пройдены (>80% coverage)
- ✅ Документация написана
- ✅ PROJECT_ARCHITECTURE.md обновлён

---

## 🧪 TESTING SESSION (между Sprint 3 и Sprint 4)

**Дата:** После завершения Sprint 3
**Длительность:** 1-2 дня
**Цель:** Проверить работоспособность Memory Service в реальных условиях

### Тест-план

#### Тест 1: Поиск в пустой БД
**Шаги:**
1. Убедиться что таблицы пустые
2. Выполнить searchMemory("test query")
3. Ожидается: пустой результат, без ошибок

**Критерий успеха:** ✅ Graceful handling пустых данных

---

#### Тест 2: Загрузка тестовых данных

**Создать тестовые данные:**

**📚 БИБЛИОТЕКА (document_chunks):**
```sql
-- Вставить 5 документов о React
INSERT INTO document_chunks (user_id, is_public, content, embedding, file_name)
VALUES
  (NULL, true, 'React Hooks are functions that let you use state...', <embedding>, 'react-hooks.md'),
  (NULL, true, 'useState is the most common hook...', <embedding>, 'useState-guide.md'),
  -- ... еще 3 документа
```

**💼 РАБОЧИЙ СТОЛ (personality_embeddings):**
```sql
-- Вставить файлы для test personality
INSERT INTO personality_embeddings (personality_id, content, embedding, file_name)
VALUES
  ('test-pers', 'Custom React hooks examples...', <embedding>, 'custom-hooks.tsx'),
  -- ... еще 2 файла
```

**📓 ДНЕВНИК (MaaS):**
```sql
-- Вставить facts
INSERT INTO facts (project_id, subject, value, importance, tags)
VALUES
  ('test-proj', 'User Preference', '{"framework": "React"}', 8, ARRAY['react', 'preference']),
  -- ... еще 3 факта

-- Вставить summaries
INSERT INTO thread_summaries (project_id, summary_text, keywords)
VALUES
  ('test-proj', 'Discussed React hooks best practices', ARRAY['react', 'hooks']),
  -- ... еще 2 summary
```

**Скрипт загрузки:** `scripts/load-test-data.mjs`

**Чеклист:**
- [ ] Создать скрипт загрузки тестовых данных
- [ ] Сгенерировать embeddings для тестовых документов
- [ ] Загрузить данные в БД
- [ ] Проверить что все таблицы заполнены

---

#### Тест 3: Memory Service E2E

**Запрос 1: "React hooks"**
```typescript
const result = await memoryService.searchMemory({
  query: 'React hooks',
  user_id: 'test-user',
  personality_id: 'test-pers',
  project_id: 'test-proj',
  limit: 10,
});

console.log('Results:', result.results.length);
console.log('Sources:', result.sources_searched);
```

**Ожидаемый результат:**
- results.length >= 5
- Есть результаты из library 📚
- Есть результаты из desk 💼
- Есть результаты из diary 📓
- Отсортировано по relevance (desc)

**Критерий успеха:** ✅ Unified поиск работает, все источники используются

---

**Запрос 2: "User preferences"**
```typescript
const result = await memoryService.searchMemory({
  query: 'What are user preferences?',
  user_id: 'test-user',
  project_id: 'test-proj',
  limit: 5,
});
```

**Ожидаемый результат:**
- Топ результат из diary (facts о preferences)
- Высокая relevance для фактов

**Критерий успеха:** ✅ Дневник приоритизируется для user context

---

**Запрос 3: "Custom hooks examples"**
```typescript
const result = await memoryService.searchMemory({
  query: 'Custom hooks examples',
  user_id: 'test-user',
  personality_id: 'test-pers',
  limit: 5,
});
```

**Ожидаемый результат:**
- Топ результат из desk (personality files)
- Файлы personality более релевантны чем library

**Критерий успеха:** ✅ Desk приоритизируется для personality-specific данных

---

#### Тест 4: Performance

**Запрос с таймингом:**
```typescript
console.time('searchMemory');
const result = await memoryService.searchMemory({
  query: 'React hooks performance optimization',
  user_id: 'test-user',
  limit: 20,
});
console.timeEnd('searchMemory');

console.log('Time:', result.metadata.search_time_ms);
```

**Критерий успеха:**
- ✅ Поиск завершается < 2 секунд
- ✅ Параллельный поиск работает (Promise.all)

---

#### Тест 5: Error Handling

**Тест-кейсы:**
1. OpenAI API недоступен
2. Supabase connection error
3. Невалидный user_id
4. Пустой query

**Критерий успеха:** ✅ Graceful error handling, понятные сообщения об ошибках

---

### Testing Session Deliverables

**После Testing Session:**
- ✅ Все тесты пройдены
- ✅ Баги зафиксированы и исправлены
- ✅ Performance приемлемый
- ✅ Создан TESTING_REPORT.md с результатами
- ✅ Можно переходить к Sprint 4 (UI Components)

---

## 📈 Roadmap после Sprint 3

**Следующий:** Sprint 4 - UI Components (1-2 недели)
- MemoryLibrary.tsx
- MemoryDiary.tsx
- MemoryExplorer.tsx
- Интеграция в чат UI

**Потом:** Sprint 5 - AI Integration (1 неделя)
- Memory context в system prompt
- Continuous learning
- Fact extraction

---

*Создано: 2025-02-29*
*Sprint: 3 (Memory Service API)*
*Phase: 2 (Unified Memory System)*
