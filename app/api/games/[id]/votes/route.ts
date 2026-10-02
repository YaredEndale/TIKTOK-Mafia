import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { authenticateRequest } from '@/lib/auth/auth-helper';
import {
  asGameConfiguration,
  asPlayer,
  GamePhase,
  resolveVotes,
  validateVotingSubmission,
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
    const { targetId } = body;
    const voterId = auth.isModerator && body.voterId ? body.voterId : auth.playerId;

    const { data: rawPlayers } = await adminClient
      .from('players')
      .select('*')
      .eq('game_id', game.id);

    const players = (rawPlayers || []).map(asPlayer);
    const voter = players.find((p) => p.id === voterId);

    // Check if voter already cast a vote for this round
    const { data: existingVote } = await adminClient
      .from('votes')
      .select('id')
      .eq('game_id', game.id)
      .eq('round', game.round)
      .eq('voter_id', voterId)
      .maybeSingle();

    const validation = validateVotingSubmission({
      currentPhase: game.phase as GamePhase,
      voter,
      targetId: targetId || null,
      players,
      hasAlreadyVoted: Boolean(existingVote),
    });

    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.errorMessage, code: validation.errorCode },
        { status: 400 }
      );
    }

    // Insert vote
    const { data: vote, error: voteError } = await adminClient
      .from('votes')
      .insert({
        game_id: game.id,
        round: game.round,
        voter_id: voter!.id,
        target_id: targetId || null,
      })
      .select()
      .single();

    if (voteError) {
      return NextResponse.json({ error: voteError.message }, { status: 500 });
    }

    // Emit event
    await adminClient.from('events').insert({
      game_id: game.id,
      type: 'VOTE_SUBMITTED',
      actor_id: voter!.id,
      metadata: { round: game.round },
      visibility: 'PUBLIC',
    });

    return NextResponse.json({ success: true, vote });
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

    const { data: game, error: gameError } = await adminClient
      .from('games')
      .select('*')
      .eq('id', params.id)
      .single();

    if (gameError || !game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    const { data: votes } = await adminClient
      .from('votes')
      .select('voter_id, target_id')
      .eq('game_id', game.id)
      .eq('round', game.round);

    const { data: rawPlayers } = await adminClient
      .from('players')
      .select('*')
      .eq('game_id', game.id);

    const players = (rawPlayers || []).map(asPlayer);
    const config = asGameConfiguration(game.configuration);

    const rawVotes = (votes || []).map((v) => ({
      voterId: v.voter_id,
      targetId: v.target_id,
    }));

    const result = resolveVotes(rawVotes, players, game.round, config.voting.tieRule);

    // If caller is public and voting is still ongoing, hide the individual candidate breakdown until REVEAL
    if (!auth.isModerator && game.phase === 'VOTING') {
      return NextResponse.json({
        totalVotesCast: result.totalVotesCast,
        isVotingOpen: true,
      });
    }

    return NextResponse.json({ success: true, tally: result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
