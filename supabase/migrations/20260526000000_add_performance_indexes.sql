-- Add performance-critical indexes for production workloads.
-- Run: supabase db push OR psql -f supabase/migrations/20260526000000_add_performance_indexes.sql

-- jobs.user_id: most-queried foreign key, used in every job listing and status check
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_jobs_user_id ON jobs(user_id);

-- jobs.created_at: used for ordering by recent jobs on dashboard
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_jobs_created_at ON jobs(created_at);

-- jobs.status: used for filtering active/completed/error jobs
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_jobs_status ON jobs(status);

-- users.stripe_customer_id: used for Stripe webhook customer lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_stripe_customer_id ON users(stripe_customer_id);
