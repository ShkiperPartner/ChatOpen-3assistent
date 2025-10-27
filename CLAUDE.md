# Claude Code Working Instructions

**Проект:** ChatOpenAI Integration Assistant
**Цель:** Мета-инструкции для эффективной работы с проектом
**Дата создания:** 2025-01-31

---

## 📝 Migration Notice

> This project was migrated to Claude Code Starter framework v1.2.4 on 2025-10-27

**Archive location:** `archive/`
**Migration report:** `archive/MIGRATION_REPORT.md`
**Framework version:** v1.2.4

**Single source of truth is now Init/ folder.**
Legacy documentation archived for reference only.

---

## 🎯 Первые шаги при работе с проектом

### Обязательно прочитать перед любыми изменениями:
1. **PROJECT_ARCHITECTURE.md** - 🎯 ЕДИНЫЙ БЭКЛОГ, полная архитектура проекта
2. **supabase/docs/DATABASE_CHANGELOG.md** - текущая структура БД
3. **README.md** - основная информация о проекте

### ⚠️ ЕДИНЫЙ ИСТОЧНИК ИСТИНЫ ДЛЯ БЭКЛОГА:
**ТОЛЬКО PROJECT_ARCHITECTURE.md раздел "Current Implementation Status"**
- Все остальные файлы (TODOS_DEPRECATED.md, ORIGINAL_REQUIREMENTS.md) только для справки
- При конфликтах - PROJECT_ARCHITECTURE.md имеет приоритет

### Быстрая ориентация:
```bash
# Структура ключевых файлов
PROJECT_ARCHITECTURE.md       # 🎯 ЕДИНЫЙ БЭКЛОГ И ПЛАН ПРОЕКТА
src/store/useStore.ts          # Центральное состояние Zustand
src/lib/openai.ts              # OpenAI API service
src/lib/supabase.ts            # Типы БД + Supabase client
src/components/Personalities.tsx # UI управления ассистентами

# Справочные файлы (не бэклог!)
TODOS_DEPRECATED.md           # Устаревший roadmap (только для справки)
ORIGINAL_REQUIREMENTS.md      # Первоначальное ТЗ (только для справки)
```

---

## ⚠️ Критические правила работы

### 🚫 НИКОГДА НЕ ДЕЛАТЬ:
- **Создавать новые таблицы** без анализа существующей схемы
- **Дублировать API вызовы** OpenAI (особенно в polling)
- **Обновлять БД структуру** без миграционного скрипта
- **Забывать транслитерацию** для OpenAI (кириллица → латиница)
- **Игнорировать RLS политики** в Supabase

### ✅ ВСЕГДА ДЕЛАТЬ:
- **Читать PROJECT_ARCHITECTURE.md** перед архитектурными изменениями
- **Тестировать миграции** в dev окружении
- **Обновлять TypeScript типы** после изменений БД
- **Использовать существующие паттерны** (Zustand store, JSONB для файлов)
- **Документировать изменения** в DATABASE_CHANGELOG.md

---

## 🔧 Рабочие процедуры

### Изменения в базе данных:
```
1. Анализ → читаем DATABASE_CHANGELOG.md
2. План → создаем миграционный скрипт  
3. Тестирование → node apply-migration.mjs
4. Обновление типов → src/lib/supabase.ts
5. Документация → DATABASE_CHANGELOG.md
```

### Работа с OpenAI API:
```
1. Всегда проверяй транслитерацию имен
2. Избегай дублирования polling вызовов
3. Используй оптимизированный checkRun в useStore
4. Помни: файлы в OpenAI, метаданные в БД
```

### Архитектурные решения:
```
1. Файлы → OpenAI Files API (НЕ Supabase Storage)
2. Состояние → Zustand (НЕ Redux/Context)  
3. Файловые метаданные → JSONB массив в personalities.files
4. Множественные файлы → PersonalityFile[] интерфейс
```

---

## 🏗️ Архитектурные принципы

### OpenAI Integration:
- **Assistant создание:** обязательная транслитерация имени
- **Polling optimization:** reuse lastRunCheck результата
- **Files API:** используем OpenAI, не свою векторизацию
- **System prompt:** base_prompt + file_instruction

