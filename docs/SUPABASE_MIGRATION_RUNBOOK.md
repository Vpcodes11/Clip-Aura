# Supabase Migration Runbook

> Apply the rollover_credits column to the production users table.

## Migration File

```
supabase/migrations/20260523000000_add_rollover_credits.sql
```

Contents:
```sql
ALTER TABLE users ADD COLUMN rollover_credits INTEGER DEFAULT 0;
```

---

## Step 1 — Apply Migration

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard).
2. Select project `tmvcemupolugzknwhszf`.
3. Left sidebar → **SQL Editor**.
4. Click **+ New query**.
5. Paste the migration SQL:
   ```sql
   ALTER TABLE users ADD COLUMN rollover_credits INTEGER DEFAULT 0;
   ```
6. Click **Run** (Ctrl+Enter).

---

## Step 2 — Verify

Run this query in the same SQL Editor to confirm the column exists:

```sql
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'users' AND column_name = 'rollover_credits';
```

Expected output:

| column_name | data_type | column_default |
|-------------|-----------|----------------|
| rollover_credits | integer | 0 |

---

## Step 3 — Verify Existing Users

Confirm all existing users have the default value:

```sql
SELECT id, email, rollover_credits FROM users;
```

Every row should show `rollover_credits = 0` unless credits have been assigned.

---

## What This Enables

- **Credit pack purchases**: `rollover_credits += 60` when a credit pack is bought.
- **Usage spending**: After monthly minutes are exhausted, `spend_usage_minutes()` deducts from `rollover_credits`.
- **Upload check**: Users with 0 monthly minutes but positive `rollover_credits` can still upload and render.
