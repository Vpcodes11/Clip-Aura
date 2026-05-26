-- Add rollover_credits to users table
ALTER TABLE users ADD COLUMN rollover_credits INTEGER DEFAULT 0;
