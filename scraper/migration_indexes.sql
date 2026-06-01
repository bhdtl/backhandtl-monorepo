-- ====================================================================
-- MIGRATION: B-TREE INDEXES FOR PERFORMANCE OPTIMIZATION
-- NEURAL SCOUT DATABASE LAYER
-- ====================================================================

-- 1. Optimierungen für die Tabelle 'market_odds' (Scout & Scanner)
CREATE INDEX IF NOT EXISTS idx_market_odds_api_key 
ON market_odds (api_match_key);

CREATE INDEX IF NOT EXISTS idx_market_odds_winner_null 
ON market_odds (actual_winner_name) 
WHERE actual_winner_name IS NULL;

CREATE INDEX IF NOT EXISTS idx_market_odds_created_at_desc 
ON market_odds (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_market_odds_match_time_asc 
ON market_odds (match_time ASC);

CREATE INDEX IF NOT EXISTS idx_market_odds_visibility 
ON market_odds (is_visible_in_scanner) 
WHERE is_visible_in_scanner = true;

-- 2. Optimierungen für die Tabelle 'historical_matches' (Sackmann Engine & ELO)
CREATE INDEX IF NOT EXISTS idx_hist_matches_date_desc 
ON historical_matches (match_date DESC);

CREATE INDEX IF NOT EXISTS idx_hist_matches_tour 
ON historical_matches (tour);

CREATE INDEX IF NOT EXISTS idx_hist_matches_winner_id 
ON historical_matches (winner_sackmann_id);

CREATE INDEX IF NOT EXISTS idx_hist_matches_loser_id 
ON historical_matches (loser_sackmann_id);

-- 3. Optimierungen für die Tabellen 'player_skills' & 'scouting_reports'
CREATE INDEX IF NOT EXISTS idx_player_skills_pid 
ON player_skills (player_id);

CREATE INDEX IF NOT EXISTS idx_scouting_reports_pid 
ON scouting_reports (player_id);

-- 4. Optimierungen für die Tabelle 'players'
CREATE INDEX IF NOT EXISTS idx_players_sackmann 
ON players (sackmann_id) 
WHERE sackmann_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_players_last_name 
ON players (last_name ASC);

-- 5. Optimierungen für die Tabelle 'odds_history'
CREATE INDEX IF NOT EXISTS idx_odds_history_match_id 
ON odds_history (match_id);
