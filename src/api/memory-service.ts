/**
 * Memory Service API
 *
 * Unified interface для поиска по трём типам памяти:
 * 📚 БИБЛИОТЕКА (document_chunks)
 * 💼 РАБОЧИЙ СТОЛ (personality_embeddings)
 * 📓 ДНЕВНИК (MaaS facts/summaries/decisions)
 *
 * @module memory-service
 */

import { supabase } from '../lib/supabase';
import OpenAI from 'openai';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

/**
 * Тип источника памяти
 */
export type MemorySource = 'library' | 'desk' | 'diary';

/**
 * Результат поиска из одного источника
 */
export interface MemoryResult {
  /** Тип источника */
  source: MemorySource;

  /** Текстовое содержимое */
  content: string;

  /** Релевантность (0.0 - 1.0) */
  relevance: number;

  /** Метаданные результата */
  metadata: {
    file_name?: string;
    created_at?: string;
    tags?: string[];
    [key: string]: any;
  };
}

/**
 * Параметры запроса к памяти
 */
export interface MemoryQuery {
  /** Текст запроса */
  query: string;

  /** ID пользователя (обязательно) */
  user_id: string;

  /** Фильтр по personality (опционально) */
  personality_id?: string;

  /** Фильтр по проекту MaaS (опционально) */
  project_id?: string;

  /** Какие источники искать (default: все) */
  sources?: MemorySource[];

  /** Максимум результатов (default: 10) */
  limit?: number;

  /** Минимальный порог релевантности (default: 0.5) */
  similarity_threshold?: number;
}

/**
 * Unified результат поиска
 */
export interface UnifiedMemoryResult {
  /** Исходный запрос */
  query: string;

  /** Все результаты, отсортированные по relevance */
  results: MemoryResult[];

  /** Какие источники использовались */
  sources_searched: MemorySource[];

  /** Общее количество найденных результатов */
  total_results: number;

  /** Метаданные поиска */
  metadata: {
    search_time_ms?: number;
    embedding_time_ms?: number;
  };
}

// ============================================================================
// MEMORY SERVICE CLASS
// ============================================================================

/**
 * Memory Service - единый интерфейс для поиска по всем типам памяти
 */
export class MemoryService {
  private openai: OpenAI | null = null;
  private apiKey: string | null = null;

  constructor(openaiApiKey?: string) {
    if (openaiApiKey) {
      this.apiKey = openaiApiKey;
      this.openai = new OpenAI({ apiKey: openaiApiKey, dangerouslyAllowBrowser: true });
    }
  }

  /**
   * Инициализация OpenAI client (если не передан в конструкторе)
   */
  public initOpenAI(apiKey: string): void {
    this.apiKey = apiKey;
    this.openai = new OpenAI({ apiKey, dangerouslyAllowBrowser: true });
  }

  // ==========================================================================
  // MAIN METHOD: Unified Search
  // ==========================================================================

  /**
   * Главный метод: поиск по всем типам памяти
   *
   * @param query - параметры запроса
   * @returns unified результаты из всех источников
   *
   * @example
   * ```typescript
   * const results = await memoryService.searchMemory({
   *   query: 'React hooks best practices',
   *   user_id: 'user-123',
   *   personality_id: 'pers-456',
   *   limit: 10
   * });
   *
   * console.log(results.results); // Топ-10 релевантных результатов
   * ```
   */
  public async searchMemory(query: MemoryQuery): Promise<UnifiedMemoryResult> {
    const startTime = Date.now();

    // Default параметры
    const sources = query.sources || ['library', 'desk', 'diary'];
    const limit = query.limit || 10;
    const threshold = query.similarity_threshold || 0.5;

    try {
      // 1. Векторизация query (для library и desk)
      const embeddingStartTime = Date.now();
      let queryEmbedding: number[] | null = null;

      if (sources.includes('library') || sources.includes('desk')) {
        queryEmbedding = await this.getQueryEmbedding(query.query);
      }

      const embeddingTime = Date.now() - embeddingStartTime;

      // 2. Параллельный поиск по всем источникам
      const searchPromises: Promise<MemoryResult[]>[] = [];

      if (sources.includes('library') && queryEmbedding) {
        searchPromises.push(
          this.searchLibrary(queryEmbedding, query.user_id, query.project_id, limit, threshold)
        );
      }

      if (sources.includes('desk') && queryEmbedding && query.personality_id) {
        searchPromises.push(
          this.searchDesk(queryEmbedding, query.personality_id, limit, threshold)
        );
      }

      if (sources.includes('diary')) {
        searchPromises.push(
          this.searchDiary(query.query, query.user_id, query.project_id, limit)
        );
      }

      const searchResults = await Promise.all(searchPromises);

      // 3. Объединение результатов
      const allResults = searchResults.flat();

      // 4. Ранжирование по relevance
      allResults.sort((a, b) => b.relevance - a.relevance);

      // 5. Топ-N результатов
      const topResults = allResults.slice(0, limit);

      const totalTime = Date.now() - startTime;

      return {
        query: query.query,
        results: topResults,
        sources_searched: sources,
        total_results: allResults.length,
        metadata: {
          search_time_ms: totalTime,
          embedding_time_ms: embeddingTime,
        },
      };
    } catch (error) {
      console.error('Memory Service error:', error);
      throw new Error(`Failed to search memory: ${error}`);
    }
  }

