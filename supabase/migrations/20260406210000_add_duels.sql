-- Duels table
CREATE TABLE IF NOT EXISTS public.duels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenger_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  opponent_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  challenger_attack_id text,
  opponent_attack_id text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'active', 'resolved', 'cancelled')),
  winner_id uuid REFERENCES public.profiles(id),
  rounds jsonb DEFAULT '[]'::jsonb,
  challenger_hp integer NOT NULL DEFAULT 100,
  opponent_hp integer NOT NULL DEFAULT 100,
  loser_xp_bonus integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

-- RLS
ALTER TABLE public.duels ENABLE ROW LEVEL SECURITY;

-- Players can see their own duels
DO $$ BEGIN
  CREATE POLICY "duels_select" ON public.duels
    FOR SELECT USING (
      auth.uid() = challenger_id OR auth.uid() = opponent_id
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Only challenger can create
DO $$ BEGIN
  CREATE POLICY "duels_insert" ON public.duels
    FOR INSERT WITH CHECK (auth.uid() = challenger_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Both players can update (to submit attack, accept, resolve)
DO $$ BEGIN
  CREATE POLICY "duels_update" ON public.duels
    FOR UPDATE USING (
      auth.uid() = challenger_id OR auth.uid() = opponent_id
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Index for efficient queries
CREATE INDEX IF NOT EXISTS duels_challenger_idx ON public.duels(challenger_id);
CREATE INDEX IF NOT EXISTS duels_opponent_idx ON public.duels(opponent_id);
CREATE INDEX IF NOT EXISTS duels_status_idx ON public.duels(status);
CREATE INDEX IF NOT EXISTS duels_created_at_idx ON public.duels(created_at);
