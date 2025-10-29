import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Validate URL format
try {
  new URL(supabaseUrl);
} catch (error) {
  throw new Error(`Invalid Supabase URL format: ${supabaseUrl}. Please ensure VITE_SUPABASE_URL is a valid URL (e.g., https://your-project-ref.supabase.co)`);
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface PersonalityFile {
  openai_file_id: string;
  file_name: string;
  file_size: number;
  file_type: string;
  status: 'uploading' | 'processing' | 'ready' | 'error';
  uploaded_at: string;
  error_message?: string;
}

// ============================================================================
// UNIFIED MEMORY SYSTEM - TypeScript Types
// ============================================================================

// === БИБЛИОТЕКА (LIBRARY) - document_chunks ===
export interface DocumentChunk {
  id: string;
  user_id: string | null;  // null = публичный документ
  is_public: boolean;
  project_id: string | null;

  content: string;
  embedding: number[];  // vector(1536)

  file_name: string | null;
  file_type: string | null;
  file_size: number | null;
  source_url: string | null;

  metadata: Record<string, any>;

  created_at: string;
  updated_at: string;
}

// === ДНЕВНИК (DIARY) - MaaS Tables ===

// 0. Projects - MaaS проекты
export interface Project {
  id: string;
  user_id: string;
  name: string;
  mission: string | null;
  goals: string[] | null;
  is_default: boolean;
  status: string;
  created_at: string;
  updated_at: string;
}

// 1. Facts - факты из разговоров
export interface Fact {
  id: string;
  project_id: string;
  session_id: string | null;
  user_id: string | null;

  subject: string;
  value: Record<string, any>;  // JSONB
  level: 'fact' | 'insight' | 'pattern' | 'hypothesis';
  source_type: 'user_stated' | 'inferred' | 'observed' | 'derived';

  confidence: number;  // 0.0 - 1.0
  importance: number;  // 1 - 10

  tags: string[];
  metadata: Record<string, any>;
  is_active: boolean;

  created_at: string;
  updated_at: string;
}

// 2. Thread Summaries - саммари разговоров
export interface ThreadSummary {
  id: string;
  project_id: string;
  session_id: string | null;
  thread_id: string | null;

  summary_text: string;
  summary_type: 'auto' | 'manual' | 'periodic';

  message_count: number;
  token_count: number;

  first_message_at: string | null;
  last_message_at: string | null;

  keywords: string[];
  topics: any[];  // JSONB array
  metadata: Record<string, any>;

  created_at: string;
  updated_at: string;
}

// 3. Decisions - решения из разговоров
export interface Decision {
  id: string;
  project_id: string;
  session_id: string | null;

  decision_text: string;
  decision_type: 'action' | 'preference' | 'plan' | 'goal' | 'constraint' | 'other';

  status: 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'deferred';
  outcome: string | null;
  priority: 'low' | 'medium' | 'high' | 'urgent';

  due_date: string | null;
  completed_at: string | null;

  tags: string[];
  metadata: Record<string, any>;

  created_at: string;
  updated_at: string;
}

// 4. Links - связи между сущностями
export interface Link {
  id: string;
  project_id: string;

  source_type: 'fact' | 'decision' | 'summary' | 'message' | 'source' | 'chat' | 'other';
  source_id: string;

  target_type: 'fact' | 'decision' | 'summary' | 'message' | 'source' | 'chat' | 'other';
  target_id: string;

  link_type: 'related_to' | 'derived_from' | 'supports' | 'contradicts' | 'references' | 'depends_on' | 'other';

  strength: number;  // 0.0 - 1.0
  metadata: Record<string, any>;

  created_at: string;
}

// 5. Sources - внешние источники
export interface Source {
  id: string;
  project_id: string;

  source_type: 'web' | 'document' | 'api' | 'database' | 'manual' | 'other';

  source_url: string | null;
  source_title: string | null;
  source_content: string | null;
  source_excerpt: string | null;

  author: string | null;
  published_at: string | null;
  accessed_at: string;

  credibility_score: number;  // 0.0 - 1.0

  tags: string[];
  metadata: Record<string, any>;

  created_at: string;
  updated_at: string;
}

// 6. MaaS Metrics - метрики использования
export interface MaasMetric {
  id: string;
  project_id: string;

  metric_type: string;

  metric_value: number | null;
  metric_unit: string | null;

  entity_type: string | null;
  entity_id: string | null;

  metadata: Record<string, any>;

  recorded_at: string;
}

// 7. Snapshot Cache - кеш снапшотов
export interface SnapshotCache {
  id: string;
  project_id: string;
  session_id: string | null;

  snapshot_type: 'full' | 'incremental' | 'summary' | 'context' | 'other';

  snapshot_data: Record<string, any>;  // JSONB

  version: number;
  size_bytes: number | null;

  expires_at: string | null;
  last_accessed_at: string;
  access_count: number;

  metadata: Record<string, any>;

  created_at: string;
}

export type Database = {
  public: {
    Tables: {
      chats: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          created_at: string;
          updated_at: string;
          openai_thread_id: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          title?: string;
          created_at?: string;
          updated_at?: string;
          openai_thread_id?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          created_at?: string;
          updated_at?: string;
          openai_thread_id?: string | null;
        };
      };
      messages: {
        Row: {
          id: string;
          chat_id: string;
          role: 'user' | 'assistant';
          content: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          chat_id: string;
          role: 'user' | 'assistant';
          content: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          chat_id?: string;
          role?: 'user' | 'assistant';
          content?: string;
          created_at?: string;
        };
      };
      user_settings: {
        Row: {
          id: string;
          user_id: string;
          openai_api_key: string | null;
          model: string;
          temperature: number;
          max_tokens: number;
          theme: 'light' | 'dark';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          openai_api_key?: string | null;
          model?: string;
          temperature?: number;
          max_tokens?: number;
          theme?: 'light' | 'dark';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          openai_api_key?: string | null;
          model?: string;
          temperature?: number;
          max_tokens?: number;
          theme?: 'light' | 'dark';
          created_at?: string;
          updated_at?: string;
        };
      };
      personalities: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          description: string | null;
          prompt: string;
          is_active: boolean;
          has_memory: boolean;
          files: PersonalityFile[];
          file_instruction: string | null;
          openai_assistant_id: string | null;
          openai_file_id: string | null;
          file_name: string | null;
          file_content: string | null;
          uploaded_at: string | null;
          chunk_size: number | null;
          top_chunks: number | null;
          embedding_model: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          description?: string | null;
          prompt: string;
          is_active?: boolean;
          has_memory?: boolean;
          files?: PersonalityFile[];
          file_instruction?: string | null;
          openai_assistant_id?: string | null;
          openai_file_id?: string | null;
          file_name?: string | null;
          file_content?: string | null;
          uploaded_at?: string | null;
          chunk_size?: number | null;
          top_chunks?: number | null;
          embedding_model?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          description?: string | null;
          prompt?: string;
          is_active?: boolean;
          has_memory?: boolean;
          files?: PersonalityFile[];
          file_instruction?: string | null;
          openai_assistant_id?: string | null;
          openai_file_id?: string | null;
          file_name?: string | null;
          file_content?: string | null;
          uploaded_at?: string | null;
          chunk_size?: number | null;
          top_chunks?: number | null;
          embedding_model?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      // === UNIFIED MEMORY: БИБЛИОТЕКА ===
      document_chunks: {
        Row: DocumentChunk;
        Insert: Omit<DocumentChunk, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<DocumentChunk, 'id' | 'created_at'>>;
      };
      // === UNIFIED MEMORY: ДНЕВНИК (MaaS Tables) ===
      projects: {
        Row: Project;
        Insert: Omit<Project, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Project, 'id' | 'created_at'>>;
      };
      facts: {
        Row: Fact;
        Insert: Omit<Fact, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Fact, 'id' | 'created_at'>>;
      };
      thread_summaries: {
        Row: ThreadSummary;
        Insert: Omit<ThreadSummary, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<ThreadSummary, 'id' | 'created_at'>>;
      };
      decisions: {
        Row: Decision;
        Insert: Omit<Decision, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Decision, 'id' | 'created_at'>>;
      };
      links: {
        Row: Link;
        Insert: Omit<Link, 'id' | 'created_at'>;
        Update: Partial<Omit<Link, 'id' | 'created_at'>>;
      };
      sources: {
        Row: Source;
        Insert: Omit<Source, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Source, 'id' | 'created_at'>>;
      };
      maas_metrics: {
        Row: MaasMetric;
        Insert: Omit<MaasMetric, 'id' | 'recorded_at'>;
        Update: never;  // metrics are immutable
      };
      snapshot_cache: {
        Row: SnapshotCache;
        Insert: Omit<SnapshotCache, 'id' | 'created_at'>;
        Update: Partial<Omit<SnapshotCache, 'id' | 'created_at'>>;
      };
    };
  };
};