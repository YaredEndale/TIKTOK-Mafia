import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { authenticateRequest } from '@/lib/auth/auth-helper';

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

    let body: { reason?: string; winner?: 'MAFIA' | 'VILLAGE' | null } = {};
    try {
      body = await req.json();
    } catch {
      // Body optional
    }

    const { data: updatedGame, error } = await adminClient
      .from('games')
      .update({
        status: 'COMPLETED',
        phase: 'GAME_OVER',
        winner: body.winner ?? null,
        ended_at: new Date().toISOString(),
      })
      .eq('id', params.id)
      .select()
      .single();

    if (error || !updatedGame) {
      return NextResponse.json({ error: error?.message || 'Failed to end game' }, { status: 500 });
    }

    await adminClient.from('events').insert({
      game_id: updatedGame.id,
      type: 'GAME_ENDED',
      metadata: { reason: body.reason || 'Ended by moderator', winner: updatedGame.winner },
      visibility: 'PUBLIC',
    });

    return NextResponse.json({ success: true, game: updatedGame });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
