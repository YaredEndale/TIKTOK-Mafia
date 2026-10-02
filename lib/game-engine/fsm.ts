/**
 * TikTok LIVE Mafia — Finite State Machine (FSM)
 * Validates phase transitions, manages round cycles, and calculates server-authoritative timers.
 */

import { GameConfiguration, GamePhase, GameWinner } from './types';
import { GAME_DEFAULTS } from './constants';

export const VALID_TRANSITIONS: Record<GamePhase, readonly GamePhase[]> = {
  LOBBY: ['PLAYER_SELECTION', 'GAME_OVER'],
  PLAYER_SELECTION: ['ROLE_ASSIGNMENT', 'LOBBY', 'GAME_OVER'],
  ROLE_ASSIGNMENT: ['NIGHT', 'LOBBY', 'GAME_OVER'],
  NIGHT: ['DAY', 'GAME_OVER'],
  DAY: ['DISCUSSION', 'VOTING', 'NIGHT', 'GAME_OVER'],
  DISCUSSION: ['VOTING', 'DAY', 'GAME_OVER'],
  VOTING: ['REVEAL', 'DISCUSSION', 'GAME_OVER'],
  REVEAL: ['ELIMINATION', 'WIN_CHECK', 'GAME_OVER'],
  ELIMINATION: ['WIN_CHECK', 'GAME_OVER'],
  WIN_CHECK: ['NIGHT', 'GAME_OVER'],
  GAME_OVER: ['LOBBY'], // Reset back to lobby if reused
} as const;

export interface TransitionContext {
  winner?: GameWinner;
  isTie?: boolean;
  round: number;
}

/**
 * Validates whether a requested phase transition is legal.
 */
export function canTransition(currentPhase: GamePhase, targetPhase: GamePhase, isModeratorOverride = false): boolean {
  if (isModeratorOverride) {
    // Moderator can override to any valid GamePhase except transitioning to the identical phase
    return currentPhase !== targetPhase;
  }
  const allowed = VALID_TRANSITIONS[currentPhase];
  return allowed ? allowed.includes(targetPhase) : false;
}

/**
 * Computes the natural next phase in the game cycle based on current state.
 */
export function getNextPhase(currentPhase: GamePhase, context: TransitionContext): {
  nextPhase: GamePhase;
  nextRound: number;
} {
  switch (currentPhase) {
    case 'LOBBY':
      return { nextPhase: 'PLAYER_SELECTION', nextRound: context.round };

    case 'PLAYER_SELECTION':
      return { nextPhase: 'ROLE_ASSIGNMENT', nextRound: context.round };

    case 'ROLE_ASSIGNMENT':
      return { nextPhase: 'NIGHT', nextRound: 1 }; // First night begins at round 1

    case 'NIGHT':
      return { nextPhase: 'DAY', nextRound: context.round };

    case 'DAY':
      return { nextPhase: 'DISCUSSION', nextRound: context.round };

    case 'DISCUSSION':
      return { nextPhase: 'VOTING', nextRound: context.round };

    case 'VOTING':
      return { nextPhase: 'REVEAL', nextRound: context.round };

    case 'REVEAL':
      return { nextPhase: 'ELIMINATION', nextRound: context.round };

    case 'ELIMINATION':
      return { nextPhase: 'WIN_CHECK', nextRound: context.round };

    case 'WIN_CHECK':
      if (context.winner) {
        return { nextPhase: 'GAME_OVER', nextRound: context.round };
      }
      // If no winner, cycle to the next night with incremented round
      return { nextPhase: 'NIGHT', nextRound: context.round + 1 };

    case 'GAME_OVER':
      return { nextPhase: 'LOBBY', nextRound: 0 };

    default:
      throw new Error(`Unknown current phase: ${currentPhase}`);
  }
}

/**
 * Calculates server-authoritative timestamps for timed phases.
 * Returns ISO strings for phase_started_at and phase_ends_at.
 */
export function calculatePhaseTimers(
  phase: GamePhase,
  config: GameConfiguration = GAME_DEFAULTS,
  customDurationSeconds?: number
): { phaseStartedAt: string; phaseEndsAt: string | null; durationSeconds: number | null } {
  const now = new Date();
  const phaseStartedAt = now.toISOString();

  let durationSeconds: number | null = null;

  if (typeof customDurationSeconds === 'number' && customDurationSeconds > 0) {
    durationSeconds = customDurationSeconds;
  } else {
    switch (phase) {
      case 'NIGHT':
        durationSeconds = config.timers.night ?? GAME_DEFAULTS.timers.night;
        break;
      case 'DISCUSSION':
        durationSeconds = config.timers.discussion ?? GAME_DEFAULTS.timers.discussion;
        break;
      case 'VOTING':
        durationSeconds = config.timers.voting ?? GAME_DEFAULTS.timers.voting;
        break;
      default:
        durationSeconds = null;
    }
  }

  if (durationSeconds === null) {
    return { phaseStartedAt, phaseEndsAt: null, durationSeconds: null };
  }

  const endsAtDate = new Date(now.getTime() + durationSeconds * 1000);
  return {
    phaseStartedAt,
    phaseEndsAt: endsAtDate.toISOString(),
    durationSeconds,
  };
}

/**
 * Extends an ongoing phase timer by adding seconds to phase_ends_at.
 */
export function extendPhaseTimer(currentPhaseEndsAt: string | null, additionalSeconds: number): string {
  const currentEnd = currentPhaseEndsAt ? new Date(currentPhaseEndsAt).getTime() : Date.now();
  const baseTime = Math.max(currentEnd, Date.now());
  const newEnd = new Date(baseTime + additionalSeconds * 1000);
  return newEnd.toISOString();
}
