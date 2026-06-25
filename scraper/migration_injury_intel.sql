-- Injury Intel Table for Twitter-based injury news tracking
CREATE TABLE IF NOT EXISTS player_injury_intel (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Tweet data
  tweet_id TEXT UNIQUE NOT NULL,
  tweet_text TEXT NOT NULL,
  tweet_author TEXT,
  tweet_url TEXT,
  tweet_date TIMESTAMPTZ,
  likes INTEGER DEFAULT 0,
  retweets INTEGER DEFAULT 0,
  
  -- GPT Analysis
  is_tennis_related BOOLEAN DEFAULT false,
  is_injury_news BOOLEAN DEFAULT false,
  credibility INTEGER DEFAULT 0 CHECK (credibility >= 0 AND credibility <= 100),
  player_name TEXT,
  player_id UUID REFERENCES players(id) ON DELETE SET NULL,
  injury_type TEXT CHECK (injury_type IN ('withdrawal', 'injury', 'medical', 'recovery', 'rumor', NULL)),
  severity TEXT DEFAULT 'unknown' CHECK (severity IN ('minor', 'moderate', 'severe', 'unknown')),
  summary_kurz TEXT,
  is_mto BOOLEAN DEFAULT false,
  reasoning TEXT,
  
  -- Meta
  source TEXT DEFAULT 'twitter',
  analyzed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_injury_tweet_id ON player_injury_intel(tweet_id);
CREATE INDEX IF NOT EXISTS idx_injury_player ON player_injury_intel(player_name);
CREATE INDEX IF NOT EXISTS idx_injury_date ON player_injury_intel(tweet_date DESC);
CREATE INDEX IF NOT EXISTS idx_injury_credibility ON player_injury_intel(credibility DESC);
CREATE INDEX IF NOT EXISTS idx_injury_tennis ON player_injury_intel(is_tennis_related) WHERE is_tennis_related = true;
CREATE INDEX IF NOT EXISTS idx_injury_news ON player_injury_intel(is_injury_news) WHERE is_injury_news = true;

-- RLS: Admin only write, public read
ALTER TABLE player_injury_intel ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read injury intel" ON player_injury_intel
  FOR SELECT USING (true);

CREATE POLICY "Service role can insert injury intel" ON player_injury_intel
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Admin can update injury intel" ON player_injury_intel
  FOR UPDATE USING (auth.role() = 'service_role');