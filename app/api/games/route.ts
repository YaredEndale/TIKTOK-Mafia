import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { GAME_DEFAULTS } from '@/lib/game-engine';
import { authenticateRequest } from '@/lib/auth/auth-helper';

function generateGameCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Avoid ambiguous chars (I, 1, O, 0)
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    // Allow game creation in dev or if authenticated moderator
    const adminClient = createAdminClient();

    let body: Record<string, unknown> = {};
    try {
      body = await req.json();
    } catch {
      // Body is optional
    }

    const customConfig = body.configuration || {};
    const mergedConfig = {
      ...GAME_DEFAULTS,
      ...(typeof customConfig === 'object' && customConfig !== null ? customConfig : {}),
    };

    // Generate unique game code
    let code = generateGameCode();
    let isUnique = false;
    let attempts = 0;

    while (!isUnique && attempts < 10) {
      const { data: existing } = await adminClient
        .from('games')
        .select('id')
        .eq('code', code)
        .maybeSingle();

      if (!existing) {
        isUnique = true;
      } else {
        code = generateGameCode();
        attempts++;
      }
    }

    const { data: game, error } = await adminClient
      .from('games')
      .insert({
        code,
        status: 'LOBBY',
        phase: 'LOBBY',
        round: 0,
        configuration: mergedConfig,
        moderator_id: auth.moderatorId,
      })
      .select()
      .single();

    if (error || !game) {
      return NextResponse.json({ error: error?.message || 'Failed to create game' }, { status: 500 });
    }

    // Emit GAME_CREATED event
    await adminClient.from('events').insert({
      game_id: game.id,
      type: 'GAME_CREATED',
      metadata: { code: game.code, configuration: game.configuration },
      visibility: 'PUBLIC',
    });

    return NextResponse.json({ success: true, game });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
