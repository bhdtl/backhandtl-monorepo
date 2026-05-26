/*
  # Create user_fair_odds table

  ## Summary
  Stores user-submitted "fair odds" assessments for upcoming matches.
  Users set their own fair odds per player, and the system calculates
  the edge discrepancy between their assessment and the live market odds.

  ## New Tables

  ### `user_fair_odds`
  - `id` (uuid, primary key)
  - `user_id` (uuid, FK to auth.users) - owner of the assessment
  - `match_id` (text) - references market_odds.id
  - `player1_name` (text) - stored denormalized for display
  - `player2_name` (text) - stored denormalized for display
  - `tournament` (text)
  - `match_time` (timestamptz)
  - `user_fair_odds1` (numeric) - user's fair odds for player 1
  - `user_fair_odds2` (numeric) - user's fair odds for player 2
  - `notes` (text, nullable) - optional user notes
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)
  - UNIQUE constraint on (user_id, match_id)

  ## Security
  - RLS enabled
  - Users can only read/write their own rows
  - Separate policies for SELECT, INSERT, UPDATE, DELETE
*/

CREATE TABLE IF NOT EXISTS user_fair_odds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  match_id text NOT NULL,
  player1_name text NOT NULL DEFAULT '',
  player2_name text NOT NULL DEFAULT '',
  tournament text NOT NULL DEFAULT '',
  match_time timestamptz,
  user_fair_odds1 numeric(6,2),
  user_fair_odds2 numeric(6,2),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, match_id)
);

ALTER TABLE user_fair_odds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own fair odds"
  ON user_fair_odds FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own fair odds"
  ON user_fair_odds FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own fair odds"
  ON user_fair_odds FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own fair odds"
  ON user_fair_odds FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS user_fair_odds_user_id_idx ON user_fair_odds(user_id);
CREATE INDEX IF NOT EXISTS user_fair_odds_match_id_idx ON user_fair_odds(match_id);
