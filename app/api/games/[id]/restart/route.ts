import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { authenticateRequest } from '@/lib/auth/auth-helper';
import { broadcastPhaseChange } from '@/lib/realtime/broadcaster';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const adminClient = createAdminClient();
    const gameId = params.id;
    const auth = await authenticateRequest(req, gameId);

    if (!auth.isModerator) {
      return NextResponse.json({ error: 'Unauthorized. Moderator access required.' }, { status: 403 });
    }

    // 1. Fetch current game
    const { data: game, error: gameError } = await adminClient
      .from('games')
      .select('*')
      .eq('id', gameId)
      .single();

    if (gameError || !game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    // 2. Revive all existing players and clear roles
    const { error: playersUpdateError } = await adminClient
      .from('players')
      .update({
        status: 'ALIVE',
        role: null,
        eliminated_at: null,
        eliminated_reason: null,
      })
      .eq('game_id', game.id);

    if (playersUpdateError) {
      return NextResponse.json({ error: `Failed to reset players: ${playersUpdateError.message}` }, { status: 500 });
    }

    // 3. Clear votes and night actions from previous match
    await Promise.all([
      adminClient.from('votes').delete().eq('game_id', game.id),
      adminClient.from('night_actions').delete().eq('game_id', game.id),
    ]);

    // 4. Reset game state back to LOBBY
    const { data: updatedGame, error: updateError } = await adminClient
      .from('games')
      .update({
        status: 'WAITING',
        phase: 'LOBBY',
        round: 0,
        winner: null,
        started_at: null,
        ended_at: null,
        phase_started_at: null,
        phase_ends_at: null,
      })
      .eq('id', game.id)
      .select()
      .single();

    if (updateError || !updatedGame) {
      return NextResponse.json({ error: updateError?.message || 'Failed to restart game' }, { status: 500 });
    }

    // 5. Broadcast LOBBY phase change to all clients (players, overlay, moderator)
    await broadcastPhaseChange(game.id, {
      phase: 'LOBBY',
      round: 0,
      phaseStartedAt: null,
      phaseEndsAt: null,
      durationSeconds: null,
    });

    // 6. Log event
    await adminClient.from('events').insert({
      game_id: game.id,
      type: 'GAME_RESTARTED',
      metadata: { message: 'Moderator restarted game with existing players' },
      visibility: 'PUBLIC',
    });

    return NextResponse.json({ success: true, game: updatedGame });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