  // ==========================================================================
  // SEARCH METHODS: Individual Sources
  // ==========================================================================

  /**
   * Поиск в 📚 БИБЛИОТЕКЕ (document_chunks)
   *
   * Использует векторный поиск по глобальной базе знаний.
   * Фильтрует по доступу (публичные + свои приватные).
   */
  private async searchLibrary(
    queryEmbedding: number[],
    userId: string,
    projectId?: string,
    limit: number = 5,
    threshold: number = 0.5
  ): Promise<MemoryResult[]> {
    try {
      // Вызываем SQL функцию search_document_chunks()
      const { data, error } = await supabase.rpc('search_document_chunks', {
        query_embedding: JSON.stringify(queryEmbedding),
        match_count: limit,
        filter_user_id: userId,
        filter_project_id: projectId || null,
        similarity_threshold: threshold,
      });

      if (error) throw error;

      // Преобразуем в MemoryResult[]
      return (data || []).map((item: any) => ({
        source: 'library' as MemorySource,
        content: item.content,
        relevance: item.similarity,
        metadata: {
          file_name: item.file_name,
          created_at: item.created_at,
          ...item.metadata,
        },
      }));
    } catch (error) {
      console.error('searchLibrary error:', error);
      return []; // Graceful fallback
    }
  }

  /**
   * Поиск в 💼 РАБОЧЕМ СТОЛЕ (personality_embeddings)
   *
   * Векторный поиск по файлам конкретного personality.
   */
  private async searchDesk(
    queryEmbedding: number[],
    personalityId: string,
    limit: number = 5,
    threshold: number = 0.5
  ): Promise<MemoryResult[]> {
    try {
      // TODO: Проверить существование таблицы personality_embeddings
      // Если нет - создать или использовать альтернативный подход

      const { data, error } = await supabase
        .from('personality_embeddings')
        .select('chunk_text, embedding, chunk_index, created_at')
        .eq('personality_id', personalityId)
        .limit(limit);

      if (error) {
        console.error('personality_embeddings error:', error);
        return [];
      }

      // Вычисляем cosine similarity вручную (если нет SQL функции)
      const results = (data || []).map((item: any) => {
        const similarity = this.cosineSimilarity(queryEmbedding, item.embedding);
        return {
          source: 'desk' as MemorySource,
          content: item.chunk_text,
          relevance: similarity,
          metadata: {
            chunk_index: item.chunk_index,
            created_at: item.created_at,
          },
        };
      });

      // Фильтруем по threshold и сортируем
      return results
        .filter(r => r.relevance >= threshold)
        .sort((a, b) => b.relevance - a.relevance)
        .slice(0, limit);
    } catch (error) {
      console.error('searchDesk error:', error);
      return []; // Graceful fallback
    }
  }

  /**
   * Поиск в 📓 ДНЕВНИКЕ (MaaS facts/summaries/decisions)
   *
   * Full-text search по фактам, саммари и решениям.
   */
  private async searchDiary(
    queryText: string,
    userId: string,
    projectId?: string,
    limit: number = 5
  ): Promise<MemoryResult[]> {
    try {
      const results: MemoryResult[] = [];

      // 1. Поиск в facts
      const factsResults = await this.searchFacts(queryText, projectId, limit);
      results.push(...factsResults);

      // 2. Поиск в thread_summaries
      const summariesResults = await this.searchSummaries(queryText, projectId, limit);
      results.push(...summariesResults);

      // 3. Поиск в decisions
      const decisionsResults = await this.searchDecisions(queryText, projectId, limit);
      results.push(...decisionsResults);

      // Сортируем по relevance
      results.sort((a, b) => b.relevance - a.relevance);

      return results.slice(0, limit);
    } catch (error) {
      console.error('searchDiary error:', error);
      return []; // Graceful fallback
    }
  }

  // ==========================================================================
  // DIARY SUB-METHODS
  // ==========================================================================

