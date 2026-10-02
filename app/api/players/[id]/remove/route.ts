import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { authenticateRequest } from '@/lib/auth/auth-helper';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const adminClient = createAdminClient();
    const playerId = params.id;

    const { data: player, error: fetchError } = await adminClient
      .from('players')
      .select('*')
      .eq('id', playerId)
      .single();

    if (fetchError || !player) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 });
    }

    const auth = await authenticateRequest(req, player.game_id);
    if (!auth.isModerator) {
      return NextResponse.json({ error: 'Unauthorized. Moderator access required.' }, { status: 403 });
    }

    const { data: game } = await adminClient
      .from('games')
      .select('phase')
      .eq('id', player.game_id)
      .single();

    if (game?.phase === 'LOBBY' || game?.phase === 'PLAYER_SELECTION') {
      // In lobby, completely delete the player record
      await adminClient.from('players').delete().eq('id', playerId);
    } else {
      // If game is in progress, mark player as ELIMINATED / MODERATOR_REMOVAL
      await adminClient
        .from('players')
        .update({
          status: 'ELIMINATED',
          eliminated_at: new Date().toISOString(),
          eliminated_reason: 'MODERATOR_REMOVAL',
        })
        .eq('id', playerId);
    }

    await adminClient.from('events').insert({
      game_id: player.game_id,
      type: 'PLAYER_REMOVED',
      actor_id: playerId,
      metadata: { displayName: player.display_name },
      visibility: 'PUBLIC',
    });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
