import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { authenticateRequest } from '@/lib/auth/auth-helper';
import {
  asGameConfiguration,
  asPlayer,
  calculatePhaseTimers,
  canTransition,
  checkWinCondition,
  getNextPhase,
  resolveNightActions,
  resolveVotes,
  GamePhase,
  GameConfiguration,
} from '@/lib/game-engine';
import { Json } from '@/types/database.types';

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

    const { data: game, error: gameError } = await adminClient
      .from('games')
      .select('*')
      .eq('id', gameId)
      .single();

    if (gameError || !game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    let body: { targetPhase?: GamePhase; isModeratorOverride?: boolean } = {};
    try {
      body = await req.json();
    } catch {
      // Optional body
    }

    const isOverride = Boolean(body.isModeratorOverride);

    // Fetch players
    const { data: rawPlayers } = await adminClient
      .from('players')
      .select('*')
      .eq('game_id', game.id);

    const playerList = (rawPlayers || []).map(asPlayer);

    // Determine next phase and next round
    let nextPhase: GamePhase;
    let nextRound = game.round;

    if (body.targetPhase) {
      if (!canTransition(game.phase as GamePhase, body.targetPhase, isOverride)) {
        return NextResponse.json(
          { error: `Cannot transition from ${game.phase} to ${body.targetPhase}` },
          { status: 400 }
        );
      }
      nextPhase = body.targetPhase;
    } else {
      const natural = getNextPhase(game.phase as GamePhase, {
        round: game.round,
        winner: game.winner as 'MAFIA' | 'VILLAGE' | null,
      });
      nextPhase = natural.nextPhase;
      nextRound = natural.nextRound;
    }

    // -------------------------------------------------------------
    // PHASE SPECIFIC RESOLUTIONS BEFORE TRANSITION
    // -------------------------------------------------------------

    const gameConfig: GameConfiguration = asGameConfiguration(game.configuration);
    let resolutionMetadata: Record<string, unknown> = {};

    // 1. NIGHT RESOLUTION (When leaving NIGHT)
    if (game.phase === 'NIGHT') {
      const { data: actions } = await adminClient
        .from('night_actions')
        .select('*')
        .eq('game_id', game.id)
        .eq('round', game.round);

      const mafiaAction = (actions || []).find((a) => a.action === 'KILL');
      const doctorAction = (actions || []).find((a) => a.action === 'PROTECT');
      const detectiveAction = (actions || []).find((a) => a.action === 'INVESTIGATE');

      const nightRes = resolveNightActions({
        mafiaTargetId: mafiaAction?.target_id || null,
        doctorTargetId: doctorAction?.target_id || null,
        detectiveTargetId: detectiveAction?.target_id || null,
        currentRound: game.round,
        doctorSelfProtectLastUsedRound: gameConfig.doctorSelfProtectLastUsedRound,
        players: playerList.map((p) => ({
          id: p.id,
          display_name: p.display_name,
          role: p.role,
          status: p.status,
        })),
      });

      // If Doctor used self-protect, record last used round
      if (nightRes.doctorSelfProtectUsedThisRound) {
        gameConfig.doctorSelfProtectLastUsedRound = game.round;
      }

      // If Detective investigated, persist result
      if (detectiveAction && nightRes.detectiveResult) {
        await adminClient
          .from('night_actions')
          .update({ result: { isMafia: nightRes.detectiveResult.isMafia } })
          .eq('id', detectiveAction.id);
      }

      // If a player was eliminated by Mafia kill
      if (nightRes.eliminatedPlayerId) {
        await adminClient
          .from('players')
          .update({
            status: 'ELIMINATED',
            eliminated_at: new Date().toISOString(),
            eliminated_reason: 'MAFIA_KILL',
          })
          .eq('id', nightRes.eliminatedPlayerId);

        // Update local list for immediate win check
        const eliminatedP = playerList.find((p) => p.id === nightRes.eliminatedPlayerId);
        if (eliminatedP) eliminatedP.status = 'ELIMINATED';
      }

      // Insert generated events
      if (nightRes.events.length > 0) {
        await adminClient.from('events').insert(
          nightRes.events.map((e) => ({
            game_id: game.id,
            type: e.type,
            actor_id: e.actorId || null,
            target_id: e.targetId || null,
            metadata: (e.metadata || {}) as unknown as Json,
            visibility: e.visibility,
          }))
        );
      }

      resolutionMetadata = { nightResolution: nightRes };
    }

    // 2. VOTING RESOLUTION (When leaving VOTING)
    if (game.phase === 'VOTING') {
      const { data: votes } = await adminClient
        .from('votes')
        .select('voter_id, target_id')
        .eq('game_id', game.id)
        .eq('round', game.round);

      const rawVotes = (votes || []).map((v) => ({ voterId: v.voter_id, targetId: v.target_id }));
      const voteRes = resolveVotes(rawVotes, playerList, game.round, gameConfig.voting.tieRule);

      await adminClient.from('events').insert({
        game_id: game.id,
        type: 'VOTING_CLOSED',
        metadata: {
          round: game.round,
          tallies: voteRes.tallies,
          eliminatedPlayerId: voteRes.eliminatedPlayerId,
          isTie: voteRes.isTie,
          announcement: voteRes.announcement,
        } as unknown as Json,
        visibility: 'PUBLIC',
      });

      resolutionMetadata = { voteResolution: voteRes };
    }

    // 3. ELIMINATION RESOLUTION (When leaving REVEAL / entering ELIMINATION)
    if (nextPhase === 'ELIMINATION') {
      const { data: votes } = await adminClient
        .from('votes')
        .select('voter_id, target_id')
        .eq('game_id', game.id)
        .eq('round', game.round);

      const rawVotes = (votes || []).map((v) => ({ voterId: v.voter_id, targetId: v.target_id }));
      const voteRes = resolveVotes(rawVotes, playerList, game.round, gameConfig.voting.tieRule);

      if (voteRes.eliminatedPlayerId) {
        const victim = playerList.find((p) => p.id === voteRes.eliminatedPlayerId);
        await adminClient
          .from('players')
          .update({
            status: 'ELIMINATED',
            eliminated_at: new Date().toISOString(),
            eliminated_reason: 'VOTE_EXECUTION',
          })
          .eq('id', voteRes.eliminatedPlayerId);

        if (victim) victim.status = 'ELIMINATED';

        await adminClient.from('events').insert([
          {
            game_id: game.id,
            type: 'PLAYER_ELIMINATED',
            actor_id: voteRes.eliminatedPlayerId,
            metadata: { round: game.round, reason: 'VOTE_EXECUTION' },
            visibility: 'PUBLIC',
          },
          {
            game_id: game.id,
            type: 'ROLE_REVEALED',
            actor_id: voteRes.eliminatedPlayerId,
            metadata: { role: victim?.role },
            visibility: 'PUBLIC',
          },
        ]);
      }
    }

    // Check Win Condition
    const winCheck = checkWinCondition(
      playerList.map((p) => ({ id: p.id, role: p.role, status: p.status }))
    );

    let finalPhase = nextPhase;
    let winner = game.winner;

    if (winCheck.isGameOver) {
      finalPhase = 'GAME_OVER';
      winner = winCheck.winner;

      await adminClient.from('events').insert({
        game_id: game.id,
        type: 'WIN_CONDITION_REACHED',
        metadata: { winner, reason: winCheck.reason },
        visibility: 'PUBLIC',
      });
    }

    // Compute timers for the new phase
    const timers = calculatePhaseTimers(finalPhase, gameConfig);

    // Update Game Record in DB
    const { data: updatedGame, error: updateError } = await adminClient
      .from('games')
      .update({
        phase: finalPhase,
        round: nextRound,
        winner,
        status: finalPhase === 'GAME_OVER' ? 'COMPLETED' : 'IN_PROGRESS',
        phase_started_at: timers.phaseStartedAt,
        phase_ends_at: timers.phaseEndsAt,
        configuration: gameConfig as unknown as Json,
        ended_at: finalPhase === 'GAME_OVER' ? new Date().toISOString() : null,
      })
      .eq('id', game.id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Log phase transition event
    await adminClient.from('events').insert({
      game_id: game.id,
      type: `${finalPhase}_STARTED`,
      metadata: {
        fromPhase: game.phase,
        toPhase: finalPhase,
        round: nextRound,
        durationSeconds: timers.durationSeconds,
        isOverride,
        ...resolutionMetadata,
      } as unknown as Json,
      visibility: 'PUBLIC',
    });

    return NextResponse.json({
      success: true,
      game: updatedGame,
      winCondition: winCheck,
      resolutionMetadata,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
