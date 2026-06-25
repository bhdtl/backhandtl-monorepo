-- =============================================================
-- INJURY INTEL BOT — Supabase Setup
-- Führe dies im Supabase Dashboard → SQL Editor aus
-- =============================================================

-- 1. Erweitere die player_injury_intel Tabelle (falls sie schon existiert)
-- Falls nicht, erstelle sie komplett:
CREATE TABLE IF NOT EXISTS player_injury_intel (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tweet_id TEXT UNIQUE NOT NULL,
  tweet_text TEXT NOT NULL,
  tweet_author TEXT,
  tweet_url TEXT,
  tweet_date TIMESTAMPTZ,
  likes INTEGER DEFAULT 0,
  retweets INTEGER DEFAULT 0,
  is_tennis_related BOOLEAN DEFAULT false,
  is_injury_news BOOLEAN DEFAULT false,
  credibility INTEGER DEFAULT 0,
  player_name TEXT,
  injury_type TEXT,
  severity TEXT DEFAULT 'unknown',
  summary_kurz TEXT,
  is_mto BOOLEAN DEFAULT false,
  reasoning TEXT,
  source TEXT DEFAULT 'twitter',
  analyzed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_injury_tweet_id ON player_injury_intel(tweet_id);
CREATE INDEX IF NOT EXISTS idx_injury_date ON player_injury_intel(tweet_date DESC);
CREATE INDEX IF NOT EXISTS idx_injury_credibility ON player_injury_intel(credibility DESC);

-- RLS
ALTER TABLE player_injury_intel ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read injury intel" ON player_injury_intel;
DROP POLICY IF EXISTS "Service write injury intel" ON player_injury_intel;
CREATE POLICY "Public read injury intel" ON player_injury_intel FOR SELECT USING (true);
CREATE POLICY "Service write injury intel" ON player_injury_intel FOR INSERT WITH CHECK (auth.role() = 'service_role');


-- 2. Bot-State Tabelle (speichert letzten Run + Intervall)
CREATE TABLE IF NOT EXISTS injury_bot_state (
  id INTEGER PRIMARY KEY DEFAULT 1,
  last_run_at TIMESTAMPTZ DEFAULT now(),
  next_run_after INTERVAL DEFAULT '30 minutes',
  total_runs INTEGER DEFAULT 0,
  last_run_status TEXT DEFAULT 'pending',
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Initialisiere den State (nur einmal)
INSERT INTO injury_bot_state (id, last_run_at, next_run_after, total_runs, last_run_status)
VALUES (1, now(), '30 minutes', 0, 'idle')
ON CONFLICT (id) DO NOTHING;

-- RLS für bot_state
ALTER TABLE injury_bot_state ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service manage bot state" ON injury_bot_state;
CREATE POLICY "Service manage bot state" ON injury_bot_state FOR ALL USING (auth.role() = 'service_role');


-- 3. Funktion: Prüfe ob Bot getriggert werden soll
CREATE OR REPLACE FUNCTION trigger_injury_bot()
RETURNS void AS $$
DECLARE
  current_state RECORD;
  should_trigger BOOLEAN := FALSE;
  jitter_minutes INTEGER;
BEGIN
  -- Aktuellen State holen
  SELECT * INTO current_state FROM injury_bot_state WHERE id = 1;
  
  -- Wenn noch nie gelaufen: sofort triggern
  IF current_state.last_run_at IS NULL THEN
    should_trigger := TRUE;
  ELSE
    -- Prüfe ob das randomisierte Intervall vergangen ist
    IF now() >= current_state.last_run_at + current_state.next_run_after THEN
      should_trigger := TRUE;
    END IF;
  END IF;
  
  IF should_trigger THEN
    -- Randomisierte Intervall für nächsten Run: 22-55 Minuten
    jitter_minutes := 22 + floor(random() * 34)::INTEGER; -- 22 bis 55
    
    -- GitHub Actions Workflow triggern
    PERFORM net.http_post(
      url := 'https://api.github.com/repos/bhdtl/backhandtl-monorepo/dispatches',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.settings.github_token', true),
        'Accept', 'application/vnd.github+json',
        'X-GitHub-Api-Version', '2022-11-28',
        'User-Agent', 'Supabase-pg_net'
      ),
      body := jsonb_build_object(
        'event_type', 'trigger-injury-bot',
        'client_payload', jsonb_build_object(
          'triggered_at', now()::text,
          'jitter_minutes', jitter_minutes
        )
      )
    );
    
    -- State aktualisieren
    UPDATE injury_bot_state SET
      last_run_at = now(),
      next_run_after = (jitter_minutes || ' minutes')::INTERVAL,
      total_runs = total_runs + 1,
      last_run_status = 'triggered',
      updated_at = now()
    WHERE id = 1;
    
    RAISE NOTICE 'Injury Bot triggered! Next run in % minutes', jitter_minutes;
  ELSE
    RAISE NOTICE 'Injury Bot: not yet time. Next run in %', 
      (current_state.last_run_at + current_state.next_run_after - now());
  END IF;
END;
$$ LANGUAGE plpgsql;


-- 4. pg_cron Job: Prüft alle 2 Minuten ob Bot getriggert werden soll
-- (Die eigentliche Randomisierung liegt in der Funktion)
SELECT cron.unschedule('injury-bot-check') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'injury-bot-check'
);

SELECT cron.schedule(
  'injury-bot-check',
  '*/2 * * * *',  -- Alle 2 Minuten prüfen
  $$
    SELECT trigger_injury_bot();
  $$
);


-- 5. Status-View fürs Frontend (optional)
CREATE OR REPLACE VIEW injury_bot_status AS
SELECT 
  last_run_at,
  next_run_after,
  total_runs,
  last_run_status,
  (last_run_at + next_run_after) AS next_scheduled_run,
  CASE 
    WHEN now() >= last_run_at + next_run_after THEN 'ready'
    ELSE 'waiting'
  END AS status
FROM injury_bot_state 
WHERE id = 1;