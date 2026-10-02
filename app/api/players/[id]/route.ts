import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { authenticateRequest } from '@/lib/auth/auth-helper';

export async function PATCH(
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

    // Only player themselves or moderator can update player details
    const isSelf = auth.playerId === playerId;
    if (!isSelf && !auth.isModerator) {
      return NextResponse.json({ error: 'Unauthorized to update player' }, { status: 403 });
    }

    const body = await req.json();
    const updates: { display_name?: string; tiktok_username?: string | null; seat_number?: number | null } = {};

    if (body.display_name && typeof body.display_name === 'string') {
      updates.display_name = body.display_name.trim();
    }
    if (body.tiktok_username !== undefined) {
      updates.tiktok_username = body.tiktok_username ? String(body.tiktok_username).trim() : null;
    }
    if (auth.isModerator && typeof body.seat_number === 'number') {
      updates.seat_number = body.seat_number;
    }

    const { data: updatedPlayer, error: updateError } = await adminClient
      .from('players')
      .update(updates)
      .eq('id', playerId)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, player: updatedPlayer });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