### Database Design:
- **Primary Keys:** всегда UUID
- **File storage:** JSONB массивы с GIN индексами
- **Constraints:** максимум 20 файлов на personality
- **RLS:** строгие политики доступа

### State Management:
- **Zustand patterns:** selective subscriptions  
- **Service injection:** openaiService в store
- **Error handling:** graceful fallbacks в UI

---

## 🐛 Частые проблемы и решения

### Дублирование API вызовов:
**Проблема:** Множественные "Run status" в консоли  
**Решение:** Использовать lastRunCheck в useStore.sendMessage()  
**Файл:** `src/store/useStore.ts:sendMessage()`

### Кириллические имена в OpenAI:
**Проблема:** OpenAI не принимает кириллицу в именах  
**Решение:** Транслитерация в createAssistant/updateAssistant  
**Файл:** `src/lib/openai.ts`

### Миграции БД:
**Проблема:** Failing transactions  
**Решение:** Разбивать на отдельные SQL команды  
**Паттерн:** Не использовать BEGIN/COMMIT в rpc('exec_sql')

### Типы TypeScript:
**Проблема:** Type mismatches после изменений БД  
**Решение:** Обновляй Database interface в supabase.ts  
**Особенность:** uploaded_at::text для timestamp кастинга

---

## 📋 Чеклисты для типовых задач

### Добавление нового поля в personalities:
- [ ] Создать миграционный скрипт
- [ ] Протестировать в dev
- [ ] Обновить Database interface
- [ ] Обновить PersonalityFile interface (если нужно)
- [ ] Обновить store методы
- [ ] Обновить UI компоненты
- [ ] Документировать в DATABASE_CHANGELOG.md

### Новая функция OpenAI API:
- [ ] Добавить метод в OpenAIService
- [ ] Обработать транслитерацию (если имена)
- [ ] Добавить в store action
- [ ] Обновить UI
- [ ] Протестировать избежание дублирования

### Работа с файлами:
- [ ] Помнить: файлы в OpenAI, метаданные в БД
- [ ] Использовать PersonalityFile interface
- [ ] Обновлять files JSONB массив
- [ ] Синхронизировать с OpenAI assistant
- [ ] Проверять constraint на 20 файлов

---

## 🔍 Быстрая диагностика

### При проблемах с БД:
```sql
-- Проверить структуру personalities
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'personalities';

-- Проверить индексы
SELECT indexname, indexdef FROM pg_indexes 
WHERE tablename = 'personalities';
```

### При проблемах с OpenAI:
```javascript
// Проверить API key в браузере
localStorage.getItem('openai_api_key')

// Проверить транслитерацию
console.log(transliterate('Тестовый Ассистент'))
```

### При проблемах с состоянием:
```javascript
// Zustand store debug
useStore.getState()
```

---

## 📊 Важные метрики производительности

### OpenAI API:
- **Polling interval:** оптимизированный в useStore
- **Duplicate calls:** должны отсутствовать в консоли
- **Error handling:** graceful fallbacks

### Database:
- **GIN индексы:** для JSONB files queries
- **RLS policies:** активны для всех таблиц
- **Connection pooling:** управляется Supabase

### Frontend:
- **Re-renders:** минимальные благодаря Zustand
- **Component patterns:** 1 компонент = 1 файл
- **TypeScript:** strict режим, no any

---

## 🚀 Шаблоны кода

### Новый метод в OpenAI service:
```typescript
async newMethod(param: string): Promise<ResultType> {
  if (!this.client) throw new Error('OpenAI client not initialized');
  
  try {
    const result = await this.client.someAPI({
      name: transliterate(param), // Если есть имена
      // другие параметры
    });
    return result;
  } catch (error) {
    throw new Error(`Failed to execute: ${error}`);
  }
}
```

### Новый store action:
```typescript
newAction: async (param: string) => {
  try {
    set(state => ({ loading: true }));
    
    // DB update
    const { data, error } = await supabase
      .from('table')
      .update({ field: param })
      .select();
      
    if (error) throw error;
    
    // OpenAI sync если нужно
    await get().openaiService.syncMethod();
    
    set(state => ({ 
      data: data,
      loading: false 
    }));
  } catch (error) {
    set(state => ({ 
      loading: false,
      error: error.message 
    }));
  }
}
```

---

## 📝 Заметки по развитию

