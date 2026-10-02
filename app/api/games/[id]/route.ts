import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { authenticateRequest } from '@/lib/auth/auth-helper';
import {
  asGame,
  asPlayer,
  extendPhaseTimer,
  Player,
  PlayerPrivateState,
  PublicGameState,
} from '@/lib/game-engine';
import { Json } from '@/types/database.types';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const adminClient = createAdminClient();
    const identifier = params.id;

    // Check if identifier is UUID or 6-char Game Code
    const isCode = identifier.length === 6 && !identifier.includes('-');
    const query = adminClient.from('games').select('*');

    const { data: rawGame, error: gameError } = isCode
      ? await query.eq('code', identifier.toUpperCase()).single()
      : await query.eq('id', identifier).single();

    if (gameError || !rawGame) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    const game = asGame(rawGame);
    const auth = await authenticateRequest(req, game.id);

    // 1. MODERATOR VIEW: Complete unredacted information
    if (auth.isModerator) {
      const { data: rawPlayers } = await adminClient
        .from('players')
        .select('*')
        .eq('game_id', game.id)
        .order('seat_number', { ascending: true, nullsFirst: false });

      const players = (rawPlayers || []).map(asPlayer);

      const { data: nightActions } = await adminClient
        .from('night_actions')
        .select('*')
        .eq('game_id', game.id)
        .eq('round', game.round);

      const { data: votes } = await adminClient
        .from('votes')
        .select('*')
        .eq('game_id', game.id)
        .eq('round', game.round);

      return NextResponse.json({
        view: 'MODERATOR',
        game,
        players,
        currentRoundNightActions: nightActions || [],
        currentRoundVotes: votes || [],
      });
    }

    // 2. PLAYER PRIVATE VIEW
    if (auth.playerId) {
      const { data: rawPlayer } = await adminClient
        .from('players')
        .select('*')
        .eq('id', auth.playerId)
        .single();

      if (rawPlayer) {
        const player = asPlayer(rawPlayer);

        // Fetch public list of alive players for voting/action targets
        const { data: alivePlayers } = await adminClient
          .from('players')
          .select('id, display_name, seat_number')
          .eq('game_id', game.id)
          .eq('status', 'ALIVE');

        // Check if player has already voted this round
        const { data: existingVote } = await adminClient
          .from('votes')
          .select('id')
          .eq('game_id', game.id)
          .eq('round', game.round)
          .eq('voter_id', player.id)
          .maybeSingle();

        // Check if player has already submitted night action this round
        const { data: existingAction } = await adminClient
          .from('night_actions')
          .select('id')
          .eq('game_id', game.id)
          .eq('round', game.round)
          .eq('actor_id', player.id)
          .maybeSingle();

        // Teammates for Mafia
        let teammates: { id: string; display_name: string }[] | undefined;
        if (player.role === 'MAFIA') {
          const { data: mafiaList } = await adminClient
            .from('players')
            .select('id, display_name')
            .eq('game_id', game.id)
            .eq('role', 'MAFIA')
            .neq('id', player.id);
          teammates = mafiaList || [];
        }

        // Investigation history for Detective
        let investigationHistory: { targetId: string; targetName: string; isMafia: boolean }[] | undefined;
        if (player.role === 'DETECTIVE') {
          const { data: pastInvestigations } = await adminClient
            .from('night_actions')
            .select('target_id, result, players!night_actions_target_id_fkey(display_name)')
            .eq('game_id', game.id)
            .eq('actor_id', player.id)
            .eq('action', 'INVESTIGATE');

          if (pastInvestigations) {
            investigationHistory = pastInvestigations
              .filter((inv) => inv.target_id && inv.result)
              .map((inv) => ({
                targetId: inv.target_id!,
                targetName: (inv.players as unknown as { display_name: string })?.display_name || 'Target',
                isMafia: Boolean((inv.result as { isMafia?: boolean })?.isMafia),
              }));
          }
        }

        const playerState: PlayerPrivateState = {
          gameId: game.id,
          playerId: player.id,
          displayName: player.display_name,
          role: player.role,
          status: player.status,
          phase: game.phase,
          round: game.round,
          phaseStartedAt: game.phase_started_at,
          phaseEndsAt: game.phase_ends_at,
          alivePlayers: (alivePlayers || []).map((p) => ({
            id: p.id,
            display_name: p.display_name,
            seat_number: p.seat_number,
          })),
          teammates,
          investigationHistory,
          canAct: player.status === 'ALIVE' && (game.phase === 'NIGHT' || game.phase === 'VOTING'),
          hasActed: Boolean(existingAction),
          hasVoted: Boolean(existingVote),
        };

        return NextResponse.json({
          view: 'PLAYER',
          game: {
            id: game.id,
            code: game.code,
            status: game.status,
            phase: game.phase,
            round: game.round,
            phaseStartedAt: game.phase_started_at,
            phaseEndsAt: game.phase_ends_at,
            winner: game.winner,
          },
          player: playerState,
        });
      }
    }

    // 3. PUBLIC / OVERLAY VIEW (Rule 2: Zero role leak for alive players)
    const { data: publicPlayers } = await adminClient
      .from('public_players')
      .select('*')
      .eq('game_id', game.id)
      .order('seat_number', { ascending: true, nullsFirst: false });

    const publicState: PublicGameState = {
      gameId: game.id,
      code: game.code,
      status: game.status,
      phase: game.phase,
      round: game.round,
      phaseStartedAt: game.phase_started_at,
      phaseEndsAt: game.phase_ends_at,
      winner: game.winner,
      players: (publicPlayers || []).map((p) => ({
        id: p.id!,
        display_name: p.display_name!,
        tiktok_username: p.tiktok_username,
        avatar_url: p.avatar_url,
        status: p.status as Player['status'],
        seat_number: p.seat_number,
        role: p.role as Player['role'], // Null if alive, revealed if eliminated
        eliminated_reason: p.eliminated_reason as Player['eliminated_reason'],
      })),
      announcements: [],
    };

    return NextResponse.json({
      view: 'PUBLIC',
      game: publicState,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const adminClient = createAdminClient();
    const auth = await authenticateRequest(req, params.id);

    if (!auth.isModerator) {
      return NextResponse.json({ error: 'Unauthorized. Moderator access required.' }, { status: 403 });
    }

    const body = await req.json();
    const { action, additionalSeconds, configuration } = body;

    const { data: rawGame, error: fetchError } = await adminClient
      .from('games')
      .select('*')
      .eq('id', params.id)
      .single();

    if (fetchError || !rawGame) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    const game = asGame(rawGame);
    const updates: { phase_ends_at?: string; configuration?: Json } = {};

    // Timer Extension
    if (action === 'EXTEND_TIMER' && typeof additionalSeconds === 'number') {
      const newEndsAt = extendPhaseTimer(game.phase_ends_at, additionalSeconds);
      updates.phase_ends_at = newEndsAt;

      await adminClient.from('events').insert({
        game_id: game.id,
        type: 'MODERATOR_OVERRIDE',
        metadata: {
          action: 'EXTEND_TIMER',
          addedSeconds: additionalSeconds,
          newEndsAt,
        },
        visibility: 'PUBLIC',
      });
    }

    // Config Update
    if (configuration && typeof configuration === 'object') {
      updates.configuration = {
        ...(game.configuration as unknown as Record<string, unknown>),
        ...configuration,
      } as unknown as Json;
    }


    const { data: updatedRawGame, error: updateError } = await adminClient
      .from('games')
      .update(updates)
      .eq('id', game.id)
      .select()
      .single();

    if (updateError || !updatedRawGame) {
      return NextResponse.json({ error: updateError?.message || 'Update failed' }, { status: 500 });
    }

    return NextResponse.json({ success: true, game: asGame(updatedRawGame) });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
