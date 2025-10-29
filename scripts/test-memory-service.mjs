/**
 * Memory Service API Test Script
 *
 * Быстрый тест для проверки работы Memory Service
 *
 * Usage:
 *   node scripts/test-memory-service.mjs
 */

import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import 'dotenv/config';

// ============================================================================
// CONFIGURATION
// ============================================================================

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const OPENAI_API_KEY = process.env.VITE_OPENAI_API_KEY || 'test-key';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ============================================================================
// SIMPLE MEMORY SERVICE (inline для теста)
// ============================================================================

class TestMemoryService {
  constructor(openaiApiKey) {
    this.openai = new OpenAI({ apiKey: openaiApiKey });
  }

  async searchMemory(query, userId, projectId = null) {
    console.log(`\n🔍 Searching memory for: "${query}"`);
    console.log(`   User: ${userId}`);
    console.log(`   Project: ${projectId || 'none'}\n`);

    const startTime = Date.now();

    try {
      // 1. Generate embedding
      console.log('📊 Generating embedding...');
      const embedding = await this.getQueryEmbedding(query);
      console.log(`   ✅ Embedding generated (${embedding.length} dimensions)\n`);

      // 2. Search all sources in parallel
      console.log('🔎 Searching all sources...\n');

      const [libraryResults, diaryResults] = await Promise.all([
        this.searchLibrary(embedding, userId, projectId),
        this.searchDiary(query, userId, projectId),
      ]);

      // 3. Combine and rank
      const allResults = [...libraryResults, ...diaryResults];
      allResults.sort((a, b) => b.relevance - a.relevance);

      const totalTime = Date.now() - startTime;

      console.log(`✅ Search completed in ${totalTime}ms\n`);

      return {
        query,
        results: allResults.slice(0, 10),
        total_results: allResults.length,
        search_time_ms: totalTime,
      };
    } catch (error) {
      console.error('❌ Search error:', error.message);
      throw error;
    }
  }

  async getQueryEmbedding(query) {
    const response = await this.openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: query,
    });
    return response.data[0].embedding;
  }

  async searchLibrary(embedding, userId, projectId) {
    try {
      console.log('📚 Searching LIBRARY (document_chunks)...');

      // userId нужен в UUID формате, но для теста используем NULL (поиск только публичных)
      const { data, error } = await supabase.rpc('search_document_chunks', {
        query_embedding: JSON.stringify(embedding),
        match_count: 5,
        filter_user_id: null,  // NULL = только публичные документы
        filter_project_id: projectId,
        similarity_threshold: 0.3,  // Понижаем порог для тестов
      });

      if (error) {
        console.log(`   ⚠️  Library search failed: ${error.message}`);
        return [];
      }

      console.log(`   ✅ Found ${data?.length || 0} results from library\n`);

      return (data || []).map(item => ({
        source: 'library',
        content: item.content,
        relevance: item.similarity,
        metadata: { file_name: item.file_name },
      }));
    } catch (error) {
      console.log(`   ⚠️  Library error: ${error.message}`);
      return [];
    }
  }

  async searchDiary(query, userId, projectId) {
    try {
      console.log('📓 Searching DIARY (MaaS tables)...');

      // Search facts - используем правильный синтаксис для полнотекстового поиска
      let factsQuery = supabase
        .from('facts')
        .select('subject, value, importance, tags')
        .eq('is_active', true)
        .limit(5);

      if (projectId) {
        factsQuery = factsQuery.eq('project_id', projectId);
      }

      // Ищем по subject (используем textSearch вместо or + ilike)
      factsQuery = factsQuery.textSearch('subject', `'${query}'`, {
        type: 'websearch',
        config: 'english'
      });

      const { data: facts, error: factsError } = await factsQuery;

      if (factsError) {
        console.log(`   ⚠️  Facts search failed: ${factsError.message}`);

        // Fallback: простой поиск без full-text search
        console.log('   🔄 Trying simple search fallback...');
        const { data: fallbackFacts, error: fallbackError } = await supabase
          .from('facts')
          .select('subject, value, importance, tags')
          .eq('is_active', true)
          .limit(5);

        if (!fallbackError && fallbackFacts && fallbackFacts.length > 0) {
          console.log(`   ✅ Found ${fallbackFacts.length} results from diary (all facts)\n`);
          return fallbackFacts.map(item => ({
            source: 'diary',
            content: `${item.subject}: ${JSON.stringify(item.value)}`,
            relevance: item.importance / 10,
            metadata: { tags: item.tags },
          }));
        }

        return [];
      }

      console.log(`   ✅ Found ${facts?.length || 0} results from diary\n`);

      return (facts || []).map(item => ({
        source: 'diary',
        content: `${item.subject}: ${JSON.stringify(item.value)}`,
        relevance: item.importance / 10,
        metadata: { tags: item.tags },
      }));
    } catch (error) {
      console.log(`   ⚠️  Diary error: ${error.message}`);
      return [];
    }
  }
}

