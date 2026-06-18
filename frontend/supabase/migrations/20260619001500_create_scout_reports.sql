-- Migration to create scout_reports table for storing daily AI report summaries
CREATE TABLE IF NOT EXISTS public.scout_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_date DATE NOT NULL UNIQUE,
    summary TEXT NOT NULL,
    metrics JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.scout_reports ENABLE ROW LEVEL SECURITY;

-- Policy to allow authenticated users to view reports
CREATE POLICY "Allow select for authenticated users" ON public.scout_reports
    FOR SELECT TO authenticated USING (true);

-- Policy to allow admins to perform all operations (insert, update, delete)
CREATE POLICY "Allow all for admin users" ON public.scout_reports
    FOR ALL TO authenticated USING (auth.jwt() ->> 'email' = 'bh.dtl@web.de');
