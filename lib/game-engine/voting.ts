/**
 * TikTok LIVE Mafia — Vote Counting & Tie-Breaking Engine
 * Aggregates votes, enforces self-vote prohibition, and applies the NO_ELIMINATION tie rule.
 */

import { Player } from './types';
import { GAME_DEFAULTS } from './constants';

export interface RawVote {
  voterId: string;
  targetId: string | null;
}

export interface CandidateTally {
  candidateId: string;
  candidateName: string;
  voteCount: number;
  voterIds: string[];
}

export interface VoteResolutionResult {
  round: number;
  totalVotesCast: number;
  tallies: CandidateTally[];
  maxVotes: number;
  leadingCandidateIds: string[];
  isTie: boolean;
  eliminatedPlayerId: string | null;
  eliminatedPlayerName: string | null;
  announcement: string;
}

export interface VoteValidationInput {
  voterId: string;
  targetId: string | null;
  players: Player[];
  allowSelfVote?: boolean;
}

/**
 * Validates a single vote submission.
 */
export function validateVote(input: VoteValidationInput): { valid: boolean; error?: string } {
  const { voterId, targetId, players, allowSelfVote = GAME_DEFAULTS.voting.allowSelfVote } = input;

  const playerMap = new Map<string, Player>();
  players.forEach((p) => playerMap.set(p.id, p));

  const voter = playerMap.get(voterId);
  if (!voter) {
    return { valid: false, error: 'Voter is not registered in this game.' };
  }

  if (voter.status !== 'ALIVE') {
    return { valid: false, error: 'Eliminated players cannot vote.' };
  }

  // If voting for a candidate (not abstaining)
  if (targetId) {
    if (!allowSelfVote && voterId === targetId) {
      return { valid: false, error: 'Self-voting is prohibited.' };
    }

    const target = playerMap.get(targetId);
    if (!target) {
      return { valid: false, error: 'Voted target is not in this game.' };
    }

    if (target.status !== 'ALIVE') {
      return { valid: false, error: 'Cannot vote for an eliminated player.' };
    }
  }

  return { valid: true };
}

/**
 * Counts and resolves all votes for a round.
 */
export function resolveVotes(
  votes: RawVote[],
  players: Player[],
  round: number,
  tieRule: 'NO_ELIMINATION' | 'REVOTE' | 'RANDOM' = GAME_DEFAULTS.voting.tieRule
): VoteResolutionResult {
  const playerMap = new Map<string, Player>();
  players.forEach((p) => playerMap.set(p.id, p));

  // Alive players map for quick lookup
  const alivePlayers = players.filter((p) => p.status === 'ALIVE');

  // Track latest vote per voter (idempotent / deduplication)
  const dedupedVotes = new Map<string, string | null>();
  votes.forEach((v) => {
    // Only count if voter is alive
    const voter = playerMap.get(v.voterId);
    if (voter && voter.status === 'ALIVE') {
      dedupedVotes.set(v.voterId, v.targetId);
    }
  });

  // Initialize tallies for all alive players
  const tallyMap = new Map<string, { count: number; voterIds: string[] }>();
  alivePlayers.forEach((p) => {
    tallyMap.set(p.id, { count: 0, voterIds: [] });
  });

  let totalVotesCast = 0;

  dedupedVotes.forEach((targetId, voterId) => {
    if (targetId && tallyMap.has(targetId)) {
      // Validate self-vote prohibition
      if (voterId !== targetId) {
        const entry = tallyMap.get(targetId)!;
        entry.count += 1;
        entry.voterIds.push(voterId);
        totalVotesCast += 1;
      }
    }
  });

  // Convert to sorted array
  const tallies: CandidateTally[] = alivePlayers
    .map((p) => {
      const entry = tallyMap.get(p.id)!;
      return {
        candidateId: p.id,
        candidateName: p.display_name,
        voteCount: entry.count,
        voterIds: entry.voterIds,
      };
    })
    .sort((a, b) => b.voteCount - a.voteCount);

  const maxVotes = tallies.length > 0 ? tallies[0].voteCount : 0;

  // Identify candidates with highest votes (must have at least 1 vote)
  const leadingCandidateIds =
    maxVotes > 0
      ? tallies.filter((t) => t.voteCount === maxVotes).map((t) => t.candidateId)
      : [];

  const isTie = leadingCandidateIds.length > 1;

  let eliminatedPlayerId: string | null = null;
  let eliminatedPlayerName: string | null = null;
  let announcement = '';

  if (maxVotes === 0) {
    announcement = 'NO ELIMINATION — NO VOTES CAST';
  } else if (isTie) {
    if (tieRule === 'NO_ELIMINATION') {
      announcement = 'NO ELIMINATION — VOTE WAS TIED';
      eliminatedPlayerId = null;
    } else {
      // Future tie rule fallback
      announcement = 'VOTE TIED';
    }
  } else {
    // Exactly 1 winner
    eliminatedPlayerId = leadingCandidateIds[0];
    const targetPlayer = playerMap.get(eliminatedPlayerId);
    eliminatedPlayerName = targetPlayer ? targetPlayer.display_name : 'Unknown Player';
    announcement = `${eliminatedPlayerName} was voted out!`;
  }

  return {
    round,
    totalVotesCast,
    tallies,
    maxVotes,
    leadingCandidateIds,
    isTie,
    eliminatedPlayerId,
    eliminatedPlayerName,
    announcement,
  };
}
