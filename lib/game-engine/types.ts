/**
 * TikTok LIVE Mafia — Core TypeScript Types
 * Unified type definitions for database entities, game state, events, and realtime payloads.
 */
import { ClipCategory } from './constants';

export type GameStatus = 'LOBBY' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export type GamePhase =
  | 'LOBBY'
  | 'PLAYER_SELECTION'
  | 'ROLE_ASSIGNMENT'
  | 'NIGHT'
  | 'DAY'
  | 'DISCUSSION'
  | 'VOTING'
  | 'REVEAL'
  | 'ELIMINATION'
  | 'WIN_CHECK'
  | 'GAME_OVER';

export type PlayerRole = 'MAFIA' | 'DETECTIVE' | 'DOCTOR' | 'CITIZEN';

export type PlayerStatus = 'ALIVE' | 'ELIMINATED' | 'DISCONNECTED';

export type GameWinner = 'MAFIA' | 'VILLAGE' | null;

export type EliminationReason =
  | 'MAFIA_KILL'
  | 'VOTE_EXECUTION'
  | 'MODERATOR_REMOVAL'
  | 'DISCONNECT';

export interface GameConfiguration {
  timers: {
    night: number;
    discussion: number;
    voting: number;
  };
  players: {
    min: number;
    max: number;
  };
  voting: {
    allowSelfVote: boolean;
    tieRule: 'NO_ELIMINATION' | 'REVOTE' | 'RANDOM';
    lockOnSubmit: boolean;
  };
  roles: {
    revealOnElimination: boolean;
    mafiaCanSeeTeam: boolean;
    doctorSelfProtect: boolean;
    doctorSelfProtectCooldown: number;
    mafiaCanTargetMafia: boolean;
  };
  doctorSelfProtectLastUsedRound?: number;
}

export interface Game {
  id: string;
  code: string;
  status: GameStatus;
  phase: GamePhase;
  round: number;
  phase_started_at: string | null;
  phase_ends_at: string | null;
  configuration: GameConfiguration;
  winner: GameWinner;
  created_at: string;
  started_at: string | null;
  ended_at: string | null;
  moderator_id: string | null;
}

export interface Player {
  id: string;
  game_id: string;
  display_name: string;
  tiktok_username: string | null;
  avatar_url: string | null;
  role: PlayerRole | null;
  status: PlayerStatus;
  seat_number: number | null;
  eliminated_at: string | null;
  eliminated_reason: EliminationReason | null;
  joined_at: string;
}

export interface PublicPlayer {
  id: string;
  display_name: string;
  tiktok_username: string | null;
  avatar_url: string | null;
  status: PlayerStatus;
  seat_number: number | null;
  role: PlayerRole | null; // null if alive or if revealOnElimination is false
  eliminated_reason: EliminationReason | null;
}

export interface PlayerSession {
  id: string;
  player_id: string;
  token_hash: string;
  expires_at: string;
  last_seen: string;
  created_at: string;
}

export interface Vote {
  id: string;
  game_id: string;
  round: number;
  voter_id: string;
  target_id: string | null; // null represents abstain if ever allowed, or explicit target
  created_at: string;
}

export type NightActionType = 'KILL' | 'INVESTIGATE' | 'PROTECT';

export interface NightActionResult {
  isMafia?: boolean;
  success?: boolean;
}

export interface NightAction {
  id: string;
  game_id: string;
  round: number;
  actor_id: string;
  role: PlayerRole;
  target_id: string | null;
  action: NightActionType;
  result: NightActionResult | null;
  created_at: string;
}

export type EventType =
  | 'GAME_CREATED'
  | 'PLAYER_JOINED'
  | 'PLAYER_REMOVED'
  | 'ROLES_ASSIGNED'
  | 'NIGHT_STARTED'
  | 'MAFIA_ACTION_SUBMITTED'
  | 'DETECTIVE_ACTION_SUBMITTED'
  | 'DOCTOR_ACTION_SUBMITTED'
  | 'NIGHT_RESOLVED'
  | 'DAY_STARTED'
  | 'DISCUSSION_STARTED'
  | 'VOTING_STARTED'
  | 'VOTE_SUBMITTED'
  | 'VOTING_CLOSED'
  | 'PLAYER_ELIMINATED'
  | 'ROLE_REVEALED'
  | 'WIN_CONDITION_REACHED'
  | 'GAME_ENDED'
  | 'CLIP_MARKED'
  | 'MODERATOR_OVERRIDE';

export type EventVisibility =
  | 'PUBLIC'
  | 'MODERATOR_ONLY'
  | 'TEAM_MAFIA'
  | 'PLAYER_ONLY';

export interface GameEvent {
  id: string;
  game_id: string;
  type: EventType;
  actor_id: string | null;
  target_id: string | null;
  metadata: Record<string, unknown>;
  visibility: EventVisibility;
  timestamp: string;
}

export interface ClipMarker {
  id: string;
  game_id: string;
  timestamp: string;
  category: ClipCategory;
  description: string;
  created_by: string | null;
  created_at: string;
}

export interface Moderator {
  id: string;
  user_id: string;
  role: 'MODERATOR' | 'PRODUCER' | 'ADMIN';
  permissions: string[];
  created_at: string;
}

/**
 * Stripped public state sent to spectator overlay and public channels.
 * Rule 2: NEVER exposes roles of alive players or private actions.
 */
export interface PublicGameState {
  gameId: string;
  code: string;
  status: GameStatus;
  phase: GamePhase;
  round: number;
  phaseStartedAt: string | null;
  phaseEndsAt: string | null;
  winner: GameWinner;
  players: PublicPlayer[];
  announcements: string[];
}

/**
 * State sent to a player's private mobile interface.
 */
export interface PlayerPrivateState {
  gameId: string;
  playerId: string;
  displayName: string;
  role: PlayerRole | null;
  status: PlayerStatus;
  phase: GamePhase;
  round: number;
  phaseStartedAt: string | null;
  phaseEndsAt: string | null;
  alivePlayers: { id: string; display_name: string; seat_number: number | null }[];
  teammates?: { id: string; display_name: string }[]; // For Mafia
  investigationHistory?: { targetId: string; targetName: string; isMafia: boolean }[]; // For Detective
  canAct: boolean;
  hasActed: boolean;
  hasVoted: boolean;
  canDoctorSelfProtect?: boolean;
}
