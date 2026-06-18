-- Create scout_rules table for the AI Scout Agent
CREATE TABLE IF NOT EXISTS public.scout_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_type TEXT NOT NULL CHECK (rule_type IN ('veto', 'multiplier', 'odds_filter')),
    description TEXT NOT NULL,
    conditions JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    confidence FLOAT DEFAULT 0.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.scout_rules ENABLE ROW LEVEL SECURITY;

-- Policy to allow authenticated users to view rules
CREATE POLICY "Allow select for authenticated users" ON public.scout_rules
    FOR SELECT TO authenticated USING (true);

-- Policy to allow admins to perform all operations (insert, update, delete)
CREATE POLICY "Allow all for admin users" ON public.scout_rules
    FOR ALL TO authenticated USING (auth.jwt() ->> 'email' = 'bh.dtl@web.de');
