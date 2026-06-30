-- Drop scout_rules and scout_reports tables as the AI Scout Agent is completely removed
DROP TABLE IF EXISTS public.scout_rules CASCADE;
DROP TABLE IF EXISTS public.scout_reports CASCADE;
