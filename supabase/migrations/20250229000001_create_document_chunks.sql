-- ============================================================================
-- UNIFIED MEMORY SYSTEM - PART 1: БИБЛИОТЕКА (document_chunks)
-- ============================================================================
-- Date: 2025-02-29
-- Description: Создание таблицы document_chunks для глобальной базы знаний
--
-- Часть Unified Memory System:
-- 📚 document_chunks - БИБЛИОТЕКА (этот файл)
-- 💼 personality_embeddings - РАБОЧИЙ СТОЛ (уже существует)
-- 📓 MaaS tables - ДНЕВНИК (следующая миграция)
-- ============================================================================

-- 1. Убедиться что pgvector extension установлен
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================================
-- СОЗДАНИЕ ТАБЛИЦЫ
-- ============================================================================

CREATE TABLE IF NOT EXISTS document_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- ГИБРИДНЫЙ ДОСТУП (Вариант В)
  -- NULL = публичный документ (доступен всем)
  -- UUID = приватный документ (только для этого пользователя)
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  is_public BOOLEAN DEFAULT false,

  -- Связь с MaaS проектами (опционально)
  -- Не используем FK чтобы не создавать зависимость до создания projects
  project_id UUID,

  -- ВЕКТОРНОЕ ХРАНИЛИЩЕ
  content TEXT NOT NULL,
  embedding VECTOR(1536) NOT NULL,  -- text-embedding-3-small

  -- МЕТАДАННЫЕ ФАЙЛА
  file_name TEXT,
  file_type TEXT,
  file_size INTEGER,
  source_url TEXT,  -- если файл загружен из URL

  -- JSONB для гибкости (дополнительные метаданные)
  metadata JSONB DEFAULT '{}'::jsonb,

  -- TIMESTAMPS
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- ИНДЕКСЫ ДЛЯ ПРОИЗВОДИТЕЛЬНОСТИ
-- ============================================================================

-- Индекс для фильтрации по user_id (только для приватных)
CREATE INDEX IF NOT EXISTS document_chunks_user_id_idx
  ON document_chunks(user_id)
  WHERE user_id IS NOT NULL;

-- Индекс для быстрого поиска публичных чанков
CREATE INDEX IF NOT EXISTS document_chunks_public_idx
  ON document_chunks(is_public)
  WHERE is_public = true;

-- Индекс для связи с проектами
CREATE INDEX IF NOT EXISTS document_chunks_project_id_idx
  ON document_chunks(project_id)
  WHERE project_id IS NOT NULL;

-- ВЕКТОРНЫЙ ИНДЕКС (ivfflat для cosine similarity)
-- lists: 100 для <1M rows, увеличить до 1000 для >1M rows
CREATE INDEX IF NOT EXISTS document_chunks_embedding_idx
  ON document_chunks
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists=100);

-- GIN индекс для JSONB metadata (быстрый поиск по метаданным)
CREATE INDEX IF NOT EXISTS document_chunks_metadata_idx
  ON document_chunks
  USING gin(metadata);

-- FULL-TEXT SEARCH индекс для content (опционально)
-- Позволяет искать по тексту без векторов
CREATE INDEX IF NOT EXISTS document_chunks_content_fts_idx
  ON document_chunks
  USING gin(to_tsvector('english', content));

-- ============================================================================
-- RLS (ROW LEVEL SECURITY) ПОЛИТИКИ
-- ============================================================================

-- Включить RLS для безопасности
ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;

-- Политика SELECT: пользователи видят публичные чанки + свои приватные
CREATE POLICY "Users can view public and own chunks"
  ON document_chunks
  FOR SELECT
  TO authenticated
  USING (
    is_public = true
    OR user_id = auth.uid()
  );

-- Политика INSERT: пользователи создают только свои чанки
CREATE POLICY "Users can insert own chunks"
  ON document_chunks
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Политика UPDATE: пользователи обновляют только свои чанки
CREATE POLICY "Users can update own chunks"
  ON document_chunks
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- Политика DELETE: пользователи удаляют только свои чанки
CREATE POLICY "Users can delete own chunks"
  ON document_chunks
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Функция для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_document_chunks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger на UPDATE
CREATE TRIGGER update_document_chunks_timestamp
  BEFORE UPDATE ON document_chunks
  FOR EACH ROW
  EXECUTE FUNCTION update_document_chunks_updated_at();

-- ============================================================================
-- SQL ФУНКЦИИ ДЛЯ ВЕКТОРНОГО ПОИСКА
-- ============================================================================

-- Функция поиска в библиотеке с фильтрацией по доступу
CREATE OR REPLACE FUNCTION search_document_chunks(
  query_embedding VECTOR(1536),
  match_count INT DEFAULT 5,
  filter_user_id UUID DEFAULT NULL,
  filter_project_id UUID DEFAULT NULL,
  similarity_threshold FLOAT DEFAULT 0.5
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  file_name TEXT,
  similarity FLOAT,
  metadata JSONB,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    dc.id,
    dc.content,
    dc.file_name,
    1 - (dc.embedding <=> query_embedding) AS similarity,
    dc.metadata,
    dc.created_at
  FROM document_chunks dc
  WHERE
    -- ДОСТУП: публичные ИЛИ свои
    (dc.is_public = true OR dc.user_id = filter_user_id)
    -- ФИЛЬТР: по проекту (если указан)
    AND (filter_project_id IS NULL OR dc.project_id = filter_project_id)
    -- ФИЛЬТР: порог similarity
    AND (1 - (dc.embedding <=> query_embedding)) >= similarity_threshold
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- ============================================================================
-- ОПТИМИЗАЦИЯ
-- ============================================================================

-- Analyze для обновления статистики query planner
ANALYZE document_chunks;

-- ============================================================================
-- КОММЕНТАРИИ ДЛЯ ДОКУМЕНТАЦИИ
-- ============================================================================

COMMENT ON TABLE document_chunks IS 'Глобальная библиотека знаний с гибридным доступом (публичные + приватные документы)';
COMMENT ON COLUMN document_chunks.user_id IS 'NULL = публичный для всех, UUID = приватный для пользователя';
COMMENT ON COLUMN document_chunks.is_public IS 'true = все видят, false = только owner';
COMMENT ON COLUMN document_chunks.project_id IS 'Опциональная связь с MaaS проектами';
COMMENT ON COLUMN document_chunks.embedding IS 'Вектор 1536 dimensions (text-embedding-3-small)';
COMMENT ON COLUMN document_chunks.metadata IS 'Дополнительные метаданные (tags, language, etc)';

-- ============================================================================
-- ИТОГО СОЗДАНО
-- ============================================================================
-- ✅ 1 таблица (document_chunks)
-- ✅ 6 индексов (включая векторный ivfflat + GIN для JSONB + FTS)
-- ✅ 4 RLS политики (SELECT, INSERT, UPDATE, DELETE)
-- ✅ 1 trigger (auto-update updated_at)
-- ✅ 1 SQL функция (search_document_chunks)
--
-- 📚 БИБЛИОТЕКА готова!
-- ============================================================================
