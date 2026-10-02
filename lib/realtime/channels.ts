/**
 * TikTok LIVE Mafia — Realtime Channel Definitions
 * Channel naming standards and payload contracts for Supabase Realtime WebSockets.
 */

import { GamePhase, GameWinner, PlayerRole, PublicPlayer } from '../game-engine';

export const CHANNELS = {
  game: (gameId: string) => `game:${gameId}`,
  player: (sessionId: string) => `player:${sessionId}`,
  moderator: (gameId: string) => `moderator:${gameId}`,
  overlay: (gameId: string) => `overlay:${gameId}`,
} as const;

export const REALTIME_EVENTS = {
  // Public Events (game:*, overlay:*)
  PHASE_CHANGE: 'phase_change',
  TIMER_SYNC: 'timer_sync',
  PLAYER_JOINED: 'player_joined',
  PLAYER_LEFT: 'player_left',
  VOTING_OPENED: 'voting_opened',
  VOTE_COUNT_UPDATE: 'vote_count_update',
  VOTING_CLOSED: 'voting_closed',
  PLAYER_ELIMINATED: 'player_eliminated',
  ROLE_REVEALED: 'role_revealed',
  NIGHT_RESOLVED: 'night_resolved',
  GAME_OVER: 'game_over',
  CLIP_MARKED: 'clip_marked',

  // Private Player Events (player:*)
  ROLE_ASSIGNED: 'role_assigned',
  ACTION_CONFIRMED: 'action_confirmed',
  INVESTIGATION_RESULT: 'investigation_result',
  YOUR_ELIMINATION: 'your_elimination',

  // Moderator Events (moderator:*)
  NIGHT_ACTION_RECEIVED: 'night_action_received',
  MODERATOR_STATE_SYNC: 'moderator_state_sync',
} as const;

export type RealtimeEventType = (typeof REALTIME_EVENTS)[keyof typeof REALTIME_EVENTS];

// -------------------------------------------------------------
// Realtime Payload Types
// -------------------------------------------------------------

export interface PhaseChangePayload {
  phase: GamePhase;
  round: number;
  phaseStartedAt: string | null;
  phaseEndsAt: string | null;
  durationSeconds: number | null;
}

export interface TimerSyncPayload {
  phaseEndsAt: string | null;
  addedSeconds?: number;
}

export interface PlayerEliminatedPayload {
  playerId: string;
  displayName: string;
  reason: string;
  revealedRole: PlayerRole | null;
}

export interface VoteCountUpdatePayload {
  totalVotesCast: number;
  alivePlayersCount: number;
}

export interface PrivateRoleAssignedPayload {
  role: PlayerRole;
  teammates?: { id: string; display_name: string }[];
}

export interface PrivateInvestigationPayload {
  targetId: string;
  targetName: string;
  isMafia: boolean;
}

export interface OverlayStatePayload {
  gameId: string;
  code: string;
  phase: GamePhase;
  round: number;
  phaseStartedAt: string | null;
  phaseEndsAt: string | null;
  winner: GameWinner;
  players: PublicPlayer[];
  announcement?: string | null;
}
