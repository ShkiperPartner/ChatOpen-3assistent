# 🔧 Pending Database Migration

**Created:** 2025-11-01
**Status:** ⏳ TO BE APPLIED

---

## Migration: Add updated_at to chats table

**File:** `supabase/migrations/20251101000000_add_chats_updated_at.sql`

### Why needed:
- Chats need to sort by last activity (not creation time)
- When user sends message → chat should "bubble up" to top
- Better UX for chat list

### Current temporary fix:
- Code uses `created_at` for sorting (see `src/store/useStore.ts:131`)
- Works but not ideal (old chats stay at bottom even with new messages)

---

## 🚀 How to Apply

### Option 1: Supabase SQL Editor (Recommended, 2 minutes)

1. Open: https://supabase.com/dashboard/project/tslfszdhvmszbazutcdi/sql/new

2. Copy-paste this SQL:

```sql
-- 1. Add updated_at column
ALTER TABLE public.chats
ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now() NOT NULL;

-- 2. Backfill existing records
UPDATE public.chats
SET updated_at = created_at;

-- 3. Create trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Create trigger
DROP TRIGGER IF EXISTS update_chats_updated_at ON public.chats;
CREATE TRIGGER update_chats_updated_at
  BEFORE UPDATE ON public.chats
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Create index
CREATE INDEX IF NOT EXISTS chats_updated_at_idx ON public.chats(updated_at DESC);
```

3. Click **"Run"** (or Ctrl+Enter)

4. Expected result: `Success. No rows returned`

---

### Option 2: Supabase CLI (Alternative)

```bash
# If you have service_role_key:
npx supabase db push --db-url "postgresql://postgres:[PASSWORD]@db.tslfszdhvmszbazutcdi.supabase.co:5432/postgres"
```

---

## ✅ After Migration Applied

1. **Update code:**
   - Remove TODO comment in `src/store/useStore.ts:131`
   - Verify `order('updated_at')` works

2. **Update documentation:**
   - Change ⏳ PENDING → ✅ APPLIED in DATABASE_CHANGELOG.md
   - Delete this file (MIGRATION_TODO.md)

3. **Test:**
   - Create new chat
   - Send message
   - Check chat moves to top of list

---

## 🔍 Verify Migration Applied

```sql
-- Check column exists
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'chats' AND column_name = 'updated_at';

-- Check trigger exists
SELECT trigger_name
FROM information_schema.triggers
WHERE event_object_table = 'chats';

-- Check index exists
SELECT indexname
FROM pg_indexes
WHERE tablename = 'chats' AND indexname = 'chats_updated_at_idx';
```

---

**Priority:** Medium (app works without it, but UX is better with it)

**Impact:** Low risk, backward compatible, non-breaking change

**Effort:** 2 minutes to apply
