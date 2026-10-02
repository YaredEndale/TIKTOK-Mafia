import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { authenticateRequest } from '@/lib/auth/auth-helper';
import { checkWinCondition } from '@/lib/game-engine';

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

    const body = await req.json();
    const { playerId, reason } = body;

    if (!playerId) {
      return NextResponse.json({ error: 'playerId is required' }, { status: 400 });
    }

    const { data: player, error: fetchError } = await adminClient
      .from('players')
      .select('*')
      .eq('id', playerId)
      .eq('game_id', gameId)
      .single();

    if (fetchError || !player) {
      return NextResponse.json({ error: 'Player not found in this game' }, { status: 404 });
    }

    const eliminationReason = reason || 'MODERATOR_REMOVAL';

    // 1. Mark eliminated
    const { data: updatedPlayer, error: updateError } = await adminClient
      .from('players')
      .update({
        status: 'ELIMINATED',
        eliminated_at: new Date().toISOString(),
        eliminated_reason: eliminationReason,
      })
      .eq('id', playerId)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // 2. Rule 5: Log Moderator Override event
    await adminClient.from('events').insert([
      {
        game_id: gameId,
        type: 'MODERATOR_OVERRIDE',
        actor_id: playerId,
        metadata: { action: 'MANUAL_ELIMINATION', reason: eliminationReason },
        visibility: 'PUBLIC',
      },
      {
        game_id: gameId,
        type: 'PLAYER_ELIMINATED',
        actor_id: playerId,
        metadata: { reason: eliminationReason },
        visibility: 'PUBLIC',
      },
      {
        game_id: gameId,
        type: 'ROLE_REVEALED',
        actor_id: playerId,
        metadata: { role: player.role },
        visibility: 'PUBLIC',
      },
    ]);

    // 3. Check Win Condition
    const { data: allPlayers } = await adminClient
      .from('players')
      .select('id, role, status')
      .eq('game_id', gameId);

    const winCheck = checkWinCondition(
      (allPlayers || []).map((p) => ({
        id: p.id,
        role: p.role as 'MAFIA' | 'DETECTIVE' | 'DOCTOR' | 'CITIZEN' | null,
        status: p.status as 'ALIVE' | 'ELIMINATED' | 'DISCONNECTED',
      }))
    );

    if (winCheck.isGameOver) {
      await adminClient
        .from('games')
        .update({
          status: 'COMPLETED',
          phase: 'GAME_OVER',
          winner: winCheck.winner,
          ended_at: new Date().toISOString(),
        })
        .eq('id', gameId);

      await adminClient.from('events').insert({
        game_id: gameId,
        type: 'WIN_CONDITION_REACHED',
        metadata: { winner: winCheck.winner, reason: winCheck.reason },
        visibility: 'PUBLIC',
      });
    }

    return NextResponse.json({ success: true, player: updatedPlayer, winCheck });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
