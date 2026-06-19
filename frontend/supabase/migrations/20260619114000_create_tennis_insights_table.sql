-- Migration to create tennis_insights table for storing AI scraped news, tweets, and interviews
CREATE TABLE IF NOT EXISTS public.tennis_insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID REFERENCES public.players(id) ON DELETE SET NULL,
    source_type TEXT NOT NULL, -- 'twitter', 'news', 'interview'
    source_name TEXT NOT NULL, -- e.g. '@edgeai', 'Tennis.com'
    url TEXT,
    headline TEXT NOT NULL,
    summary TEXT NOT NULL,
    key_takeaways TEXT[] NOT NULL,
    sentiment TEXT DEFAULT 'neutral' NOT NULL, -- 'positive', 'neutral', 'negative', 'critical_injury'
    published_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.tennis_insights ENABLE ROW LEVEL SECURITY;

-- Select policy to allow all authenticated users to read insights
DROP POLICY IF EXISTS "Allow select for authenticated users" ON public.tennis_insights;
CREATE POLICY "Allow select for authenticated users" ON public.tennis_insights
    FOR SELECT TO authenticated USING (true);

-- Policy to allow admins to perform all operations (insert, update, delete)
DROP POLICY IF EXISTS "Allow all for admin users" ON public.tennis_insights;
CREATE POLICY "Allow all for admin users" ON public.tennis_insights
    FOR ALL TO authenticated USING (auth.jwt() ->> 'email' = 'bh.dtl@web.de');

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_tennis_insights_player_id ON public.tennis_insights(player_id);
CREATE INDEX IF NOT EXISTS idx_tennis_insights_created_at ON public.tennis_insights(created_at DESC);
