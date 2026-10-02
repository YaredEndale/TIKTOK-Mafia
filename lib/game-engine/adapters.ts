/**
 * TikTok LIVE Mafia — Domain Type Adapters
 * Bridges Supabase database row types and Game Engine domain models.
 */

import { Tables } from '@/types/database.types';
import {
  Game,
  GameConfiguration,
  GamePhase,
  GameStatus,
  GameWinner,
  Player,
  PlayerRole,
  PlayerStatus,
  EliminationReason,
} from './types';
import { GAME_DEFAULTS } from './constants';

export function asGameConfiguration(configJson: unknown): GameConfiguration {
  if (!configJson || typeof configJson !== 'object') {
    return GAME_DEFAULTS;
  }
  const raw = configJson as Partial<GameConfiguration>;
  return {
    timers: {
      night: raw.timers?.night ?? GAME_DEFAULTS.timers.night,
      discussion: raw.timers?.discussion ?? GAME_DEFAULTS.timers.discussion,
      voting: raw.timers?.voting ?? GAME_DEFAULTS.timers.voting,
    },
    players: {
      min: raw.players?.min ?? GAME_DEFAULTS.players.min,
      max: raw.players?.max ?? GAME_DEFAULTS.players.max,
    },
    voting: {
      allowSelfVote: raw.voting?.allowSelfVote ?? GAME_DEFAULTS.voting.allowSelfVote,
      tieRule: raw.voting?.tieRule ?? GAME_DEFAULTS.voting.tieRule,
      lockOnSubmit: raw.voting?.lockOnSubmit ?? GAME_DEFAULTS.voting.lockOnSubmit,
    },
    roles: {
      revealOnElimination: raw.roles?.revealOnElimination ?? GAME_DEFAULTS.roles.revealOnElimination,
      mafiaCanSeeTeam: raw.roles?.mafiaCanSeeTeam ?? GAME_DEFAULTS.roles.mafiaCanSeeTeam,
      doctorSelfProtect: raw.roles?.doctorSelfProtect ?? GAME_DEFAULTS.roles.doctorSelfProtect,
      doctorSelfProtectCooldown:
        raw.roles?.doctorSelfProtectCooldown ?? GAME_DEFAULTS.roles.doctorSelfProtectCooldown,
      mafiaCanTargetMafia: raw.roles?.mafiaCanTargetMafia ?? GAME_DEFAULTS.roles.mafiaCanTargetMafia,
    },
    doctorSelfProtectLastUsedRound: raw.doctorSelfProtectLastUsedRound,
  };
}

export function asPlayer(row: Tables<'players'>): Player {
  return {
    id: row.id,
    game_id: row.game_id,
    display_name: row.display_name,
    tiktok_username: row.tiktok_username,
    avatar_url: row.avatar_url,
    role: row.role as PlayerRole | null,
    status: row.status as PlayerStatus,
    seat_number: row.seat_number,
    eliminated_at: row.eliminated_at,
    eliminated_reason: row.eliminated_reason as EliminationReason | null,
    joined_at: row.joined_at,
  };
}

export function asGame(row: Tables<'games'>): Game {
  return {
    id: row.id,
    code: row.code,
    status: row.status as GameStatus,
    phase: row.phase as GamePhase,
    round: row.round,
    phase_started_at: row.phase_started_at,
    phase_ends_at: row.phase_ends_at,
    configuration: asGameConfiguration(row.configuration),
    winner: row.winner as GameWinner,
    created_at: row.created_at,
    started_at: row.started_at,
    ended_at: row.ended_at,
    moderator_id: row.moderator_id,
  };
}
