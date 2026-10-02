import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { authenticateRequest } from '@/lib/auth/auth-helper';
import { assignRoles, calculatePhaseTimers, asGameConfiguration } from '@/lib/game-engine';
import { broadcastPhaseChange, broadcastPrivateRole } from '@/lib/realtime';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const adminClient = createAdminClient();
    const auth = await authenticateRequest(req, params.id);

    if (!auth.isModerator) {
      return NextResponse.json({ error: 'Unauthorized. Moderator access required.' }, { status: 403 });
    }

    const { data: game, error: gameError } = await adminClient
      .from('games')
      .select('*')
      .eq('id', params.id)
      .single();

    if (gameError || !game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    if (game.status === 'IN_PROGRESS') {
      return NextResponse.json({ error: 'Game is already in progress' }, { status: 400 });
    }

    // Fetch players in game
    const { data: players, error: playersError } = await adminClient
      .from('players')
      .select('*')
      .eq('game_id', game.id)
      .eq('status', 'ALIVE');

    if (playersError || !players || players.length < 5 || players.length > 12) {
      return NextResponse.json(
        { error: `Cannot start game. Player count must be between 5 and 12 (currently ${players?.length || 0}).` },
        { status: 400 }
      );
    }

    // 1. Assign Roles cryptographically
    const playerIds = players.map((p) => p.id);
    const roleMap = assignRoles(playerIds);

    // 2. Update players with roles and seat numbers in DB
    const updates = players.map((p, idx) =>
      adminClient
        .from('players')
        .update({
          role: roleMap[p.id],
          seat_number: p.seat_number ?? idx + 1,
        })
        .eq('id', p.id)
    );
    await Promise.all(updates);

    // 3. Compute Night 1 Timer
    const timers = calculatePhaseTimers('NIGHT', asGameConfiguration(game.configuration));

    // 4. Update Game to IN_PROGRESS & NIGHT 1
    const { data: updatedGame, error: updateError } = await adminClient
      .from('games')
      .update({
        status: 'IN_PROGRESS',
        phase: 'NIGHT',
        round: 1,
        started_at: new Date().toISOString(),
        phase_started_at: timers.phaseStartedAt,
        phase_ends_at: timers.phaseEndsAt,
      })
      .eq('id', game.id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // 5. Emit Events
    await adminClient.from('events').insert([
      {
        game_id: game.id,
        type: 'ROLES_ASSIGNED',
        metadata: { playerCount: players.length },
        visibility: 'MODERATOR_ONLY',
      },
      {
        game_id: game.id,
        type: 'NIGHT_STARTED',
        metadata: { round: 1, durationSeconds: timers.durationSeconds },
        visibility: 'PUBLIC',
      },
    ]);

    // 6. Broadcast Realtime WebSocket Updates
    broadcastPhaseChange(game.id, {
      phase: 'NIGHT',
      round: 1,
      phaseStartedAt: timers.phaseStartedAt,
      phaseEndsAt: timers.phaseEndsAt,
      durationSeconds: timers.durationSeconds,
    }).then();

    // Broadcast private roles to player sessions
    adminClient
      .from('player_sessions')
      .select('id, player_id')
      .in('player_id', playerIds)
      .then(({ data: sessions }) => {
        if (sessions) {
          const mafiaPlayers = players
            .filter((p) => roleMap[p.id] === 'MAFIA')
            .map((p) => ({ id: p.id, display_name: p.display_name }));

          sessions.forEach((s) => {
            const role = roleMap[s.player_id];
            const teammates = role === 'MAFIA' ? mafiaPlayers.filter((m) => m.id !== s.player_id) : undefined;
            broadcastPrivateRole(s.id, { role, teammates }).then();
          });
        }
      });

    return NextResponse.json({ success: true, game: updatedGame });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
