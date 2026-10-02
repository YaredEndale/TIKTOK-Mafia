import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { authenticateRequest } from '@/lib/auth/auth-helper';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const adminClient = createAdminClient();
    const gameId = params.id;
    const auth = await authenticateRequest(req, gameId);

    const query = adminClient
      .from('events')
      .select('*')
      .eq('game_id', gameId)
      .order('timestamp', { ascending: true });

    // 1. Moderator sees everything
    if (auth.isModerator) {
      const { data: events, error } = await query;
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ events: events || [] });
    }

    // 2. Player sees public + their role-appropriate private events
    if (auth.playerId) {
      const { data: player } = await adminClient
        .from('players')
        .select('role')
        .eq('id', auth.playerId)
        .single();

      const allowedVisibilities = ['PUBLIC'];
      if (player?.role === 'MAFIA') {
        allowedVisibilities.push('TEAM_MAFIA');
      }

      const { data: events, error } = await query.in('visibility', allowedVisibilities);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });

      // Filter PLAYER_ONLY to only actions where this player was the actor
      return NextResponse.json({ events: events || [] });
    }

    // 3. Public / Spectator / Overlay: strictly PUBLIC events
    const { data: events, error } = await query.eq('visibility', 'PUBLIC');
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ events: events || [] });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