### Следующие фичи (из PROJECT_ARCHITECTURE.md):
- File upload к ассистентам
- Function calling для ассистентов  
- Export/import чатов
- Аналитика использования

### Технический долг:
- Оптимизация bundle size
- Code splitting для больших компонентов
- Улучшение error boundaries

---

## 🔄 Спринтовая работа и циклы разработки

### Структура спринта:
```
🎯 НАЧАЛО СПРИНТА
├── "Давай добавим/изменим X"
├── Планирование (TodoWrite)
├── Реализация с экспериментами
├── Тестирование
├── Возможные откаты
└── Финальная реализация

📋 ЗАВЕРШЕНИЕ СПРИНТА (ОБЯЗАТЕЛЬНО!)
├── Обновить PROJECT_ARCHITECTURE.md
├── Обновить DATABASE_CHANGELOG.md (если были изменения БД)
├── Обновить CLAUDE.md (новые правила/ошибки)
├── Обновить README.md (версия + основные изменения)
├── Коммит с описанием изменений
└── 🎉 Минорный релиз готов
```

### 🚨 КРИТИЧНО: Завершающие действия спринта

**НИКОГДА не заканчивай спринт без обновления документации!**

#### Чеклист завершения спринта:
- [ ] **PROJECT_ARCHITECTURE.md** - обновить статус реализации, добавить новые компоненты
- [ ] **DATABASE_CHANGELOG.md** - задокументировать все изменения БД
- [ ] **CLAUDE.md** - добавить новые правила/ошибки из спринта  
- [ ] **README.md** - обновить версию и краткое описание изменений
- [ ] **Git commit** - с осмысленным сообщением о завершении спринта
- [ ] Убедиться что все TodoWrite задачи помечены как completed

#### Шаблон коммита завершения спринта:
```bash
git add .
git commit -m "Sprint: [Краткое описание фичи]

- Implemented: [основная функциональность]  
- Updated: PROJECT_ARCHITECTURE.md, DATABASE_CHANGELOG.md
- Fixed: [если были исправления]
- Docs: обновлена документация проекта

🤖 Generated with Claude Code

Co-Authored-By: Claude <noreply@anthropic.com>"
```

### Паттерны работы со спринтами:

#### Спринт с изменениями БД:
```
1. План миграции
2. Тест в dev  
3. Обновление типов TypeScript
4. Реализация в коде
5. ОБЯЗАТЕЛЬНО: DATABASE_CHANGELOG.md
6. ОБЯЗАТЕЛЬНО: PROJECT_ARCHITECTURE.md
```

#### Спринт с новой фичей:
```
1. Анализ архитектуры (читаем документы)
2. Планирование
3. Реализация  
4. Тестирование
5. ОБЯЗАТЕЛЬНО: PROJECT_ARCHITECTURE.md (новые компоненты)
6. ОБЯЗАТЕЛЬНО: CLAUDE.md (новые правила)
```

#### Спринт с багфиксом:
```
1. Диагностика
2. Исправление
3. Тестирование  
4. ОБЯЗАТЕЛЬНО: CLAUDE.md (добавить в "Частые проблемы")
5. ОБЯЗАТЕЛЬНО: README.md (обновить версию)
```

### 🎯 Цели циклической работы:
- **Документация всегда актуальна** 
- **Каждый спринт = минорное улучшение**
- **Накопление знаний** в CLAUDE.md
- **Git история** отражает логические завершения
- **Возможность отката** к любому завершенному спринту

---

## 🎯 Стиль сотрудничества и алгоритм работы

**Формула:** задача → анализ → решение → проверка результата → следующий шаг

### 1) Задача
- Формулируем единичную цель (минимальной ширины)
- Фиксируем входы: что уже есть, где хранится, какие ограничения

### 2) Анализ  
- Коротко: варианты, риски, зависимости, инструменты
- Проверяем связь с приоритетом PROJECT_ARCHITECTURE.md

### 3) Решение
- Пошаговая инструкция для новичка (максимум простоты)
- Готовые артефакты: текст, код, файлы, команды, чек-лист

### 4) Проверка результата
- Что считать успехом? (конкретные признаки/скрин/лог)
- Если ошибка — краткая диагностика и фикс

