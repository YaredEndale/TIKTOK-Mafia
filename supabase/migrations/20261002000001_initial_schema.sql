-- ============================================================
-- TikTok LIVE Mafia — Initial Database Schema
-- Migration: 20261002000001_initial_schema.sql
-- ============================================================

-- Enable pgcrypto for UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ------------------------------------------------------------
-- 1. MODERATORS TABLE
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.moderators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    role TEXT NOT NULL DEFAULT 'MODERATOR' CHECK (role IN ('MODERATOR', 'PRODUCER', 'ADMIN')),
    permissions JSONB NOT NULL DEFAULT '["all"]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------
-- 2. GAMES TABLE
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.games (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'LOBBY' CHECK (status IN ('LOBBY', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
    phase TEXT NOT NULL DEFAULT 'LOBBY' CHECK (phase IN (
        'LOBBY',
        'PLAYER_SELECTION',
        'ROLE_ASSIGNMENT',
        'NIGHT',
        'DAY',
        'DISCUSSION',
        'VOTING',
        'REVEAL',
        'ELIMINATION',
        'WIN_CHECK',
        'GAME_OVER'
    )),
    round INT NOT NULL DEFAULT 0,
    phase_started_at TIMESTAMPTZ,
    phase_ends_at TIMESTAMPTZ,
    configuration JSONB NOT NULL DEFAULT '{
        "timers": { "night": 90, "discussion": 180, "voting": 60 },
        "players": { "min": 5, "max": 12 },
        "voting": { "allowSelfVote": false, "tieRule": "NO_ELIMINATION", "lockOnSubmit": true },
        "roles": { "revealOnElimination": true, "mafiaCanSeeTeam": true, "doctorSelfProtect": true, "doctorSelfProtectCooldown": 3, "mafiaCanTargetMafia": false }
    }'::jsonb,
    winner TEXT CHECK (winner IN ('MAFIA', 'VILLAGE', NULL)),
    moderator_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    started_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_games_code ON public.games(code);
CREATE INDEX IF NOT EXISTS idx_games_status ON public.games(status);

-- ------------------------------------------------------------
-- 3. PLAYERS TABLE
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
    display_name TEXT NOT NULL,
    tiktok_username TEXT,
    avatar_url TEXT,
    role TEXT CHECK (role IN ('MAFIA', 'DETECTIVE', 'DOCTOR', 'CITIZEN', NULL)),
    status TEXT NOT NULL DEFAULT 'ALIVE' CHECK (status IN ('ALIVE', 'ELIMINATED', 'DISCONNECTED')),
    seat_number INT,
    eliminated_at TIMESTAMPTZ,
    eliminated_reason TEXT CHECK (eliminated_reason IN ('MAFIA_KILL', 'VOTE_EXECUTION', 'MODERATOR_REMOVAL', 'DISCONNECT', NULL)),
    joined_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_players_game_id ON public.players(game_id);
CREATE INDEX IF NOT EXISTS idx_players_status ON public.players(status);

-- ------------------------------------------------------------
-- 4. PLAYER SESSIONS TABLE
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.player_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    last_seen TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_player_sessions_player_id ON public.player_sessions(player_id);
CREATE INDEX IF NOT EXISTS idx_player_sessions_token_hash ON public.player_sessions(token_hash);

-- ------------------------------------------------------------
-- 5. VOTES TABLE
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
    round INT NOT NULL,
    voter_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
    target_id UUID REFERENCES public.players(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_votes_round_voter UNIQUE (game_id, round, voter_id)
);

CREATE INDEX IF NOT EXISTS idx_votes_game_round ON public.votes(game_id, round);

-- ------------------------------------------------------------
-- 6. NIGHT ACTIONS TABLE
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.night_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
    round INT NOT NULL,
    actor_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('MAFIA', 'DETECTIVE', 'DOCTOR')),
    target_id UUID REFERENCES public.players(id) ON DELETE SET NULL,
    action TEXT NOT NULL CHECK (action IN ('KILL', 'INVESTIGATE', 'PROTECT')),
    result JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_night_actions_round_actor UNIQUE (game_id, round, actor_id, action)
);

CREATE INDEX IF NOT EXISTS idx_night_actions_game_round ON public.night_actions(game_id, round);

-- ------------------------------------------------------------
-- 7. EVENTS TABLE
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    actor_id UUID REFERENCES public.players(id) ON DELETE SET NULL,
    target_id UUID REFERENCES public.players(id) ON DELETE SET NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    visibility TEXT NOT NULL DEFAULT 'PUBLIC' CHECK (visibility IN ('PUBLIC', 'MODERATOR_ONLY', 'TEAM_MAFIA', 'PLAYER_ONLY')),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_events_game_timestamp ON public.events(game_id, timestamp);