// ============================================================================
// TEST FUNCTIONS
// ============================================================================

async function testDatabaseConnection() {
  console.log('━'.repeat(60));
  console.log('🧪 TEST 1: Database Connection');
  console.log('━'.repeat(60));

  try {
    const { data, error } = await supabase
      .from('chats')
      .select('count')
      .limit(1);

    if (error) throw error;

    console.log('✅ Supabase connection OK\n');
    return true;
  } catch (error) {
    console.error('❌ Supabase connection failed:', error.message);
    return false;
  }
}

async function testTablesExist() {
  console.log('━'.repeat(60));
  console.log('🧪 TEST 2: Check Tables Exist');
  console.log('━'.repeat(60));

  const tables = [
    'document_chunks',
    'projects',
    'facts',
    'thread_summaries',
    'decisions',
  ];

  for (const table of tables) {
    try {
      const { error } = await supabase.from(table).select('count').limit(1);

      if (error) {
        console.log(`   ❌ ${table}: NOT FOUND`);
      } else {
        console.log(`   ✅ ${table}: EXISTS`);
      }
    } catch (error) {
      console.log(`   ❌ ${table}: ERROR`);
    }
  }

  console.log();
}

async function testMemorySearch() {
  console.log('━'.repeat(60));
  console.log('🧪 TEST 3: Memory Service Search');
  console.log('━'.repeat(60));

  const service = new TestMemoryService(OPENAI_API_KEY);

  const testQueries = [
    { query: 'React hooks', user_id: 'test-user' },
    { query: 'user preferences', user_id: 'test-user' },
    { query: 'project goals', user_id: 'test-user' },
  ];

  for (const { query, user_id } of testQueries) {
    try {
      const result = await service.searchMemory(query, user_id);

      console.log('📊 RESULTS:');
      console.log(`   Total: ${result.total_results}`);
      console.log(`   Time: ${result.search_time_ms}ms`);

      if (result.results.length > 0) {
        console.log('\n   Top 3 results:');
        result.results.slice(0, 3).forEach((r, i) => {
          console.log(`   ${i + 1}. [${r.source}] (${(r.relevance * 100).toFixed(1)}%)`);
          console.log(`      ${r.content.substring(0, 60)}...`);
        });
      } else {
        console.log('   ⚠️  No results found (database may be empty)');
      }

      console.log();
    } catch (error) {
      console.error(`❌ Search failed: ${error.message}\n`);
    }
  }
}

async function testSQLFunction() {
  console.log('━'.repeat(60));
  console.log('🧪 TEST 4: SQL Function (search_document_chunks)');
  console.log('━'.repeat(60));

  try {
    // Test with dummy embedding
    const dummyEmbedding = Array(1536).fill(0.1);

    const { data, error } = await supabase.rpc('search_document_chunks', {
      query_embedding: JSON.stringify(dummyEmbedding),
      match_count: 5,
      filter_user_id: null,  // NULL для поиска только публичных документов
      filter_project_id: null,
      similarity_threshold: 0.0,
    });

    if (error) {
      console.log(`   ❌ SQL function not found or error: ${error.message}`);
    } else {
      console.log(`   ✅ SQL function works (returned ${data?.length || 0} results)`);
    }

    console.log();
  } catch (error) {
    console.log(`   ❌ SQL function error: ${error.message}\n`);
  }
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log('\n');
  console.log('═'.repeat(60));
  console.log('  MEMORY SERVICE API - TEST SUITE');
  console.log('═'.repeat(60));
  console.log();

  // Run tests
  const dbOk = await testDatabaseConnection();

  if (!dbOk) {
    console.log('❌ Cannot proceed without database connection');
    process.exit(1);
  }

  await testTablesExist();
  await testSQLFunction();
  await testMemorySearch();

  console.log('═'.repeat(60));
  console.log('  ✅ ALL TESTS COMPLETED');
  console.log('═'.repeat(60));
  console.log();
}

main().catch(console.error);
