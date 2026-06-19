-- Migration: Add push preferences to push_subscriptions table
ALTER TABLE push_subscriptions 
ADD COLUMN IF NOT EXISTS push_level text DEFAULT 'high_value' NOT NULL;
