import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { authenticateRequest } from '@/lib/auth/auth-helper';
import {
  asGameConfiguration,
  asPlayer,
  GamePhase,
  validateNightActionSubmission,
} from '@/lib/game-engine';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const adminClient = createAdminClient();
    const gameId = params.id;
    const auth = await authenticateRequest(req, gameId);

    if (!auth.playerId && !auth.isModerator) {
      return NextResponse.json({ error: 'Unauthorized. Player session required.' }, { status: 401 });
    }

    const { data: game, error: gameError } = await adminClient
      .from('games')
      .select('*')
      .eq('id', gameId)
      .single();

    if (gameError || !game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    const body = await req.json();
    const { action, targetId } = body;

    // Acting player ID: from auth, or overridden by moderator
    const actingPlayerId = auth.isModerator && body.actorId ? body.actorId : auth.playerId;

    const { data: rawPlayers } = await adminClient
      .from('players')
      .select('*')
      .eq('game_id', game.id);

    const players = (rawPlayers || []).map(asPlayer);
    const actor = players.find((p) => p.id === actingPlayerId);
    const config = asGameConfiguration(game.configuration);

    // Validate submission using Game Engine
    const validation = validateNightActionSubmission({
      currentPhase: game.phase as GamePhase,
      currentRound: game.round,
      actor,
      targetId: targetId || null,
      action,
      players,
      doctorSelfProtectLastUsedRound: config.doctorSelfProtectLastUsedRound,
    });


    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.errorMessage, code: validation.errorCode },
        { status: 400 }
      );
    }

    // Upsert night action for this actor, round, and action
    const { data: recordedAction, error: actionError } = await adminClient
      .from('night_actions')
      .upsert(
        {
          game_id: game.id,
          round: game.round,
          actor_id: actor!.id,
          role: actor!.role!,
          target_id: targetId || null,
          action,
        },
        { onConflict: 'game_id,round,actor_id,action' }
      )
      .select()
      .single();

    if (actionError) {
      return NextResponse.json({ error: actionError.message }, { status: 500 });
    }

    // Emit event with appropriate visibility
    let eventType: 'MAFIA_ACTION_SUBMITTED' | 'DOCTOR_ACTION_SUBMITTED' | 'DETECTIVE_ACTION_SUBMITTED' = 'MAFIA_ACTION_SUBMITTED';
    let visibility: 'TEAM_MAFIA' | 'MODERATOR_ONLY' | 'PLAYER_ONLY' = 'MODERATOR_ONLY';

    if (actor!.role === 'MAFIA') {
      eventType = 'MAFIA_ACTION_SUBMITTED';
      visibility = 'TEAM_MAFIA';
    } else if (actor!.role === 'DOCTOR') {
      eventType = 'DOCTOR_ACTION_SUBMITTED';
      visibility = 'MODERATOR_ONLY';
    } else if (actor!.role === 'DETECTIVE') {
      eventType = 'DETECTIVE_ACTION_SUBMITTED';
      visibility = 'MODERATOR_ONLY';
    }

    await adminClient.from('events').insert({
      game_id: game.id,
      type: eventType,
      actor_id: actor!.id,
      target_id: targetId || null,
      visibility,
    });

    return NextResponse.json({ success: true, action: recordedAction });
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

    if (!auth.isModerator) {
      return NextResponse.json({ error: 'Unauthorized. Moderator access required.' }, { status: 403 });
    }

    const { data: actions, error } = await adminClient
      .from('night_actions')
      .select('*')
      .eq('game_id', params.id)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ actions });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