  /**
   * Поиск в facts
   */
  private async searchFacts(
    queryText: string,
    projectId?: string,
    limit: number = 5
  ): Promise<MemoryResult[]> {
    try {
      console.log('🔍 searchFacts called with:', { queryText, projectId, limit });

      let query = supabase
        .from('facts')
        .select('subject, value, importance, tags, metadata, created_at')
        .eq('is_active', true)
        .order('importance', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(limit);

      if (projectId) {
        query = query.eq('project_id', projectId);
      }

      // Simplified text search - только по subject (без JSONB casting)
      // TODO: Implement proper full-text search with PostgreSQL FTS
      if (queryText && queryText.length > 0) {
        query = query.ilike('subject', `%${queryText}%`);
      }

      const { data, error } = await query;

      if (error) throw error;

      console.log('📊 searchFacts found:', data?.length || 0, 'facts');
      if (data && data.length > 0) {
        console.log('📝 First fact:', data[0]);
      }

      return (data || []).map((item: any) => ({
        source: 'diary' as MemorySource,
        content: `${item.subject}: ${JSON.stringify(item.value)}`,
        relevance: item.importance / 10, // Normalize 1-10 to 0-1
        metadata: {
          tags: item.tags,
          created_at: item.created_at,
          ...item.metadata,
        },
      }));
    } catch (error) {
      console.error('searchFacts error:', error);
      return [];
    }
  }

  /**
   * Поиск в thread_summaries
   */
  private async searchSummaries(
    queryText: string,
    projectId?: string,
    limit: number = 5
  ): Promise<MemoryResult[]> {
    try {
      let query = supabase
        .from('thread_summaries')
        .select('summary_text, keywords, metadata, created_at')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (projectId) {
        query = query.eq('project_id', projectId);
      }

      query = query.ilike('summary_text', `%${queryText}%`);

      const { data, error } = await query;

      if (error) throw error;

      return (data || []).map((item: any) => ({
        source: 'diary' as MemorySource,
        content: item.summary_text,
        relevance: 0.7, // Default relevance для summaries
        metadata: {
          keywords: item.keywords,
          created_at: item.created_at,
          ...item.metadata,
        },
      }));
    } catch (error) {
      console.error('searchSummaries error:', error);
      return [];
    }
  }

  /**
   * Поиск в decisions
   */
  private async searchDecisions(
    queryText: string,
    projectId?: string,
    limit: number = 5
  ): Promise<MemoryResult[]> {
    try {
      let query = supabase
        .from('decisions')
        .select('decision_text, decision_type, priority, tags, metadata, created_at')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (projectId) {
        query = query.eq('project_id', projectId);
      }

      query = query.ilike('decision_text', `%${queryText}%`);

      const { data, error } = await query;

      if (error) throw error;

      // Маппинг priority к relevance
      const priorityMap: Record<string, number> = {
        urgent: 0.95,
        high: 0.85,
        medium: 0.7,
        low: 0.5,
      };

      return (data || []).map((item: any) => ({
        source: 'diary' as MemorySource,
        content: item.decision_text,
        relevance: priorityMap[item.priority] || 0.7,
        metadata: {
          decision_type: item.decision_type,
          priority: item.priority,
          tags: item.tags,
          created_at: item.created_at,
          ...item.metadata,
        },
      }));
    } catch (error) {
      console.error('searchDecisions error:', error);
      return [];
    }
  }

  // ==========================================================================
  // UTILITY METHODS
  // ==========================================================================

  /**
   * Генерация embedding для текстового запроса через OpenAI
   */
  private async getQueryEmbedding(query: string): Promise<number[]> {
    if (!this.openai) {
      throw new Error('OpenAI client not initialized. Call initOpenAI() first.');
    }

    try {
      const response = await this.openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: query,
      });

      return response.data[0].embedding;
    } catch (error) {
      console.error('OpenAI embeddings error:', error);
      throw new Error(`Failed to generate embedding: ${error}`);
    }
  }

  /**
   * Cosine similarity между двумя векторами
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Vectors must have same length');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}

// ============================================================================
// EXPORT DEFAULT INSTANCE
// ============================================================================

/**
 * Default Memory Service instance
 *
 * @example
 * ```typescript
 * import { memoryService } from './api/memory-service';
 *
 * memoryService.initOpenAI(apiKey);
 * const results = await memoryService.searchMemory({ ... });
 * ```
 */
export const memoryService = new MemoryService();

/**
 * Convenient wrapper function for searching memory
 *
 * @example
 * ```typescript
 * import { searchMemory } from './api/memory-service';
 *
 * const results = await searchMemory({
 *   query: 'user preferences',
 *   user_id: userId,
 *   personality_id: personalityId
 * });
 * ```
 */
export async function searchMemory(query: MemoryQuery): Promise<UnifiedMemoryResult> {
  return memoryService.searchMemory(query);
}
