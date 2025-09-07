/*
  # Add RAG support to personalities

  1. Extensions
    - Enable pgcrypto for UUID generation
    - Enable vector extension for embeddings

  2. Schema Changes
    - Add user_id to personalities table for RLS
    - Add file-related fields to `personalities` table
    - Add configurable RAG parameters
    - Create `personality_embeddings` table for vector storage

  3. New Fields in personalities:
    - user_id: User reference for RLS policies
    - file_name: Original filename
    - file_instruction: User instructions for file usage
    - file_content: Backup of file content
    - uploaded_at: File upload timestamp
    - chunk_size: Configurable chunk size (default: 800)
    - top_chunks: Number of relevant chunks to retrieve (default: 3)
    - embedding_model: OpenAI embedding model (default: text-embedding-3-small)
    - openai_file_id: OpenAI file ID if using their file storage

  4. New Table: personality_embeddings
    - Stores text chunks and their vector embeddings
    - Linked to personalities for efficient retrieval
*/

-- 0) Расширения
create extension if not exists pgcrypto;  -- для gen_random_uuid()
create extension if not exists vector;    -- тип vector(...) для эмбеддингов

-- 1) personalities: добавим дополнительные RAG поля (базовые поля уже созданы в основной миграции)
alter table public.personalities
  add column if not exists file_name text,
  add column if not exists file_content text,
  add column if not exists uploaded_at timestamptz,
  add column if not exists chunk_size integer default 800,
  add column if not exists top_chunks integer default 3,
  add column if not exists embedding_model text default 'text-embedding-3-small';

-- 2) Таблица для эмбеддингов
create table if not exists public.personality_embeddings (
  id uuid primary key default gen_random_uuid(),
  personality_id uuid not null references public.personalities(id) on delete cascade,
  chunk_text text not null,
  chunk_index integer not null,
  embedding vector(1536) not null, -- text-embedding-3-small = 1536
  created_at timestamptz not null default now()
);

-- 3) Индексы
create index if not exists personality_embeddings_personality_id_idx
  on public.personality_embeddings(personality_id);

-- ivfflat требует pgvector; lists подберите позже по объёму (100 — старт)
create index if not exists personality_embeddings_embedding_idx
  on public.personality_embeddings using ivfflat (embedding vector_cosine_ops)
  with (lists=100);

analyze public.personality_embeddings;

-- 4) RLS на таблицу эмбеддингов
alter table public.personality_embeddings enable row level security;

-- Пересоздаём политики, если уже есть
do $$
begin
  if exists (select 1 from pg_policies
             where schemaname='public' and tablename='personality_embeddings'
               and policyname='Users can view their own personality embeddings') then
    execute 'drop policy "Users can view their own personality embeddings" on public.personality_embeddings';
  end if;
  if exists (select 1 from pg_policies
             where schemaname='public' and tablename='personality_embeddings'
               and policyname='Users can insert embeddings for their own personalities') then
    execute 'drop policy "Users can insert embeddings for their own personalities" on public.personality_embeddings';
  end if;
  if exists (select 1 from pg_policies
             where schemaname='public' and tablename='personality_embeddings'
               and policyname='Users can update embeddings for their own personalities') then
    execute 'drop policy "Users can update embeddings for their own personalities" on public.personality_embeddings';
  end if;
  if exists (select 1 from pg_policies
             where schemaname='public' and tablename='personality_embeddings'
               and policyname='Users can delete embeddings for their own personalities') then
    execute 'drop policy "Users can delete embeddings for their own personalities" on public.personality_embeddings';
  end if;
end$$;

create policy "Users can view their own personality embeddings"
  on public.personality_embeddings for select to authenticated
  using (exists (
    select 1 from public.personalities p
    where p.id = personality_embeddings.personality_id
      and p.user_id = auth.uid()
  ));

create policy "Users can insert embeddings for their own personalities"
  on public.personality_embeddings for insert to authenticated
  with check (exists (
    select 1 from public.personalities p
    where p.id = personality_embeddings.personality_id
      and p.user_id = auth.uid()
  ));

create policy "Users can update embeddings for their own personalities"
  on public.personality_embeddings for update to authenticated
  using (exists (
    select 1 from public.personalities p
    where p.id = personality_embeddings.personality_id
      and p.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.personalities p
    where p.id = personality_embeddings.personality_id
      and p.user_id = auth.uid()
  ));

create policy "Users can delete embeddings for their own personalities"
  on public.personality_embeddings for delete to authenticated
  using (exists (
    select 1 from public.personalities p
    where p.id = personality_embeddings.personality_id
      and p.user_id = auth.uid()
  ));