/*
  # Create used_trials table for the Trial Guillotine system
  
  Diese Tabelle verhindert, dass User mit neuen Accounts oder anderen
  E-Mail-Adressen erneut ein Free Trial starten können.
  
  Der Webhook prüft Email + ls_customer_id gegen diese Tabelle.
  Bei Match → Subscription wird sofort via Lemon Squeezy API terminiert.
*/

CREATE TABLE IF NOT EXISTS public.used_trials (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  value      text NOT NULL UNIQUE,  -- Email-Adresse oder ls_customer_id
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Index für schnelle Lookups (der Webhook macht .in()-Queries)
CREATE INDEX IF NOT EXISTS idx_used_trials_value ON public.used_trials(value);

-- RLS aktivieren (Edge Function nutzt Service Role — kein RLS-Problem)
ALTER TABLE public.used_trials ENABLE ROW LEVEL SECURITY;

-- Nur Service Role darf lesen/schreiben (Frontend hat keinen Zugriff)
CREATE POLICY "service_role_only" ON public.used_trials
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Backfill: Alle User die bereits einen Trial hatten in die Tabelle eintragen
-- (Email + ls_customer_id, falls vorhanden)
INSERT INTO public.used_trials (value)
SELECT DISTINCT lower(trim(u.email))
FROM auth.users u
JOIN public.profiles p ON p.id = u.id
WHERE p.has_used_trial = true
  AND u.email IS NOT NULL
  AND u.email != ''
ON CONFLICT (value) DO NOTHING;