-- ------------------------------------------------------------
-- 8. CLIPS TABLE
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.clips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
    category TEXT NOT NULL CHECK (category IN (
        'BLUFF',
        'ACCUSATION',
        'BETRAYAL',
        'ELIMINATION',
        'SAVE',
        'PLOT_TWIST',
        'FUNNY',
        'OTHER'
    )),
    description TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_clips_game_timestamp ON public.clips(game_id, timestamp);

-- ------------------------------------------------------------
-- 9. PUBLIC SAFE PLAYERS VIEW (RULE 2: Zero role leak for alive players)
-- ------------------------------------------------------------
CREATE OR REPLACE VIEW public.public_players AS
SELECT
    p.id,
    p.game_id,
    p.display_name,
    p.tiktok_username,
    p.avatar_url,
    p.status,
    p.seat_number,
    CASE
        WHEN p.status = 'ELIMINATED' AND (g.configuration->'roles'->>'revealOnElimination')::boolean = true THEN p.role
        WHEN g.status = 'COMPLETED' THEN p.role
        ELSE NULL
    END AS role,
    p.eliminated_at,
    p.eliminated_reason,
    p.joined_at
FROM public.players p
JOIN public.games g ON p.game_id = g.id;

-- ------------------------------------------------------------
-- 10. ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------

-- Enable RLS on all tables
ALTER TABLE public.moderators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.night_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clips ENABLE ROW LEVEL SECURITY;

-- Helper function: is current authenticated user a moderator?
CREATE OR REPLACE FUNCTION public.is_moderator()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.moderators WHERE user_id = auth.uid()
    );
$$;

-- MODERATORS POLICIES
CREATE POLICY "Moderators can view moderator records"
    ON public.moderators FOR SELECT
    TO authenticated
    USING (public.is_moderator() OR user_id = auth.uid());

-- GAMES POLICIES
CREATE POLICY "Public can view games"
    ON public.games FOR SELECT
    TO public
    USING (true);

CREATE POLICY "Moderators can insert/update games"
    ON public.games FOR ALL
    TO authenticated
    USING (public.is_moderator())
    WITH CHECK (public.is_moderator());

-- PLAYERS POLICIES
CREATE POLICY "Public can view player info (non-sensitive)"
    ON public.players FOR SELECT
    TO public
    USING (true);

CREATE POLICY "Moderators can manage players"
    ON public.players FOR ALL
    TO authenticated
    USING (public.is_moderator())
    WITH CHECK (public.is_moderator());

-- PLAYER SESSIONS POLICIES (Access only via server service_role)
CREATE POLICY "Moderators can view player sessions"
    ON public.player_sessions FOR SELECT
    TO authenticated
    USING (public.is_moderator());

-- VOTES POLICIES
CREATE POLICY "Public can view votes"
    ON public.votes FOR SELECT
    TO public
    USING (true);

CREATE POLICY "Moderators can manage votes"
    ON public.votes FOR ALL
    TO authenticated
    USING (public.is_moderator())
    WITH CHECK (public.is_moderator());

-- NIGHT ACTIONS POLICIES (Strictly hidden from public)
CREATE POLICY "Moderators can view night actions"
    ON public.night_actions FOR SELECT
    TO authenticated
    USING (public.is_moderator());

CREATE POLICY "Moderators can manage night actions"
    ON public.night_actions FOR ALL
    TO authenticated
    USING (public.is_moderator())
    WITH CHECK (public.is_moderator());

-- EVENTS POLICIES
CREATE POLICY "Public can view public events"
    ON public.events FOR SELECT
    TO public
    USING (visibility = 'PUBLIC' OR (public.is_moderator()));

CREATE POLICY "Moderators can manage events"
    ON public.events FOR ALL
    TO authenticated
    USING (public.is_moderator())
    WITH CHECK (public.is_moderator());

-- CLIPS POLICIES
CREATE POLICY "Moderators can view and manage clips"
    ON public.clips FOR ALL
    TO authenticated
    USING (public.is_moderator())
    WITH CHECK (public.is_moderator());

-- ------------------------------------------------------------
-- 11. SUPABASE REALTIME CONFIGURATION
-- ------------------------------------------------------------
ALTER PUBLICATION supabase_realtime ADD TABLE public.games;
ALTER PUBLICATION supabase_realtime ADD TABLE public.events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.clips;