### 5) Следующий шаг
- Одна новая задача, вытекающая из результата
- Никаких «параллельных веток», пока не зафиксирован прогресс

**Принципы:**
- Минимальная ширина каждой задачи
- Один следующий шаг без параллельных веток
- Конкретные критерии успеха для каждого этапа

---

## 🚀 Claude 4.5 Capabilities & Optimizations

**Версия модели:** claude-sonnet-4-5-20250929
**Дата обновления возможностей:** 2025-01-31

### 🎯 Новые возможности для проекта

#### 1. Улучшенная работа с архитектурой
**Что изменилось:**
- Более точное понимание связей между файлами (useStore → openai → Components)
- Лучший анализ зависимостей при рефакторинге
- Меньше ошибок при работе со сложными TypeScript типами

**Применение:**
```typescript
// Теперь лучше понимаю такие цепочки:
useStore.uploadPersonalityFile() →
  openaiService.uploadFileToOpenAI() →
    update personalities.files[] JSONB →
      sync OpenAI Assistant
```

#### 2. Database & Migrations
**Улучшения:**
- Более надежные SQL миграционные скрипты
- Лучше отслеживаю RLS политики и constraints
- Точнее работаю с JSONB структурами и GIN индексами

**Паттерн миграций:**
```sql
-- Теперь генерирую более безопасные миграции:
ALTER TABLE personalities
ADD COLUMN IF NOT EXISTS new_field JSONB DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS idx_name
ON table USING gin(jsonb_field);
```

#### 3. TypeScript Type Safety
**Что улучшилось:**
- Точнее генерирую Database interface из схемы Supabase
- Лучше работаю с union types и generics
- Меньше промахов с PersonalityFile[] и JSONB mapping

**Пример:**
```typescript
// Более точная типизация JSONB:
type PersonalityFile = {
  openai_file_id: string;
  file_name: string;
  file_size: number;
  uploaded_at: string; // правильный кастинг timestamp
  status: 'ready' | 'processing' | 'error';
};
```

#### 4. Оптимизация React Patterns
**Новые рекомендации:**
- Лучше применяю Zustand selective subscriptions
- Точнее определяю места для useMemo/useCallback
- Меньше лишних re-renders в компонентах

**Оптимизация:**
```typescript
// Selective subscription (избегаем лишних re-renders):
const uploadFile = useStore(state => state.uploadPersonalityFile);
// вместо:
const store = useStore(); // ← ре-рендер при ЛЮБОМ изменении
```

#### 5. OpenAI API Best Practices
**Улучшения:**
- Лучше понимаю оптимизацию polling (избежание дублирования)
- Точнее работаю с Assistants API v2
- Правильнее обрабатываю транслитерацию

**Паттерн:**
```typescript
// Избегаем дублирования API calls:
if (lastRunCheck && Date.now() - lastRunCheck < 1000) {
  return; // reuse previous check
}
```

### 📊 Рекомендации по применению

#### Для текущих задач:
- ✅ **Ревью типов** - проверить все Database/JSONB типы
- ✅ **Оптимизация store** - найти избыточные subscriptions
- ✅ **SQL безопасность** - ревью существующих миграций
- ✅ **Component optimization** - найти лишние re-renders

#### Для новых фичей:
- 🎯 **Function calling** - правильная интеграция с Assistants API
- 🎯 **Advanced file types** - типобезопасная обработка
- 🎯 **Export/Import** - оптимизированная сериализация
- 🎯 **Analytics** - эффективные JSONB queries

### 🔍 Диагностические возможности

**Что теперь могу делать лучше:**
- Анализировать performance bottlenecks в React
- Находить проблемы с TypeScript типами до runtime
- Предлагать оптимизации SQL запросов
- Обнаруживать потенциальные race conditions

### 💡 Workflow улучшения

**Новый подход к спринтам:**
```
1. Анализ архитектуры (точнее понимаю связи)
2. Планирование с учетом типов (меньше ошибок)
3. Реализация с оптимизацией (selective subscriptions)
4. Ревью безопасности (RLS, constraints)
5. Документирование (структурированно)
```

---

*Этот файл должен обновляться при каждом завершении спринта*
*Цель: циклическая разработка с обязательным обновлением документации*
*Последнее обновление: 2025-01-31 (добавлены Claude 4.5 capabilities)*