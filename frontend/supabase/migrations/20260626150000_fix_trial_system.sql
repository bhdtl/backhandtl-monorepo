/*
  # Fix Free Trial System

  Stellt sicher dass alle nötigen Felder für das Trial-System existieren
  und setzt has_used_trial für User die bereits eine aktive/alte Subscription hatten.
*/

-- has_used_trial Spalte sicherstellen (falls noch nicht vorhanden)
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS has_used_trial boolean DEFAULT false NOT NULL;

-- is_premium Spalte sicherstellen
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS is_premium boolean DEFAULT false NOT NULL;

-- Backfill: User die bereits einen bezahlten Tier haben, markieren als trial-verbraucht
-- (verhindert dass Bestandskunden erneut Trial bekommen)
UPDATE profiles
SET has_used_trial = true
WHERE tier IN ('ELITE', 'PREMIUM', 'WEEKEND')
  AND has_used_trial = false;

-- Backfill: is_premium für aktive User setzen
UPDATE profiles
SET is_premium = true
WHERE tier IN ('ELITE', 'PREMIUM', 'WEEKEND')
  AND (premium_until IS NULL OR premium_until > now());

-- Index für schnelle Trial-Checks
CREATE INDEX IF NOT EXISTS idx_profiles_has_used_trial ON profiles(has_used_trial);
CREATE INDEX IF NOT EXISTS idx_profiles_tier ON profiles(tier);
