
-- Singleton app state
CREATE TABLE public.app_state (
  id boolean PRIMARY KEY DEFAULT true CHECK (id = true),
  red_score integer NOT NULL DEFAULT 0,
  white_score integer NOT NULL DEFAULT 0,
  announcement text NOT NULL DEFAULT 'Welcome to the House Point Standings dashboard! Keep an eye out here for live updates.',
  active_banner jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.app_state TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_state TO authenticated;
GRANT ALL ON public.app_state TO service_role;
ALTER TABLE public.app_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read app state" ON public.app_state FOR SELECT USING (true);
CREATE POLICY "Council can update app state" ON public.app_state FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Council can insert app state" ON public.app_state FOR INSERT TO authenticated WITH CHECK (true);

INSERT INTO public.app_state (id) VALUES (true) ON CONFLICT DO NOTHING;

-- History log
CREATE TABLE public.history_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  house text NOT NULL CHECK (house IN ('Red','White')),
  delta integer NOT NULL,
  reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.history_entries TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.history_entries TO authenticated;
GRANT ALL ON public.history_entries TO service_role;
ALTER TABLE public.history_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read history" ON public.history_entries FOR SELECT USING (true);
CREATE POLICY "Council can insert history" ON public.history_entries FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Council can delete history" ON public.history_entries FOR DELETE TO authenticated USING (true);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.app_state;
ALTER PUBLICATION supabase_realtime ADD TABLE public.history_entries;
ALTER TABLE public.app_state REPLICA IDENTITY FULL;
ALTER TABLE public.history_entries REPLICA IDENTITY FULL;
