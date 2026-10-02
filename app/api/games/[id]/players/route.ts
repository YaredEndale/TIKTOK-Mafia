import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { authenticateRequest, hashToken } from '@/lib/auth/auth-helper';
import { asGameConfiguration } from '@/lib/game-engine';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const adminClient = createAdminClient();
    const identifier = params.id;
    const isCode = identifier.length === 6 && !identifier.includes('-');

    // Fetch game
    const query = adminClient.from('games').select('*');
    const { data: game, error: gameError } = isCode
      ? await query.eq('code', identifier.toUpperCase()).single()
      : await query.eq('id', identifier).single();

    if (gameError || !game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    if (game.phase !== 'LOBBY' && game.phase !== 'PLAYER_SELECTION') {
      return NextResponse.json(
        { error: 'Cannot join. Game is already in progress or completed.' },
        { status: 400 }
      );
    }

    const body = await req.json();
    const displayName = (body.display_name || '').trim();
    const tiktokUsername = (body.tiktok_username || '').trim() || null;

    if (!displayName || displayName.length < 2) {
      return NextResponse.json(
        { error: 'Display name must be at least 2 characters.' },
        { status: 400 }
      );
    }

    // Check current player count
    const { count, error: countError } = await adminClient
      .from('players')
      .select('*', { count: 'exact', head: true })
      .eq('game_id', game.id);

    if (countError) {
      return NextResponse.json({ error: 'Failed to count players' }, { status: 500 });
    }

    const config = asGameConfiguration(game.configuration);
    const maxPlayers = config.players.max;
    if ((count || 0) >= maxPlayers) {
      return NextResponse.json(
        { error: `Game lobby is full (maximum ${maxPlayers} players).` },
        { status: 400 }
      );
    }

    // Insert Player
    const { data: player, error: playerError } = await adminClient
      .from('players')
      .insert({
        game_id: game.id,
        display_name: displayName,
        tiktok_username: tiktokUsername,
        seat_number: (count || 0) + 1,
        status: 'ALIVE',
      })
      .select()
      .single();

    if (playerError || !player) {
      return NextResponse.json({ error: playerError?.message || 'Failed to create player' }, { status: 500 });
    }

    // Generate Secure Session Token
    const rawToken = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '');
    const tokenHash = await hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours

    const { data: session, error: sessionError } = await adminClient
      .from('player_sessions')
      .insert({
        player_id: player.id,
        token_hash: tokenHash,
        expires_at: expiresAt,
      })
      .select()
      .single();

    if (sessionError) {
      return NextResponse.json({ error: 'Failed to create player session' }, { status: 500 });
    }

    // Emit PLAYER_JOINED event
    await adminClient.from('events').insert({
      game_id: game.id,
      type: 'PLAYER_JOINED',
      actor_id: player.id,
      metadata: { displayName: player.display_name, seatNumber: player.seat_number },
      visibility: 'PUBLIC',
    });

    return NextResponse.json({
      success: true,
      player,
      session: {
        id: session.id,
        token: rawToken,
        expiresAt,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const adminClient = createAdminClient();
    const auth = await authenticateRequest(req, params.id);

    // If moderator: return full table with roles
    if (auth.isModerator) {
      const { data: players, error } = await adminClient
        .from('players')
        .select('*')
        .eq('game_id', params.id)
        .order('seat_number', { ascending: true });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ players });
    }

    // If public/player: return public_players view (roles of living players are null)
    const { data: players, error } = await adminClient
      .from('public_players')
      .select('*')
      .eq('game_id', params.id)
      .order('seat_number', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ players });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
